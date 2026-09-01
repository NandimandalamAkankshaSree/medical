from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.services.diet_service import DietService

router = APIRouter(prefix="/diet", tags=["Diet & Nutrition"])

class GenerateDietRequest(BaseModel):
    patient_id: str
    document_id: Optional[int] = None
    condition: Optional[str] = None

@router.post("/generate")
def generate_diet_plan(req: GenerateDietRequest, db: Session = Depends(get_db)):
    plan = DietService.generate_personalized_diet_plan(db, req.patient_id, req.document_id, target_condition=req.condition)
    if "error" in plan:
        raise HTTPException(status_code=404, detail=plan["error"])
    return plan

@router.get("/foods")
@router.get("/foods/search")
def search_usda_foods(
    query: Optional[str] = Query(None, description="Search food item name"),
    q: Optional[str] = Query(None, description="Search food item name"),
    category: Optional[str] = Query(None, description="Filter by food category"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    search_q = query or q
    return DietService.search_food_database(db, query=search_q, category=category, limit=limit)

@router.get("/niddk-guidelines")
@router.get("/niddk/guidelines")
def get_niddk_nutrition_guidelines(
    condition: str = Query("Diabetes", description="Condition name e.g. Diabetes, Kidney, Hypertension, Lipid, General")
):
    return DietService.retrieve_niddk_guidelines(condition)
