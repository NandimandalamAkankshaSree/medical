import os
import json
import shutil
import datetime
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.db.models import MedicalDocument, LabParameterValue, PatientProfile
from app.services.document_parser import DocumentParser
from app.services.rag_engine import RAGEngine
from app.services.patient_indexer import PatientIndexerService

router = APIRouter(prefix="/documents", tags=["Medical Documents"])

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    document_type: str = Form("Medical Report"),
    report_date: Optional[str] = Form(None),
    report_tag: Optional[str] = Form("Present Report"),
    doctor_name: Optional[str] = Form(None),
    hospital_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if patient_id == "my_health_profile":
        PatientIndexerService.get_or_create_personal_profile(db)

    patient = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")

    # Save file to upload directory
    ext = Path(file.filename).suffix
    safe_filename = f"{patient_id}_{int(datetime.datetime.utcnow().timestamp())}_{file.filename}"
    file_path = settings.UPLOAD_DIR / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Parse document
    parsed = DocumentParser.parse_medical_report(str(file_path))

    # Validate whether uploaded file is genuinely a medical report/document
    is_valid, validation_msg = DocumentParser.validate_medical_document(parsed, parsed.get("full_text", ""))
    if not is_valid:
        # Clean up invalid non-medical file from disk immediately
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Please send or upload a correct medical report. {validation_msg}"
        )

    # Validate Patient Identity / Account Profile Name Match
    report_patient_name = parsed.get("patient_name")
    is_name_match, name_reason = DocumentParser.is_patient_name_match(
        report_patient_name=report_patient_name,
        logged_in_patient_name=patient.full_name
    )

    is_name_mismatch = not is_name_match
    disclaimer_note = None
    if is_name_mismatch and report_patient_name:
        disclaimer_note = f"⚠️ Disclaimer: This medical report was issued for '{report_patient_name}' (differing from your logged-in account name '{patient.full_name}'). Note that these are not your personal reports."

    effective_date = report_date or parsed.get("report_date") or datetime.date.today().isoformat()
    effective_type = document_type or parsed.get("document_type") or "Medical Report"
    if report_tag and f"({report_tag})" not in effective_type:
        effective_type = f"{effective_type} ({report_tag})"

    base_quick = parsed.get("quick_summary") or f"Uploaded {effective_type} on {effective_date} with {len(parsed.get('lab_parameters', []))} extracted biomarkers."
    base_detailed = parsed.get("detailed_summary") or f"Medical report '{file.filename}' recorded on {effective_date}. Parameters extracted and analyzed."

    if is_name_mismatch and disclaimer_note:
        quick_summary = f"[⚠️ Note: Issued to {report_patient_name}] " + base_quick
        detailed_summary = f"{disclaimer_note}\n\n" + base_detailed
    else:
        quick_summary = base_quick
        detailed_summary = base_detailed

    doc = MedicalDocument(
        patient_id=patient_id,
        document_name=file.filename,
        document_type=effective_type,
        file_path=str(file_path),
        file_type=ext.replace(".", "") or "pdf",
        file_size=file_path.stat().st_size,
        page_count=parsed.get("page_count", 1),
        report_date=effective_date,
        hospital_name=hospital_name or parsed.get("hospital_name") or patient.hospital_name or "Diagnostics Lab",
        doctor_name=doctor_name or parsed.get("doctor_name") or patient.primary_doctor or "Attending Physician",
        ocr_status="COMPLETED",
        ocr_confidence=parsed.get("ocr_confidence", 0.98),
        quick_summary=quick_summary,
        detailed_summary=detailed_summary,
        findings=parsed.get("findings") or "Report parameters extracted and verified against clinical standard reference ranges.",
        doctor_observations=parsed.get("doctor_observations") or "Review report parameters with your healthcare provider.",
        recommendations=parsed.get("recommendations") or "Maintain routine health tracking and follow dietary and medication guidelines.",
        parsed_data_json=json.dumps(parsed),
        patient_name_extracted=report_patient_name or patient.full_name,
        is_name_mismatch=is_name_mismatch,
        disclaimer_note=disclaimer_note
    )
    db.add(doc)
    db.flush()

    # Save Lab Parameters
    for p in parsed.get("lab_parameters", []):
        lab_val = LabParameterValue(
            document_id=doc.id,
            patient_id=patient_id,
            parameter_name=p["parameter_name"],
            result_value=p["result_value"],
            numeric_value=p["numeric_value"],
            unit=p["unit"],
            reference_range=p["reference_range"],
            min_ref=p["min_ref"],
            max_ref=p["max_ref"],
            status=p["status"],
            interpretation=p["interpretation"],
            category=p["category"],
            test_date=effective_date,
            page_number=p["page_number"],
            section_name=p["section_name"]
        )
        db.add(lab_val)

    db.commit()
    db.refresh(doc)

    # Index in RAG engine immediately
    pages = parsed.get("pages", [{"page_number": 1, "text": f"{doc.document_name} ({doc.report_date})\n{doc.detailed_summary}\n" + ", ".join([f"{p['parameter_name']}: {p['result_value']} {p.get('unit','')}" for p in parsed.get("lab_parameters", [])])}])
    RAGEngine.index_document(patient_id, doc.id, doc.document_name, pages)

    return {
        "status": "success",
        "document_id": doc.id,
        "patient_id": doc.patient_id,
        "document_name": doc.document_name,
        "document_type": doc.document_type,
        "report_date": doc.report_date,
        "parameters_extracted": len(parsed.get("lab_parameters", [])),
        "quick_summary": doc.quick_summary,
        "is_name_mismatch": doc.is_name_mismatch,
        "patient_name_extracted": doc.patient_name_extracted,
        "disclaimer_note": doc.disclaimer_note
    }

@router.get("/patient/{patient_id}")
def list_patient_documents(patient_id: str, db: Session = Depends(get_db)):
    if patient_id == "my_health_profile":
        PatientIndexerService.get_or_create_personal_profile(db)
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).order_by(MedicalDocument.report_date.desc(), MedicalDocument.id.desc()).all()
    return [
        {
            "id": d.id,
            "document_name": d.document_name,
            "document_type": d.document_type,
            "file_type": d.file_type,
            "report_date": d.report_date,
            "hospital_name": d.hospital_name,
            "doctor_name": d.doctor_name,
            "ocr_status": d.ocr_status,
            "quick_summary": d.quick_summary,
            "page_count": d.page_count,
            "is_name_mismatch": getattr(d, "is_name_mismatch", False),
            "patient_name_extracted": getattr(d, "patient_name_extracted", None),
            "disclaimer_note": getattr(d, "disclaimer_note", None)
        } for d in docs
    ]

@router.get("/{document_id}")
def get_document_details(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    labs = db.query(LabParameterValue).filter(LabParameterValue.document_id == document_id).all()
    return {
        "id": doc.id,
        "patient_id": doc.patient_id,
        "document_name": doc.document_name,
        "document_type": doc.document_type,
        "file_type": doc.file_type,
        "report_date": doc.report_date,
        "hospital_name": doc.hospital_name,
        "doctor_name": doc.doctor_name,
        "ocr_status": doc.ocr_status,
        "quick_summary": doc.quick_summary,
        "detailed_summary": doc.detailed_summary,
        "findings": doc.findings,
        "doctor_observations": doc.doctor_observations,
        "recommendations": doc.recommendations,
        "page_count": doc.page_count,
        "is_name_mismatch": getattr(doc, "is_name_mismatch", False),
        "patient_name_extracted": getattr(doc, "patient_name_extracted", None),
        "disclaimer_note": getattr(doc, "disclaimer_note", None),
        "lab_parameters": [
            {
                "parameter_name": l.parameter_name,
                "result_value": l.result_value,
                "numeric_value": l.numeric_value,
                "unit": l.unit,
                "reference_range": l.reference_range,
                "status": l.status,
                "interpretation": l.interpretation,
                "category": l.category
            } for l in labs
        ]
    }

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    patient_id = doc.patient_id
    db.query(LabParameterValue).filter(LabParameterValue.document_id == document_id).delete()
    
    # Also delete physical file if stored locally in uploads
    try:
        if doc.file_path and os.path.exists(doc.file_path) and "uploads" in doc.file_path:
            os.remove(doc.file_path)
    except Exception as e:
        print(f"Notice on file cleanup: {e}")

    db.delete(doc)
    db.commit()

    return {"status": "success", "message": f"Document #{document_id} deleted successfully.", "patient_id": patient_id}

@router.delete("/patient/{patient_id}/all")
def delete_all_patient_documents(patient_id: str, db: Session = Depends(get_db)):
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).all()
    count = len(docs)
    for doc in docs:
        db.query(LabParameterValue).filter(LabParameterValue.document_id == doc.id).delete()
        try:
            if doc.file_path and os.path.exists(doc.file_path) and "uploads" in doc.file_path:
                os.remove(doc.file_path)
        except Exception:
            pass
        db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"All {count} documents deleted successfully for patient {patient_id}."}


@router.get("/{document_id}/download")
def download_document_file(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk.")

    return FileResponse(doc.file_path, filename=doc.document_name)
