import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add current directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.db.models import User, PatientProfile
from app.services.patient_indexer import PatientIndexerService
from app.services.prescription_service import PrescriptionService
from app.services.diet_service import DietService
from app.services.hospital_doctor_service import HospitalDoctorService

# Import API routers
from app.api.auth import router as auth_router
from app.api.patients import router as patients_router
from app.api.documents import router as documents_router
from app.api.prescriptions import router as prescriptions_router
from app.api.diet import router as diet_router
from app.api.visualization import router as visualization_router
from app.api.comparison import router as comparison_router
from app.api.discovery import router as discovery_router
from app.api.chat import router as chat_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== Initializing MediAssist AI Backend ===")
    # 1. Create Tables
    Base.metadata.create_all(bind=engine)
    
    # 1b. Ensure new columns are present in existing SQLite tables
    import sqlalchemy
    with engine.connect() as conn:
        for col, col_type in [
            ("patient_name_extracted", "VARCHAR(255)"),
            ("is_name_mismatch", "BOOLEAN DEFAULT 0"),
            ("disclaimer_note", "TEXT")
        ]:
            try:
                conn.execute(sqlalchemy.text(f"ALTER TABLE medical_documents ADD COLUMN {col} {col_type}"))
                conn.commit()
            except Exception:
                pass

    db = SessionLocal()
    try:
        # 2. Seed Prescription & Medicine database
        PrescriptionService.initialize()
        
        # 3. Seed USDA Food Items Database
        DietService.seed_food_database(db)
        
        # 4. Seed Hospital Directory
        HospitalDoctorService.seed_hospital_directory(db)
        
        # 5. Ensure Personal User Profile ('my_health_profile') is initialized with baseline past & present records
        PatientIndexerService.get_or_create_personal_profile(db)
        
        # 6. Index initial batch of patients for background medical cohort intelligence
        patient_count = db.query(PatientProfile).count()
        if patient_count < 20:
            print("Indexing initial patient records...")
            PatientIndexerService.index_all_patients(db, max_limit=50)
            print(f"Initial indexing complete. Patients in database: {db.query(PatientProfile).count()}")
    except Exception as e:
        print(f"Error during startup indexing: {e}")
    finally:
        db.close()
        
    yield
    print("=== MediAssist AI Backend Shutdown ===")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Personalized AI Medical Report & Prescription Assistant with 500+ Patient Data Root, Isolated RAG, RxNorm Normalization, NIDDK/USDA Diet Guidance, and Clinical Visualizations.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(patients_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(prescriptions_router, prefix=settings.API_V1_STR)
app.include_router(diet_router, prefix=settings.API_V1_STR)
app.include_router(visualization_router, prefix=settings.API_V1_STR)
app.include_router(comparison_router, prefix=settings.API_V1_STR)
app.include_router(discovery_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "timestamp": "2026-08-19"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
