from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.comparison_service import ComparisonService

router = APIRouter(prefix="/comparison", tags=["Report Comparison"])

class CompareRequest(BaseModel):
    patient_id: str
    current_document_id: Optional[int] = None
    previous_document_id: Optional[int] = None
    document_id_1: Optional[int] = None
    document_id_2: Optional[int] = None

@router.post("")
@router.post("/compare")
def compare_selected_reports(req: CompareRequest, db: Session = Depends(get_db)):
    doc1 = req.current_document_id or req.document_id_1
    doc2 = req.previous_document_id or req.document_id_2
    if not doc1 or not doc2:
        raise HTTPException(status_code=400, detail="Two document IDs are required for comparison.")

    result = ComparisonService.compare_reports(
        db,
        patient_id=req.patient_id,
        current_doc_id=doc1,
        previous_doc_id=doc2
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
