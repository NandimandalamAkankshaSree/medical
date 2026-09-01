from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db.models import LabParameterValue, MedicalDocument

router = APIRouter(prefix="/visualization", tags=["Health Visualization"])

@router.get("/document/{document_id}")
def get_document_visualization_data(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(MedicalDocument).filter(MedicalDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    labs = db.query(LabParameterValue).filter(LabParameterValue.document_id == document_id).all()
    
    cards = []
    for l in labs:
        cards.append({
            "id": l.id,
            "parameter_name": l.parameter_name,
            "result_value": l.result_value,
            "numeric_value": l.numeric_value,
            "unit": l.unit or "",
            "reference_range": l.reference_range or "Standard",
            "min_ref": l.min_ref,
            "max_ref": l.max_ref,
            "status": l.status,
            "category": l.category or "General",
            "interpretation": l.interpretation
        })

    return {
        "document_id": doc.id,
        "document_name": doc.document_name,
        "report_date": doc.report_date,
        "parameters": cards
    }

@router.get("/trends/{patient_id}")
def get_patient_health_trends(
    patient_id: str,
    parameter: Optional[str] = Query(None, description="Filter specific parameter name e.g. Hemoglobin, HbA1c, Fasting Blood Glucose"),
    db: Session = Depends(get_db)
):
    docs = db.query(MedicalDocument).filter(MedicalDocument.patient_id == patient_id).order_by(MedicalDocument.report_date.asc(), MedicalDocument.id.asc()).all()
    if not docs:
        return {
            "patient_id": patient_id,
            "available_parameters": [],
            "available_categories": ["All"],
            "total_reports": 0,
            "earliest_report_date": None,
            "latest_report_date": None,
            "comparison_matrix": [],
            "trends": []
        }

    doc_ids = [d.id for d in docs]
    doc_map = {d.id: d for d in docs}

    q = db.query(LabParameterValue).filter(LabParameterValue.document_id.in_(doc_ids))
    if parameter:
        q = q.filter(LabParameterValue.parameter_name.ilike(f"%{parameter.strip()}%"))

    lab_vals = q.all()

    # Group by parameter name
    grouped = {}
    param_meta = {}
    for lv in lab_vals:
        p_name = lv.parameter_name
        if not p_name:
            continue

        if p_name not in grouped:
            grouped[p_name] = []
            param_meta[p_name] = {
                "category": lv.category or "General Diagnostics",
                "unit": lv.unit or "",
                "min_ref": lv.min_ref,
                "max_ref": lv.max_ref,
                "reference_range": lv.reference_range or "Standard"
            }

        doc = doc_map.get(lv.document_id)
        grouped[p_name].append({
            "date": doc.report_date if doc and doc.report_date else "2026-08-24",
            "document_id": doc.id if doc else lv.document_id,
            "document_name": doc.document_name if doc else "",
            "value": lv.numeric_value if lv.numeric_value is not None else lv.result_value,
            "numeric_value": lv.numeric_value,
            "result_value": lv.result_value,
            "unit": lv.unit or "",
            "status": lv.status or "NORMAL",
            "min_ref": lv.min_ref,
            "max_ref": lv.max_ref,
            "reference_range": lv.reference_range or "Standard",
            "interpretation": lv.interpretation,
            "is_name_mismatch": getattr(doc, "is_name_mismatch", False) if doc else False,
            "patient_name_extracted": getattr(doc, "patient_name_extracted", None) if doc else None,
            "disclaimer_note": getattr(doc, "disclaimer_note", None) if doc else None
        })

    trend_series = []
    comparison_matrix = []

    for param_name, points in grouped.items():
        points_sorted = sorted(points, key=lambda x: (x["date"], x["document_id"]))
        meta = param_meta.get(param_name, {})
        
        # Numeric points for chart series
        num_points = [p for p in points_sorted if p.get("numeric_value") is not None]
        if num_points:
            trend_series.append({
                "parameter_name": param_name,
                "category": meta.get("category", "General Diagnostics"),
                "unit": meta.get("unit", ""),
                "min_ref": meta.get("min_ref"),
                "max_ref": meta.get("max_ref"),
                "reference_range": meta.get("reference_range", "Standard"),
                "data_points": num_points
            })

        # Calculate Past vs Present Delta
        first_pt = points_sorted[0]
        latest_pt = points_sorted[-1]
        
        diff = None
        pct_change = None
        trend_status = "Stable"

        if len(points_sorted) > 1:
            if first_pt.get("numeric_value") is not None and latest_pt.get("numeric_value") is not None:
                diff = round(latest_pt["numeric_value"] - first_pt["numeric_value"], 2)
                if first_pt["numeric_value"] != 0:
                    pct_change = round(((latest_pt["numeric_value"] - first_pt["numeric_value"]) / first_pt["numeric_value"]) * 100, 1)

                # Determine clinical improvement trajectory
                if latest_pt["status"] == "NORMAL" and first_pt["status"] != "NORMAL":
                    trend_status = "Normalized"
                elif latest_pt["status"] == "NORMAL" and first_pt["status"] == "NORMAL":
                    trend_status = "Healthy / Optimal"
                elif latest_pt["status"] in ["HIGH", "CRITICAL"] and first_pt["status"] == "NORMAL":
                    trend_status = "Elevated"
                elif latest_pt["status"] == "LOW" and first_pt["status"] == "NORMAL":
                    trend_status = "Decreased"
                elif diff > 0:
                    trend_status = "Increased"
                elif diff < 0:
                    trend_status = "Decreased"
            elif first_pt["result_value"] != latest_pt["result_value"]:
                trend_status = "Changed"
        else:
            trend_status = "Baseline"

        diff_str = f"{'+' if diff and diff > 0 else ''}{diff} {meta.get('unit', '')}" if diff is not None else "N/A"
        pct_str = f"{'+' if pct_change and pct_change > 0 else ''}{pct_change}%" if pct_change is not None else "N/A"

        comparison_matrix.append({
            "parameter_name": param_name,
            "category": meta.get("category", "General Diagnostics"),
            "unit": meta.get("unit", ""),
            "reference_range": meta.get("reference_range", "Standard"),
            "min_ref": meta.get("min_ref"),
            "max_ref": meta.get("max_ref"),
            "previous_date": first_pt["date"],
            "previous_value": first_pt.get("numeric_value") if first_pt.get("numeric_value") is not None else first_pt["result_value"],
            "previous_status": first_pt["status"],
            "previous_doc": first_pt["document_name"],
            "present_date": latest_pt["date"],
            "present_value": latest_pt.get("numeric_value") if latest_pt.get("numeric_value") is not None else latest_pt["result_value"],
            "present_status": latest_pt["status"],
            "present_doc": latest_pt["document_name"],
            "difference": diff_str,
            "difference_num": diff,
            "percentage_change": pct_str,
            "pct_change_num": pct_change,
            "trend_status": trend_status,
            "interpretation": latest_pt.get("interpretation") or ""
        })

    # Available categories
    categories = sorted(list(set([m["category"] for m in comparison_matrix if m.get("category")])))

    # Sort comparison matrix so that out of range / changing parameters show first
    comparison_matrix.sort(key=lambda x: (
        0 if x["trend_status"] in ["Elevated", "Decreased", "Changed"] else
        1 if x["trend_status"] in ["Improved", "Normalized"] else 2
    ))

    # Identify any reports with identity disclaimers
    disclaimers = []
    for d in docs:
        if getattr(d, "is_name_mismatch", False) and getattr(d, "disclaimer_note", None):
            disclaimers.append({
                "document_id": d.id,
                "document_name": d.document_name,
                "patient_name_extracted": getattr(d, "patient_name_extracted", None),
                "disclaimer_note": getattr(d, "disclaimer_note", None)
            })

    return {
        "patient_id": patient_id,
        "available_parameters": [t["parameter_name"] for t in trend_series],
        "available_categories": ["All"] + categories,
        "total_reports": len(docs),
        "earliest_report_date": docs[0].report_date if docs else None,
        "latest_report_date": docs[-1].report_date if docs else None,
        "comparison_matrix": comparison_matrix,
        "trends": trend_series,
        "disclaimers": disclaimers,
        "has_external_reports": len(disclaimers) > 0
    }
