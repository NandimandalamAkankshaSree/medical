from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.models import MedicalDocument, LabParameterValue

class ComparisonService:
    """
    Explicit Report Comparison Engine.
    Only compares two reports when the patient explicitly requests it.
    Outputs factual, neutral parameter differences without making unsupported clinical leaps.
    """

    @classmethod
    def compare_reports(
        cls,
        db: Session,
        patient_id: str,
        current_doc_id: int,
        previous_doc_id: int
    ) -> Dict[str, Any]:
        curr_doc = db.query(MedicalDocument).filter(
            MedicalDocument.id == current_doc_id,
            MedicalDocument.patient_id == patient_id
        ).first()

        prev_doc = db.query(MedicalDocument).filter(
            MedicalDocument.id == previous_doc_id,
            MedicalDocument.patient_id == patient_id
        ).first()

        if not curr_doc or not prev_doc:
            return {"error": "One or both selected reports could not be found for this patient."}

        curr_labs = db.query(LabParameterValue).filter(LabParameterValue.document_id == current_doc_id).all()
        prev_labs = db.query(LabParameterValue).filter(LabParameterValue.document_id == previous_doc_id).all()

        prev_map = {l.parameter_name.strip().lower(): l for l in prev_labs}
        curr_map = {l.parameter_name.strip().lower(): l for l in curr_labs}

        all_param_names = set(prev_map.keys()).union(set(curr_map.keys()))
        comparisons = []
        factual_notes = []

        for p_name in sorted(all_param_names):
            p_val = prev_map.get(p_name)
            c_val = curr_map.get(p_name)

            display_name = c_val.parameter_name if c_val else p_val.parameter_name
            unit = (c_val.unit if c_val else p_val.unit) or ""
            ref_range = (c_val.reference_range if c_val else p_val.reference_range) or ""

            prev_num = p_val.numeric_value if p_val else None
            curr_num = c_val.numeric_value if c_val else None

            prev_str = f"{p_val.result_value} {unit}".strip() if p_val else "Not tested in previous report"
            curr_str = f"{c_val.result_value} {unit}".strip() if c_val else "Not tested in current report"

            diff_str = "N/A"
            diff_num = None
            pct_change = None

            if prev_num is not None and curr_num is not None:
                diff_num = round(curr_num - prev_num, 2)
                sign = "+" if diff_num > 0 else ""
                diff_str = f"{sign}{diff_num} {unit}".strip()
                if prev_num != 0:
                    pct_change = round(((curr_num - prev_num) / prev_num) * 100, 1)

                factual_notes.append(
                    f"{display_name} changed from {prev_num} {unit} ({prev_doc.report_date}) to {curr_num} {unit} ({curr_doc.report_date})."
                )

            comparisons.append({
                "parameter_name": display_name,
                "previous_value": prev_str,
                "previous_numeric": prev_num,
                "current_value": curr_str,
                "current_numeric": curr_num,
                "difference": diff_str,
                "difference_numeric": diff_num,
                "percentage_change": f"{pct_change}%" if pct_change is not None else "N/A",
                "unit": unit,
                "reference_range": ref_range,
                "current_status": c_val.status if c_val else "N/A",
                "previous_status": p_val.status if p_val else "N/A"
            })

        summary_text = (
            f"Comparison between {curr_doc.document_name} ({curr_doc.report_date}) and "
            f"{prev_doc.document_name} ({prev_doc.report_date}). "
            f"Total {len(comparisons)} parameters evaluated."
        )

        return {
            "current_document": {
                "id": curr_doc.id,
                "name": curr_doc.document_name,
                "type": curr_doc.document_type,
                "date": curr_doc.report_date
            },
            "previous_document": {
                "id": prev_doc.id,
                "name": prev_doc.document_name,
                "type": prev_doc.document_type,
                "date": prev_doc.report_date
            },
            "summary": summary_text,
            "comparisons": comparisons,
            "factual_observations": factual_notes,
            "disclaimer": "This comparison displays laboratory parameter differences objectively. Consult your doctor to interpret medical significance."
        }
