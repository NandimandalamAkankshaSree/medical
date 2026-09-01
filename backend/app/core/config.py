import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR

is_vercel = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
default_db_path = BASE_DIR / "backend" / "mediassist.db"

if is_vercel:
    tmp_db = Path("/tmp/mediassist.db")
    if not tmp_db.exists() and default_db_path.exists():
        try:
            import shutil
            shutil.copy2(default_db_path, tmp_db)
        except Exception:
            pass
    default_db_url = f"sqlite:///{tmp_db}" if tmp_db.exists() else f"sqlite:///{default_db_path}"
    default_upload_dir = Path("/tmp/uploads")
else:
    default_db_url = f"sqlite:///{default_db_path}"
    default_upload_dir = BASE_DIR / "backend" / "uploads"

class Settings(BaseModel):
    PROJECT_NAME: str = "MediAssist AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Base paths
    BASE_DIR: Path = BASE_DIR
    UPLOAD_DIR: Path = default_upload_dir
    
    # Patient data roots (supports data/patients and fallback to synthetic dataset)
    PATIENT_DATA_ROOT: Path = BASE_DIR / "data" / "patients"
    SYNTHETIC_PATIENT_ROOT: Path = BASE_DIR / "medical_documents_500_synthetic" / "medical_documents"
    
    # Datasets
    HOSPITALS_JSON_PATH: Path = BASE_DIR / "hospitals.json"
    HOSPITALS_CSV_PATH: Path = BASE_DIR / "hospitals.csv"
    MEDICINE_NORMALIZATION_CSV: Path = BASE_DIR / "medicine_normalization_dataset_2000.csv"
    PRESCRIPTION_OCR_XLSX: Path = BASE_DIR / "prescription_ocr_medicine_dataset_2000.xlsx"
    SYNTHEA_DIR: Path = BASE_DIR / "synthea_sample_data_csv_latest"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", default_db_url)
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "mediassist_ai_super_secret_jwt_key_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # AI / LLM
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    
    # Hand-writing confidence threshold
    HANDWRITING_CONFIDENCE_THRESHOLD: float = 0.70

settings = Settings()
try:
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

try:
    settings.PATIENT_DATA_ROOT.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
