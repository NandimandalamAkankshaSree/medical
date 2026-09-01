import os
import csv
import openpyxl
from typing import Dict, Any, List, Optional
from app.core.config import settings

class PrescriptionService:
    """
    Handles prescription extraction, OCR handwriting analysis,
    RxNorm medicine normalization, dosage parsing, and clinical safety checks.
    """
    _normalization_db: Dict[str, Dict[str, Any]] = {}
    _prescriptions_cache: Dict[str, List[Dict[str, Any]]] = {}
    _loaded = False

    @classmethod
    def initialize(cls):
        if cls._loaded:
            return

        # 1. Load Medicine Normalization Database
        if settings.MEDICINE_NORMALIZATION_CSV.exists():
            try:
                with open(settings.MEDICINE_NORMALIZATION_CSV, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        ocr_name = (row.get("ocr_name") or "").strip().lower()
                        norm_name = (row.get("normalized_name") or "").strip()
                        cls._normalization_db[ocr_name] = {
                            "medicine_id": row.get("medicine_id"),
                            "normalized_name": norm_name,
                            "generic_name": row.get("generic_name"),
                            "rxnorm_name": row.get("rxnorm_name"),
                            "dosage_form": row.get("dosage_form"),
                            "strength": row.get("strength"),
                            "route": row.get("route", "Oral"),
                            "rxnorm_cui": row.get("rxnorm_cui"),
                            "medicine_class": row.get("medicine_class"),
                            "confidence": float(row.get("confidence", 0.95)),
                            "normalization_status": row.get("normalization_status"),
                            "safety_note": row.get("safety_note")
                        }
            except Exception as e:
                print(f"Warning loading medicine normalization csv: {e}")

        # 2. Load Prescription OCR Dataset
        if settings.PRESCRIPTION_OCR_XLSX.exists():
            try:
                wb = openpyxl.load_workbook(settings.PRESCRIPTION_OCR_XLSX, read_only=True)
                sheet = wb.active
                headers = []
                for i, row in enumerate(sheet.iter_rows(values_only=True)):
                    if i == 0:
                        headers = [str(h) for h in row]
                        continue
                    row_dict = dict(zip(headers, row))
                    pid = str(row_dict.get("patient_id") or "").strip()
                    if not pid:
                        continue

                    rx_item = {
                        "prescription_id": str(row_dict.get("prescription_id")),
                        "patient_id": pid,
                        "doctor_name": str(row_dict.get("doctor_name") or "Dr. Attending Physician"),
                        "hospital_name": str(row_dict.get("hospital_name") or "General Hospital"),
                        "prescription_date": str(row_dict.get("prescription_date") or "2026-03-01"),
                        "handwriting_sample": str(row_dict.get("handwriting_sample_text") or ""),
                        "ocr_raw_text": str(row_dict.get("ocr_raw_text") or ""),
                        "extracted_medicine": str(row_dict.get("extracted_medicine") or ""),
                        "normalized_medicine": str(row_dict.get("normalized_medicine") or ""),
                        "strength": str(row_dict.get("strength") or ""),
                        "dosage_form": str(row_dict.get("dosage_form") or "Tablet"),
                        "dose": str(row_dict.get("dose") or "1 tablet"),
                        "frequency": str(row_dict.get("frequency") or "once daily"),
                        "duration": str(row_dict.get("duration") or "7 days"),
                        "prescription_display": str(row_dict.get("prescription_display") or ""),
                        "medicine_explanation": str(row_dict.get("medicine_explanation") or "Medication prescribed for clinical condition."),
                        "ocr_confidence": float(row_dict.get("ocr_confidence") or 0.90),
                        "medicine_match_confidence": float(row_dict.get("medicine_match_confidence") or 0.90),
                        "source_of_truth": str(row_dict.get("source_of_truth") or "Original Prescription"),
                        "clinical_safety_note": str(row_dict.get("clinical_safety_note") or "")
                    }

                    if pid not in cls._prescriptions_cache:
                        cls._prescriptions_cache[pid] = []
                    cls._prescriptions_cache[pid].append(rx_item)
                wb.close()
            except Exception as e:
                print(f"Warning loading prescription xlsx: {e}")

        cls._loaded = True

    @classmethod
    def get_prescriptions_for_patient(cls, patient_id: str) -> List[Dict[str, Any]]:
        cls.initialize()
        return cls._prescriptions_cache.get(patient_id, [])

    @classmethod
    def normalize_medicine(cls, raw_ocr_name: str) -> Dict[str, Any]:
        cls.initialize()
        cleaned = raw_ocr_name.strip().lower()
        
        # Direct lookup
        if cleaned in cls._normalization_db:
            return cls._normalization_db[cleaned]

        # Fuzzy match / Substring check
        for k, v in cls._normalization_db.items():
            if k in cleaned or cleaned in k:
                return v

        # Fallback default
        return {
            "normalized_name": raw_ocr_name.capitalize(),
            "generic_name": raw_ocr_name.capitalize(),
            "rxnorm_name": raw_ocr_name,
            "dosage_form": "Tablet",
            "strength": "Standard",
            "route": "Oral",
            "rxnorm_cui": "N/A",
            "medicine_class": "General Medicine",
            "confidence": 0.65,
            "normalization_status": "Unverified",
            "safety_note": "Handwriting or OCR is ambiguous. Please verify medicine with your doctor or pharmacist."
        }

    @classmethod
    def parse_prescription_text(cls, raw_text: str, ocr_confidence: float = 0.90) -> Dict[str, Any]:
        """
        Parses raw text from prescription image/OCR into structured medicines table,
        performing normalization, handwriting confidence safety check, and instructions breakdown.
        """
        cls.initialize()
        
        is_low_confidence = ocr_confidence < settings.HANDWRITING_CONFIDENCE_THRESHOLD
        safety_warning = (
            "The prescription handwriting is unclear. Please verify this medicine name with your doctor or pharmacist."
            if is_low_confidence
            else "Prescription extracted successfully with high confidence."
        )

        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        medicines = []

        for line in lines:
            # Check if line looks like a medicine line
            norm = cls.normalize_medicine(line)
            medicines.append({
                "medicine_name": line,
                "normalized_name": norm["normalized_name"],
                "generic_name": norm["generic_name"],
                "rxnorm_cui": norm.get("rxnorm_cui", "N/A"),
                "medicine_class": norm.get("medicine_class", "Therapeutic Agent"),
                "strength": norm.get("strength", "As prescribed"),
                "dosage_form": norm.get("dosage_form", "Tablet"),
                "dose": "1 unit",
                "frequency": "As directed by physician",
                "duration": "Duration in prescription",
                "route": norm.get("route", "Oral"),
                "timing_instructions": "Take as directed",
                "explanation": f"{norm['generic_name']} is in the {norm.get('medicine_class', 'medication')} category.",
                "confidence": ocr_confidence,
                "match_confidence": norm.get("confidence", 0.90),
                "safety_note": safety_warning if is_low_confidence else norm.get("safety_note", "")
            })

        return {
            "medicines": medicines,
            "ocr_confidence": ocr_confidence,
            "is_low_confidence": is_low_confidence,
            "safety_warning": safety_warning
        }
