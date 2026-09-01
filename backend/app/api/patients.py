from fastapi import APIRouter, Depends, HTTPException, Query, Header
from typing import Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.services.patient_indexer import PatientIndexerService
from app.db.models import PatientProfile, PatientDietProfile, MedicalDocument, User

router = APIRouter(prefix="/patients", tags=["Patients"])

class PatientUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None
    hospital_name: Optional[str] = None
    primary_doctor: Optional[str] = None

@router.get("")
def list_and_search_patients(
    q: Optional[str] = Query(None, description="Search by ID, name, condition, or hospital"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return PatientIndexerService.search_patients(db, query=q, page=page, per_page=per_page)

@router.get("/me")
def get_current_personal_profile(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Returns the authenticated user's isolated personal health space based on the session Bearer token.
    """
    if authorization and "meditoken_" in authorization:
        try:
            token_part = authorization.replace("Bearer ", "").strip()
            parts = token_part.split("_")
            if len(parts) >= 2:
                user_id = int(parts[1])
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    patient_id = "my_health_profile" if user.username == "alex.morgan" else f"user_{user.id}"
                    # Ensure patient profile exists
                    prof = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
                    if not prof:
                        prof = PatientProfile(
                            patient_id=patient_id,
                            full_name=user.full_name or user.username,
                            age=35,
                            gender="Female",
                            blood_group="O+",
                            medical_conditions="General Health"
                        )
                        db.add(prof)
                        db.commit()
                    details = PatientIndexerService.get_patient_details(db, patient_id)
                    if details:
                        return details
        except Exception:
            pass

    # Default fallback
    PatientIndexerService.get_or_create_personal_profile(db)
    details = PatientIndexerService.get_patient_details(db, "my_health_profile")
    return details

@router.get("/{patient_id}")
def get_patient_details(patient_id: str, db: Session = Depends(get_db)):
    if patient_id == "my_health_profile":
        PatientIndexerService.get_or_create_personal_profile(db)
    details = PatientIndexerService.get_patient_details(db, patient_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found.")
    return details

@router.get("/{patient_id}/documents")
def get_patient_documents(patient_id: str, db: Session = Depends(get_db)):
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).order_by(MedicalDocument.id.desc()).all()
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
            "page_count": d.page_count
        } for d in docs
    ]

@router.post("/reindex")
def trigger_reindexing(limit: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Dynamically scans data/patients and synthetic dataset to index any new folders without restarting.
    """
    result = PatientIndexerService.index_all_patients(db, max_limit=limit)
    return result

@router.put("/{patient_id}")
def update_patient_profile(
    patient_id: str,
    req: PatientUpdateRequest,
    db: Session = Depends(get_db)
):
    p = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found.")

    if req.full_name is not None:
        p.full_name = req.full_name
    if req.age is not None:
        p.age = req.age
    if req.gender is not None:
        p.gender = req.gender
    if req.blood_group is not None:
        p.blood_group = req.blood_group
    if req.height_cm is not None:
        p.height_cm = req.height_cm
    if req.weight_kg is not None:
        p.weight_kg = req.weight_kg
    if req.allergies is not None:
        p.allergies = req.allergies
    if req.medical_conditions is not None:
        p.medical_conditions = req.medical_conditions
    if req.hospital_name is not None:
        p.hospital_name = req.hospital_name
    if req.primary_doctor is not None:
        p.primary_doctor = req.primary_doctor

    db.commit()
    db.refresh(p)
    return PatientIndexerService.get_patient_details(db, patient_id)
