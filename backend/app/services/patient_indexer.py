import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import (
    PatientProfile, MedicalDocument, LabParameterValue,
    PrescriptionRecord, PrescriptionMedicine, PatientDietProfile
)
from app.services.document_parser import DocumentParser
from app.services.prescription_service import PrescriptionService

class PatientIndexerService:
    """
    Scans and indexes the patient data root (data/patients/ or synthetic dataset),
    populates structured SQL tables, and retrieves patient files on-demand.
    Never loads all 500 patient records into LLM memory simultaneously.
    """

    @classmethod
    def get_patient_data_dirs(cls) -> List[Path]:
        """
        Returns all active patient data directories to scan.
        """
        dirs = []
        if settings.PATIENT_DATA_ROOT.exists() and any(settings.PATIENT_DATA_ROOT.iterdir()):
            dirs.append(settings.PATIENT_DATA_ROOT)
        if settings.SYNTHETIC_PATIENT_ROOT.exists():
            dirs.append(settings.SYNTHETIC_PATIENT_ROOT)
        return dirs

    @classmethod
    def index_all_patients(cls, db: Session, max_limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Scans patient folders and indexes their metadata into the relational database.
        """
        PrescriptionService.initialize()
        indexed_count = 0
        doc_count = 0
        data_dirs = cls.get_patient_data_dirs()

        seen_patient_ids = set()

        for data_dir in data_dirs:
            for item in sorted(data_dir.iterdir()):
                if not item.is_dir():
                    continue

                patient_id = item.name
                if patient_id in seen_patient_ids:
                    continue

                seen_patient_ids.add(patient_id)

                # Check if patient already exists in DB
                existing = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
                if not existing:
                    profile = cls._index_single_patient_folder(db, item, patient_id)
                    if profile:
                        indexed_count += 1
                else:
                    # Check if documents need indexing
                    cls._sync_patient_documents(db, existing, item)

                if max_limit and len(seen_patient_ids) >= max_limit:
                    break

        db.commit()
        return {
            "status": "success",
            "total_indexed_patients": len(seen_patient_ids),
            "newly_added": indexed_count
        }

    @classmethod
    def _index_single_patient_folder(cls, db: Session, folder_path: Path, patient_id: str) -> Optional[PatientProfile]:
        """
        Indexes a single patient folder, parsing its PDF reports and linking prescription records.
        """
        pdf_files = list(folder_path.glob("*.pdf")) + list(folder_path.glob("*.png")) + list(folder_path.glob("*.jpg"))
        
        patient_name = f"Patient {patient_id.replace('patient_', '')}"
        age = 45
        gender = "Female" if int(patient_id.replace('patient_', '') or 1) % 2 == 0 else "Male"
        hospital_name = "Apollo Hospitals"
        doctor_name = "Dr. Attending Physician"
        conditions = []

        # Parse first PDF to grab header info if available
        if pdf_files:
            try:
                first_parsed = DocumentParser.parse_medical_report(str(pdf_files[0]))
                if first_parsed.get("patient_name") and first_parsed["patient_name"] != "Patient":
                    patient_name = first_parsed["patient_name"]
                if first_parsed.get("age"):
                    age = first_parsed["age"]
                if first_parsed.get("sex"):
                    gender = first_parsed["sex"]
                if first_parsed.get("hospital_name"):
                    hospital_name = first_parsed["hospital_name"]
                if first_parsed.get("doctor_name"):
                    doctor_name = first_parsed["doctor_name"]
            except Exception as e:
                print(f"Error parsing {pdf_files[0]}: {e}")

        # Derive initial conditions from file names
        for f in pdf_files:
            fname = f.name.lower()
            if "diabetes" in fname:
                conditions.append("Type 2 Diabetes Mellitus")
            elif "lipid" in fname:
                conditions.append("Hyperlipidemia")
            elif "thyroid" in fname:
                conditions.append("Hypothyroidism")
            elif "kidney" in fname:
                conditions.append("Chronic Kidney Disease")
            elif "blood" in fname:
                conditions.append("Anemia Evaluation")

        condition_str = ", ".join(list(set(conditions))) if conditions else "Routine Health Checkup"

        # Create Profile
        profile = PatientProfile(
            patient_id=patient_id,
            full_name=patient_name,
            age=age,
            gender=gender,
            blood_group="B+" if gender == "Male" else "O+",
            date_of_birth=f"{2026 - (age or 40)}-05-12",
            height_cm=170.0 if gender == "Male" else 160.0,
            weight_kg=72.0 if gender == "Male" else 62.0,
            allergies="No known drug allergies (NKDA)",
            medical_conditions=condition_str,
            hospital_name=hospital_name,
            primary_doctor=doctor_name,
            source_folder=str(folder_path)
        )
        db.add(profile)
        db.flush()

        # Create Patient Diet Profile
        diet_profile = PatientDietProfile(
            patient_id=patient_id,
            age=age,
            gender=gender,
            height=profile.height_cm,
            weight=profile.weight_kg,
            activity_level="Moderate",
            medical_conditions=condition_str,
            allergies=profile.allergies,
            dietary_preference="Balanced Healthy Eating",
            calorie_target=2000.0,
            protein_target=75.0,
            carbohydrate_target=250.0,
            fat_target=65.0,
            sodium_limit=2000.0,
            potassium_limit=3000.0
        )
        db.add(diet_profile)

        # Index Documents
        for pdf_path in pdf_files:
            try:
                parsed = DocumentParser.parse_medical_report(str(pdf_path))
                doc = MedicalDocument(
                    patient_id=patient_id,
                    document_name=pdf_path.name,
                    document_type=parsed.get("document_type", "Medical Report"),
                    file_path=str(pdf_path),
                    file_type=pdf_path.suffix.replace(".", ""),
                    file_size=pdf_path.stat().st_size,
                    page_count=parsed.get("page_count", 1),
                    report_date=parsed.get("report_date", "2024-03-24"),
                    hospital_name=parsed.get("hospital_name") or hospital_name,
                    doctor_name=parsed.get("doctor_name") or doctor_name,
                    ocr_status="COMPLETED",
                    quick_summary=parsed.get("quick_summary"),
                    detailed_summary=parsed.get("detailed_summary"),
                    findings=parsed.get("findings"),
                    doctor_observations=parsed.get("doctor_observations"),
                    recommendations=parsed.get("recommendations"),
                    parsed_data_json=json.dumps(parsed)
                )
                db.add(doc)
                db.flush()

                # Add Lab Parameter Values
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
                        test_date=doc.report_date,
                        page_number=p["page_number"],
                        section_name=p["section_name"]
                    )
                    db.add(lab_val)

            except Exception as ex:
                print(f"Error parsing document {pdf_path}: {ex}")

        # Index Prescriptions from Prescription Service
        prescriptions = PrescriptionService.get_prescriptions_for_patient(patient_id)
        for rx in prescriptions:
            rx_rec = PrescriptionRecord(
                prescription_id=rx["prescription_id"],
                patient_id=patient_id,
                doctor_name=rx["doctor_name"],
                hospital_name=rx["hospital_name"],
                prescription_date=rx["prescription_date"],
                handwriting_sample=rx["handwriting_sample"],
                ocr_raw_text=rx["ocr_raw_text"],
                ocr_confidence=rx["ocr_confidence"],
                clinical_safety_note=rx["clinical_safety_note"]
            )
            db.add(rx_rec)
            db.flush()

            med = PrescriptionMedicine(
                prescription_id=rx_rec.prescription_id,
                medicine_name=rx["extracted_medicine"],
                normalized_name=rx["normalized_medicine"],
                generic_name=rx["normalized_medicine"],
                strength=rx["strength"],
                dosage_form=rx["dosage_form"],
                dose=rx["dose"],
                frequency=rx["frequency"],
                duration=rx["duration"],
                explanation=rx["medicine_explanation"],
                confidence=rx["ocr_confidence"],
                match_confidence=rx["medicine_match_confidence"],
                safety_note=rx["clinical_safety_note"]
            )
            db.add(med)

        return profile

    @classmethod
    def _sync_patient_documents(cls, db: Session, profile: PatientProfile, folder_path: Path):
        """
        Syncs any newly added files in an existing patient directory.
        """
        existing_doc_names = set(
            d.document_name for d in db.query(MedicalDocument.document_name).filter(MedicalDocument.patient_id == profile.patient_id).all()
        )
        for f in folder_path.glob("*.pdf"):
            if f.name not in existing_doc_names:
                try:
                    parsed = DocumentParser.parse_medical_report(str(f))
                    doc = MedicalDocument(
                        patient_id=profile.patient_id,
                        document_name=f.name,
                        document_type=parsed.get("document_type", "Medical Report"),
                        file_path=str(f),
                        file_type="pdf",
                        file_size=f.stat().st_size,
                        page_count=parsed.get("page_count", 1),
                        report_date=parsed.get("report_date", "2024-03-24"),
                        hospital_name=parsed.get("hospital_name") or profile.hospital_name,
                        doctor_name=parsed.get("doctor_name") or profile.primary_doctor,
                        ocr_status="COMPLETED",
                        quick_summary=parsed.get("quick_summary"),
                        detailed_summary=parsed.get("detailed_summary"),
                        findings=parsed.get("findings"),
                        doctor_observations=parsed.get("doctor_observations"),
                        recommendations=parsed.get("recommendations"),
                        parsed_data_json=json.dumps(parsed)
                    )
                    db.add(doc)
                    db.flush()

                    for p in parsed.get("lab_parameters", []):
                        lab_val = LabParameterValue(
                            document_id=doc.id,
                            patient_id=profile.patient_id,
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
                            test_date=doc.report_date,
                            page_number=p["page_number"],
                            section_name=p["section_name"]
                        )
                        db.add(lab_val)
                except Exception as ex:
                    print(f"Error syncing {f}: {ex}")

    @classmethod
    def search_patients(
        cls,
        db: Session,
        query: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Paginated search across all 500+ patient profiles by ID, name, conditions, or hospital.
        """
        q = db.query(PatientProfile)
        if query:
            search_str = f"%{query.strip()}%"
            q = q.filter(
                (PatientProfile.patient_id.ilike(search_str)) |
                (PatientProfile.full_name.ilike(search_str)) |
                (PatientProfile.medical_conditions.ilike(search_str)) |
                (PatientProfile.hospital_name.ilike(search_str))
            )

        total = q.count()
        patients = q.order_by(PatientProfile.patient_id).offset((page - 1) * per_page).limit(per_page).all()

        results = []
        for p in patients:
            doc_count = db.query(MedicalDocument).filter(MedicalDocument.patient_id == p.patient_id).count()
            rx_count = db.query(PrescriptionRecord).filter(PrescriptionRecord.patient_id == p.patient_id).count()
            results.append({
                "patient_id": p.patient_id,
                "full_name": p.full_name,
                "age": p.age,
                "gender": p.gender,
                "blood_group": p.blood_group,
                "medical_conditions": p.medical_conditions,
                "hospital_name": p.hospital_name,
                "primary_doctor": p.primary_doctor,
                "document_count": doc_count,
                "prescription_count": rx_count
            })

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "patients": results
        }

    @classmethod
    def get_patient_details(cls, db: Session, patient_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves complete structured records for a single patient.
        """
        patient = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
        if not patient:
            return None

        docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).all()
        rxs = db.query(PrescriptionRecord).filter(PrescriptionRecord.patient_id == patient_id).all()
        diet = db.query(PatientDietProfile).filter(PatientDietProfile.patient_id == patient_id).first()

        doc_list = []
        for d in docs:
            doc_list.append({
                "id": d.id,
                "document_name": d.document_name,
                "document_type": d.document_type,
                "file_type": d.file_type,
                "report_date": d.report_date,
                "hospital_name": d.hospital_name,
                "doctor_name": d.doctor_name,
                "page_count": d.page_count,
                "quick_summary": d.quick_summary,
                "detailed_summary": d.detailed_summary
            })

        rx_list = []
        for r in rxs:
            meds = db.query(PrescriptionMedicine).filter(PrescriptionMedicine.prescription_id == r.prescription_id).all()
            rx_list.append({
                "prescription_id": r.prescription_id,
                "doctor_name": r.doctor_name,
                "hospital_name": r.hospital_name,
                "prescription_date": r.prescription_date,
                "ocr_confidence": r.ocr_confidence,
                "handwriting_sample": r.handwriting_sample,
                "safety_note": r.clinical_safety_note,
                "medicines": [
                    {
                        "medicine_name": m.medicine_name,
                        "normalized_name": m.normalized_name,
                        "strength": m.strength,
                        "dosage_form": m.dosage_form,
                        "frequency": m.frequency,
                        "duration": m.duration,
                        "explanation": m.explanation,
                        "confidence": m.confidence
                    } for m in meds
                ]
            })

        return {
            "patient_id": patient.patient_id,
            "full_name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "date_of_birth": patient.date_of_birth,
            "height_cm": patient.height_cm,
            "weight_kg": patient.weight_kg,
            "allergies": patient.allergies,
            "medical_conditions": patient.medical_conditions,
            "hospital_name": patient.hospital_name,
            "primary_doctor": patient.primary_doctor,
            "documents": doc_list,
            "prescriptions": rx_list,
            "diet_profile": {
                "activity_level": diet.activity_level if diet else "Moderate",
                "dietary_preference": diet.dietary_preference if diet else "Balanced",
                "calorie_target": diet.calorie_target if diet else 2000.0,
                "protein_target": diet.protein_target if diet else 75.0,
                "sodium_limit": diet.sodium_limit if diet else 2000.0
            } if diet else None
        }

    @classmethod
    def get_or_create_personal_profile(cls, db: Session) -> PatientProfile:
        """
        Creates or returns the user's primary personal health space ('my_health_profile')
        with baseline past and present reports, extracted parameters, prescriptions, and RAG index.
        """
        from app.services.rag_engine import RAGEngine
        personal_id = "my_health_profile"
        profile = db.query(PatientProfile).filter(PatientProfile.patient_id == personal_id).first()
        if profile:
            return profile

        profile = PatientProfile(
            patient_id=personal_id,
            full_name="Alex Morgan",
            age=38,
            gender="Male",
            blood_group="O+",
            date_of_birth="1988-06-14",
            height_cm=176.0,
            weight_kg=76.5,
            contact_phone="+1 (555) 234-5678",
            address="124 Health Park Blvd, Suite 400",
            hospital_name="Apollo City Hospital & Diagnostics",
            primary_doctor="Dr. Rajiv Mehta, MD",
            allergies="Penicillin",
            medical_conditions="Type 2 Diabetes (Managed), Hyperlipidemia"
        )
        db.add(profile)
        db.flush()

        # Diet profile
        diet = PatientDietProfile(
            patient_id=personal_id,
            age=38,
            gender="Male",
            height=176.0,
            weight=76.5,
            activity_level="Moderate",
            medical_conditions="Type 2 Diabetes (Managed), Hyperlipidemia",
            allergies="Penicillin",
            dietary_preference="Balanced Non-Vegetarian",
            calorie_target=2100.0,
            protein_target=85.0,
            carbohydrate_target=210.0,
            fat_target=60.0,
            fiber_target=32.0,
            sodium_limit=2200.0
        )
        db.add(diet)

        # Baseline Past Report (2025-10-15)
        prev_doc = MedicalDocument(
            patient_id=personal_id,
            document_name="previous_health_checkup_oct2025.pdf",
            document_type="Lipid & Glycemic Profile (Previous)",
            file_path="uploads/previous_health_checkup_oct2025.pdf",
            file_type="pdf",
            file_size=142800,
            report_date="2025-10-15",
            hospital_name="Apollo City Hospital",
            doctor_name="Dr. Rajiv Mehta, MD",
            ocr_status="COMPLETED",
            ocr_confidence=0.98,
            page_count=2,
            quick_summary="Baseline health evaluation showing elevated Fasting Blood Glucose (142 mg/dL), elevated HbA1c (7.4%), and elevated Total Cholesterol (232 mg/dL) with high LDL (154 mg/dL).",
            detailed_summary="Patient presented for routine annual health evaluation in Oct 2025. Glycemic indices indicated uncontrolled type 2 diabetes with fasting glucose of 142 mg/dL and HbA1c 7.4%. Lipid panel revealed marked hypercholesterolemia with Total Cholesterol 232 mg/dL, LDL 154 mg/dL, and Triglycerides 198 mg/dL. Liver transaminases were mildly elevated (ALT 48 U/L).",
            findings="Elevated fasting plasma glucose and glycosylated hemoglobin. Dyslipidemia with low HDL (38 mg/dL) and high triglycerides. Mild hepatic transaminase elevation.",
            doctor_observations="Recommended lifestyle modification, initiation of Metformin 500mg twice daily and Atorvastatin 10mg nightly, strict low-glycemic dietary adjustments, and 6-month follow-up lab panel.",
            recommendations="1. Start Metformin 500mg BID with meals.\n2. Start Atorvastatin 10mg QHS.\n3. Adopt NIDDK diabetic meal guidelines and reduce saturated fats.\n4. Repeat comprehensive lab panel in 6 months."
        )
        db.add(prev_doc)
        db.flush()

        prev_params = [
            ("Fasting Blood Glucose", "142", 142.0, "mg/dL", "70 - 99", 70.0, 99.0, "HIGH", "Elevated fasting sugar indicating suboptimal glycemic control", "Diabetes & Glycemic"),
            ("HbA1c", "7.4", 7.4, "%", "< 5.7", 4.0, 5.7, "HIGH", "Elevated 3-month average blood glucose indicative of Type 2 Diabetes", "Diabetes & Glycemic"),
            ("Total Cholesterol", "232", 232.0, "mg/dL", "< 200", 125.0, 200.0, "HIGH", "Elevated total blood cholesterol level", "Lipid Profile"),
            ("LDL Cholesterol", "154", 154.0, "mg/dL", "< 100", 50.0, 100.0, "HIGH", "Elevated LDL ('bad') cholesterol increasing cardiovascular risk", "Lipid Profile"),
            ("HDL Cholesterol", "38", 38.0, "mg/dL", "> 40", 40.0, 70.0, "LOW", "Suboptimal HDL ('good') protective cholesterol level", "Lipid Profile"),
            ("Triglycerides", "198", 198.0, "mg/dL", "< 150", 50.0, 150.0, "HIGH", "Elevated blood triglycerides", "Lipid Profile"),
            ("Hemoglobin", "13.2", 13.2, "g/dL", "13.5 - 17.5", 13.5, 17.5, "LOW", "Borderline low hemoglobin level", "Hematology"),
            ("Platelet Count", "220000", 220000.0, "cells/mcL", "150000 - 450000", 150000.0, 450000.0, "NORMAL", "Normal platelet count adequate for blood clotting", "Hematology"),
            ("Serum Creatinine", "1.05", 1.05, "mg/dL", "0.7 - 1.3", 0.7, 1.3, "NORMAL", "Healthy kidney filtration baseline", "Renal Function"),
            ("ALT / SGPT", "48", 48.0, "U/L", "< 40", 7.0, 40.0, "HIGH", "Mildly elevated liver enzyme associated with metabolic liver strain", "Liver Function"),
            ("Blood Pressure Systolic", "138", 138.0, "mmHg", "< 120", 90.0, 120.0, "HIGH", "Stage 1 elevated blood pressure reading", "Vitals")
        ]

        for p in prev_params:
            lv = LabParameterValue(
                document_id=prev_doc.id,
                patient_id=personal_id,
                parameter_name=p[0],
                result_value=p[1],
                numeric_value=p[2],
                unit=p[3],
                reference_range=p[4],
                min_ref=p[5],
                max_ref=p[6],
                status=p[7],
                interpretation=p[8],
                category=p[9],
                test_date="2025-10-15",
                page_number=1,
                section_name="Laboratory Analysis"
            )
            db.add(lv)

        # Baseline Present Report (2026-03-20)
        curr_doc = MedicalDocument(
            patient_id=personal_id,
            document_name="present_comprehensive_lab_report_mar2026.pdf",
            document_type="Comprehensive Health Panel (Present)",
            file_path="uploads/present_comprehensive_lab_report_mar2026.pdf",
            file_type="pdf",
            file_size=158400,
            report_date="2026-03-20",
            hospital_name="Apollo City Hospital",
            doctor_name="Dr. Rajiv Mehta, MD",
            ocr_status="COMPLETED",
            ocr_confidence=0.99,
            page_count=2,
            quick_summary="Follow-up checkup showing significant improvement across glycemic and lipid parameters following 5 months of lifestyle adherence and prescribed therapy.",
            detailed_summary="Follow-up consultation in March 2026 after 5 months of Metformin, Atorvastatin, and dietary management. Fasting blood sugar decreased from 142 to 106 mg/dL (-25.4%). HbA1c reduced from 7.4% to 6.1% (-17.6%). Total Cholesterol normalized from 232 to 186 mg/dL (-19.8%). LDL improved from 154 to 110 mg/dL (-28.6%), and HDL increased to 46 mg/dL (+21.1%). ALT normalized to 28 U/L.",
            findings="Marked clinical improvement in glycemic control and lipid parameters. Normalization of liver transaminases and improvement in resting blood pressure.",
            doctor_observations="Patient exhibits excellent adherence to nutrition guidelines and prescribed therapy. Glycemic indices are approaching target normal range. Maintain current regimen.",
            recommendations="1. Continue Metformin 500mg BID and Atorvastatin 10mg QHS.\n2. Maintain consistent physical activity (30 mins daily) and Mediterranean-style nutrition.\n3. Next routine follow-up in 6 months."
        )
        db.add(curr_doc)
        db.flush()

        curr_params = [
            ("Fasting Blood Glucose", "106", 106.0, "mg/dL", "70 - 99", 70.0, 99.0, "HIGH", "Substantially improved (-25.4%) approaching normal target range", "Diabetes & Glycemic"),
            ("HbA1c", "6.1", 6.1, "%", "< 5.7", 4.0, 5.7, "HIGH", "Substantially reduced from 7.4% (-17.6%) reflecting solid glycemic management", "Diabetes & Glycemic"),
            ("Total Cholesterol", "186", 186.0, "mg/dL", "< 200", 125.0, 200.0, "NORMAL", "Normalized cholesterol level within recommended healthy range", "Lipid Profile"),
            ("LDL Cholesterol", "110", 110.0, "mg/dL", "< 100", 50.0, 100.0, "HIGH", "Improved significantly by -28.6% compared to previous baseline", "Lipid Profile"),
            ("HDL Cholesterol", "46", 46.0, "mg/dL", "> 40", 40.0, 70.0, "NORMAL", "Normalized protective HDL cholesterol (+21.1% increase)", "Lipid Profile"),
            ("Triglycerides", "140", 140.0, "mg/dL", "< 150", 50.0, 150.0, "NORMAL", "Normalized triglycerides within optimal range (-29.3% drop)", "Lipid Profile"),
            ("Hemoglobin", "14.5", 14.5, "g/dL", "13.5 - 17.5", 13.5, 17.5, "NORMAL", "Normalized healthy red blood cell count and oxygen capacity", "Hematology"),
            ("Platelet Count", "245000", 245000.0, "cells/mcL", "150000 - 450000", 150000.0, 450000.0, "NORMAL", "Normal healthy platelet count", "Hematology"),
            ("Serum Creatinine", "0.92", 0.92, "mg/dL", "0.7 - 1.3", 0.7, 1.3, "NORMAL", "Excellent renal filtration and healthy kidney function", "Renal Function"),
            ("ALT / SGPT", "28", 28.0, "U/L", "< 40", 7.0, 40.0, "NORMAL", "Normalized liver enzyme function (down from 48 U/L)", "Liver Function"),
            ("Blood Pressure Systolic", "122", 122.0, "mmHg", "< 120", 90.0, 120.0, "NORMAL", "Normal resting blood pressure within healthy parameters", "Vitals")
        ]

        for p in curr_params:
            lv = LabParameterValue(
                document_id=curr_doc.id,
                patient_id=personal_id,
                parameter_name=p[0],
                result_value=p[1],
                numeric_value=p[2],
                unit=p[3],
                reference_range=p[4],
                min_ref=p[5],
                max_ref=p[6],
                status=p[7],
                interpretation=p[8],
                category=p[9],
                test_date="2026-03-20",
                page_number=1,
                section_name="Laboratory Analysis"
            )
            db.add(lv)

        # Prescriptions
        rx = PrescriptionRecord(
            prescription_id="RX-PERSONAL-001",
            patient_id=personal_id,
            patient_name="Alex Morgan",
            doctor_name="Dr. Rajiv Mehta, MD",
            hospital_name="Apollo City Hospital",
            department="Endocrinology & Internal Medicine",
            prescription_date="2026-03-20",
            diagnosis="Type 2 Diabetes Mellitus & Hyperlipidemia Management",
            ocr_confidence=0.98,
            doctor_notes="Patient responds well to combination therapy. Continue current dosages. Re-evaluate in 6 months.",
            clinical_safety_note="Metformin should be taken with meals to minimize GI discomfort. Atorvastatin taken at night. Report any unexplained muscle soreness."
        )
        db.add(rx)
        db.flush()

        rx_med1 = PrescriptionMedicine(
            prescription_id="RX-PERSONAL-001",
            medicine_name="Metformin Hydrochloride",
            normalized_name="Metformin hydrochloride 500 MG Oral Tablet",
            generic_name="Metformin",
            rxnorm_cui="6809",
            dosage_form="Tablet",
            strength="500mg",
            frequency="Twice daily (Morning & Evening)",
            duration="Ongoing (6 Months)",
            instructions="Take immediately after meals with a glass of water.",
            explanation="Biguanide anti-diabetic medication that lowers hepatic glucose production and increases insulin sensitivity.",
            side_effects="Mild nausea, stomach upset, metallic taste (minimized by taking with food).",
            purpose="Type 2 Diabetes blood sugar regulation",
            confidence=0.99
        )
        rx_med2 = PrescriptionMedicine(
            prescription_id="RX-PERSONAL-001",
            medicine_name="Atorvastatin Calcium",
            normalized_name="Atorvastatin calcium 10 MG Oral Tablet",
            generic_name="Atorvastatin",
            rxnorm_cui="83367",
            dosage_form="Tablet",
            strength="10mg",
            frequency="Once daily at bedtime",
            duration="Ongoing (6 Months)",
            instructions="Take once daily at bedtime with or without food.",
            explanation="HMG-CoA reductase inhibitor (statin) that reduces hepatic cholesterol synthesis and lowers LDL cholesterol.",
            side_effects="Headache, mild muscle aches. Notify doctor if severe muscle pain occurs.",
            purpose="Lipid and cardiovascular risk reduction",
            confidence=0.98
        )
        db.add(rx_med1)
        db.add(rx_med2)

        db.commit()
        db.refresh(profile)

        # Index in RAG Engine
        RAGEngine.index_document(personal_id, prev_doc.id, prev_doc.document_name, [
            {"page_number": 1, "text": f"{prev_doc.document_name}\nDate: {prev_doc.report_date}\n{prev_doc.detailed_summary}\nFindings: {prev_doc.findings}\nParameters: " + ", ".join([f"{p[0]}: {p[1]} {p[3]} ({p[7]})" for p in prev_params])}
        ])
        RAGEngine.index_document(personal_id, curr_doc.id, curr_doc.document_name, [
            {"page_number": 1, "text": f"{curr_doc.document_name}\nDate: {curr_doc.report_date}\n{curr_doc.detailed_summary}\nFindings: {curr_doc.findings}\nParameters: " + ", ".join([f"{p[0]}: {p[1]} {p[3]} ({p[7]})" for p in curr_params])}
        ])

        return profile

