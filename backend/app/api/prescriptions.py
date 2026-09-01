from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.db.models import PrescriptionRecord, PrescriptionMedicine
from app.services.prescription_service import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

class NormalizeRequest(BaseModel):
    raw_medicine_name: str
    ocr_confidence: Optional[float] = 0.90

@router.get("/patient/{patient_id}")
def get_patient_prescriptions(patient_id: str, db: Session = Depends(get_db)):
    rxs = db.query(PrescriptionRecord).filter(PrescriptionRecord.patient_id == patient_id).all()
    results = []
    for r in rxs:
        meds = db.query(PrescriptionMedicine).filter(PrescriptionMedicine.prescription_id == r.prescription_id).all()
        results.append({
            "prescription_id": r.prescription_id,
            "doctor_name": r.doctor_name,
            "hospital_name": r.hospital_name,
            "department": r.department,
            "prescription_date": r.prescription_date,
            "ocr_confidence": r.ocr_confidence,
            "is_low_confidence": r.ocr_confidence < 0.70,
            "handwriting_sample": r.handwriting_sample,
            "safety_note": r.clinical_safety_note,
            "medicines": [
                {
                    "medicine_name": m.medicine_name,
                    "normalized_name": m.normalized_name,
                    "generic_name": m.generic_name,
                    "rxnorm_cui": m.rxnorm_cui,
                    "strength": m.strength,
                    "dosage_form": m.dosage_form,
                    "dose": m.dose,
                    "frequency": m.frequency,
                    "duration": m.duration,
                    "route": m.route,
                    "timing_instructions": getattr(m, 'timing_instructions', getattr(m, 'instructions', 'Take after meals as directed')),
                    "explanation": m.explanation,
                    "confidence": m.confidence,
                    "match_confidence": m.match_confidence,
                    "safety_note": m.safety_note
                } for m in meds
            ]
        })
    return results

@router.get("/{prescription_id}")
def get_prescription_by_id(prescription_id: str, db: Session = Depends(get_db)):
    r = db.query(PrescriptionRecord).filter(PrescriptionRecord.prescription_id == prescription_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Prescription record not found.")

    meds = db.query(PrescriptionMedicine).filter(PrescriptionMedicine.prescription_id == r.prescription_id).all()
    return {
        "prescription_id": r.prescription_id,
        "doctor_name": r.doctor_name,
        "hospital_name": r.hospital_name,
        "department": r.department,
        "prescription_date": r.prescription_date,
        "ocr_confidence": r.ocr_confidence,
        "is_low_confidence": r.ocr_confidence < 0.70,
        "handwriting_sample": r.handwriting_sample,
        "safety_note": r.clinical_safety_note,
        "medicines": [
            {
                "medicine_name": m.medicine_name,
                "normalized_name": m.normalized_name,
                "generic_name": m.generic_name,
                "rxnorm_cui": m.rxnorm_cui,
                "strength": m.strength,
                "dosage_form": m.dosage_form,
                "dose": m.dose,
                "frequency": m.frequency,
                "duration": m.duration,
                "route": m.route,
                "timing_instructions": getattr(m, 'timing_instructions', getattr(m, 'instructions', 'Take after meals as directed')),
                "explanation": m.explanation,
                "confidence": m.confidence,
                "match_confidence": m.match_confidence,
                "safety_note": m.safety_note
            } for m in meds
        ]
    }

@router.post("/normalize")
def normalize_medicine_name(req: NormalizeRequest):
    return PrescriptionService.normalize_medicine_name(req.raw_medicine_name, req.ocr_confidence or 0.90)

@router.get("/medicine/explain")
def explain_medicine(name: str):
    return PrescriptionService.get_medicine_explanation(name)
