import hashlib
import secrets
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db.models import User, PatientProfile
from app.services.patient_indexer import PatientIndexerService

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    if "$" not in hashed:
        # Fallback for plain text demo passwords
        return password == hashed
    salt, stored_hash = hashed.split("$", 1)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return key.hex() == stored_hash

def seed_default_user_if_needed(db: Session):
    """Ensures default personal user 'alex.morgan' exists and is tied to 'my_health_profile'."""
    PatientIndexerService.get_or_create_personal_profile(db)
    user = db.query(User).filter(User.username == "alex.morgan").first()
    if not user:
        user = User(
            username="alex.morgan",
            email="alex.morgan@health.example",
            hashed_password=hash_password("password123"),
            full_name="Alex Morgan",
            role="patient"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    age: Optional[int] = 35
    gender: Optional[str] = "Female"
    blood_group: Optional[str] = "A+"
    medical_conditions: Optional[str] = "General Health"

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    seed_default_user_if_needed(db)
    
    # Lookup user
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        # Allow case-insensitive search
        user = db.query(User).filter(User.username.ilike(req.username)).first()
        
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password. Please check your credentials or register."
        )
        
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password. Please check your credentials."
        )
    
    # Determine user's patient_id
    patient_id = "my_health_profile" if user.username == "alex.morgan" else f"user_{user.id}"
    
    # Ensure patient profile exists for this user
    patient_prof = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
    if not patient_prof:
        patient_prof = PatientProfile(
            patient_id=patient_id,
            full_name=user.full_name or user.username,
            age=35,
            gender="Female",
            blood_group="O+",
            medical_conditions="General Health Checkup"
        )
        db.add(patient_prof)
        db.commit()
        db.refresh(patient_prof)
        
    token = f"meditoken_{user.id}_{secrets.token_hex(16)}"
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name or patient_prof.full_name,
            "email": user.email,
            "patient_id": patient_id,
            "age": patient_prof.age,
            "gender": patient_prof.gender,
            "blood_group": patient_prof.blood_group,
            "medical_conditions": patient_prof.medical_conditions
        }
    }

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    seed_default_user_if_needed(db)
    
    # Check if username exists
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{req.username}' is already taken.")
        
    email = req.email or f"{req.username}@health.example"
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        email = f"{req.username}_{secrets.token_hex(3)}@health.example"

    # Create User
    new_user = User(
        username=req.username,
        email=email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role="patient"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create corresponding isolated PatientProfile
    patient_id = f"user_{new_user.id}"
    patient_prof = PatientProfile(
        patient_id=patient_id,
        full_name=req.full_name,
        age=req.age or 35,
        gender=req.gender or "Female",
        blood_group=req.blood_group or "O+",
        medical_conditions=req.medical_conditions or "General Health",
        hospital_name="City Medical Center",
        primary_doctor="Dr. Medical Specialist"
    )
    db.add(patient_prof)
    db.commit()
    db.refresh(patient_prof)
    
    token = f"meditoken_{new_user.id}_{secrets.token_hex(16)}"
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "message": "Account created successfully!",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "patient_id": patient_id,
            "age": patient_prof.age,
            "gender": patient_prof.gender,
            "blood_group": patient_prof.blood_group,
            "medical_conditions": patient_prof.medical_conditions
        }
    }

@router.get("/me")
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    seed_default_user_if_needed(db)
    
    # If token has format meditoken_{user_id}_{hex}
    if authorization and "meditoken_" in authorization:
        try:
            token_part = authorization.replace("Bearer ", "").strip()
            parts = token_part.split("_")
            if len(parts) >= 2:
                user_id = int(parts[1])
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    patient_id = "my_health_profile" if user.username == "alex.morgan" else f"user_{user.id}"
                    patient_prof = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
                    return {
                        "id": user.id,
                        "username": user.username,
                        "full_name": user.full_name or (patient_prof.full_name if patient_prof else user.username),
                        "email": user.email,
                        "patient_id": patient_id,
                        "age": patient_prof.age if patient_prof else 38,
                        "gender": patient_prof.gender if patient_prof else "Male",
                        "blood_group": patient_prof.blood_group if patient_prof else "O+",
                        "medical_conditions": patient_prof.medical_conditions if patient_prof else ""
                    }
        except Exception:
            pass
            
    # Default fallback to alex.morgan
    user = db.query(User).filter(User.username == "alex.morgan").first()
    if not user:
        user = seed_default_user_if_needed(db)
        
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "patient_id": "my_health_profile",
        "age": 38,
        "gender": "Male",
        "blood_group": "O+",
        "medical_conditions": "Type 2 Diabetes (Managed), Hyperlipidemia"
    }
