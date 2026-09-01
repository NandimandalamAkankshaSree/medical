from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.hospital_doctor_service import HospitalDoctorService

router = APIRouter(prefix="/discovery", tags=["Hospital & Doctor Discovery"])

@router.get("/hospitals")
def search_hospital_directory(
    query: Optional[str] = Query(None, description="Search by hospital name or keyword"),
    q: Optional[str] = Query(None, description="Search by hospital name or keyword"),
    department: Optional[str] = Query(None, description="Filter by department e.g. Cardiology, Neurology"),
    city: Optional[str] = Query(None, description="Filter by city e.g. Chennai, Coimbatore"),
    page: int = Query(1, ge=1),
    limit: Optional[int] = Query(None, ge=1, le=100),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    search_q = query or q
    search_limit = limit or per_page
    return HospitalDoctorService.search_hospitals(
        db,
        query=search_q,
        department=department,
        city=city,
        page=page,
        per_page=search_limit
    )
