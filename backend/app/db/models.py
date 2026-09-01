import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="patient") # patient, doctor, pharmacist, admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PatientProfile(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    date_of_birth = Column(String(50), nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    hospital_name = Column(String(255), nullable=True)
    primary_doctor = Column(String(255), nullable=True)
    allergies = Column(String(500), default="None reported")
    medical_conditions = Column(String(500), default="") # e.g. "Diabetes, Hypertension"
    source_folder = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    documents = relationship("MedicalDocument", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("PrescriptionRecord", back_populates="patient", cascade="all, delete-orphan")
    diet_profile = relationship("PatientDietProfile", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    diet_plans = relationship("DietPlan", back_populates="patient", cascade="all, delete-orphan")


class MedicalDocument(Base):
    __tablename__ = "medical_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), ForeignKey("patients.patient_id"), index=True, nullable=False)
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=False) # e.g. Blood Report, Lipid Profile, Thyroid, Kidney, Diabetes
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf") # pdf, png, jpg, jpeg
    file_size = Column(Integer, default=0)
    report_date = Column(String(50), nullable=True)
    hospital_name = Column(String(255), nullable=True)
    doctor_name = Column(String(255), nullable=True)
    ocr_status = Column(String(50), default="COMPLETED") # PENDING, PROCESSING, COMPLETED, FAILED
    ocr_confidence = Column(Float, default=1.0)
    page_count = Column(Integer, default=1)
    
    # Structured extracted summaries
    quick_summary = Column(Text, nullable=True)
    detailed_summary = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    doctor_observations = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    parsed_data_json = Column(Text, nullable=True) # Full JSON dump of parser
    
    # Patient name identity & disclaimer fields
    patient_name_extracted = Column(String(255), nullable=True)
    is_name_mismatch = Column(Boolean, default=False)
    disclaimer_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="documents")
    lab_parameters = relationship("LabParameterValue", back_populates="document", cascade="all, delete-orphan")


class LabParameterValue(Base):
    __tablename__ = "lab_parameter_values"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("medical_documents.id"), index=True, nullable=False)
    patient_id = Column(String(100), index=True, nullable=False)
    parameter_name = Column(String(150), index=True, nullable=False) # e.g. Hemoglobin, HbA1c, Fasting Glucose
    result_value = Column(String(100), nullable=False)
    numeric_value = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    reference_range = Column(String(100), nullable=True)
    min_ref = Column(Float, nullable=True)
    max_ref = Column(Float, nullable=True)
    status = Column(String(50), default="NORMAL") # LOW, NORMAL, HIGH, CRITICAL, ABNORMAL
    interpretation = Column(Text, nullable=True) # Patient-friendly meaning
    category = Column(String(100), default="General") # Hematology, Biochemistry, Lipid, Renal, Thyroid
    test_date = Column(String(50), nullable=True)
    page_number = Column(Integer, default=1)
    section_name = Column(String(100), default="Laboratory Findings")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    document = relationship("MedicalDocument", back_populates="lab_parameters")


class PrescriptionRecord(Base):
    __tablename__ = "prescriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(String(100), unique=True, index=True, nullable=False)
    patient_id = Column(String(100), ForeignKey("patients.patient_id"), index=True, nullable=False)
    patient_name = Column(String(255), nullable=True)
    doctor_name = Column(String(255), nullable=True)
    hospital_name = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    prescription_date = Column(String(50), nullable=True)
    diagnosis = Column(String(255), nullable=True)
    handwriting_sample = Column(String(255), nullable=True)
    raw_ocr_text = Column(Text, nullable=True)
    ocr_raw_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, default=0.90)
    handwriting_quality = Column(String(50), default="Good") # Good, Medium, Poor, Unclear
    doctor_notes = Column(Text, nullable=True)
    clinical_safety_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="prescriptions")
    medicines = relationship("PrescriptionMedicine", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionMedicine(Base):
    __tablename__ = "prescription_medicines"
    
    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(String(100), ForeignKey("prescriptions.prescription_id"), index=True, nullable=False)
    medicine_name = Column(String(255), index=True, nullable=False)
    normalized_name = Column(String(255), nullable=True) # Normalized RxNorm Name
    generic_name = Column(String(255), nullable=True)
    rxnorm_cui = Column(String(50), nullable=True) # RxNorm Concept Unique Identifier
    dosage_form = Column(String(100), default="Tablet") # Tablet, Capsule, Syrup, Injection, Ointment
    strength = Column(String(100), nullable=True) # 500mg, 10mg, 5ml
    dose = Column(String(100), nullable=True)
    frequency = Column(String(100), default="Once daily") # e.g. 1-0-1, 1-1-1, Once daily after food
    duration = Column(String(100), default="7 days")
    route = Column(String(50), default="Oral") # Oral, Topical, IV
    instructions = Column(Text, default="Take after meals as directed")
    timing_instructions = Column(String(255), default="Take after meals as directed")
    explanation = Column(Text, nullable=True)
    side_effects = Column(Text, nullable=True)
    purpose = Column(Text, nullable=True)
    precautions = Column(Text, nullable=True)
    safety_note = Column(Text, nullable=True)
    confidence = Column(Float, default=0.95)
    match_confidence = Column(Float, default=0.95)
    is_verified = Column(Boolean, default=True)

    # Relationships
    prescription = relationship("PrescriptionRecord", back_populates="medicines")


class PatientDietProfile(Base):
    __tablename__ = "patient_diet_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), ForeignKey("patients.patient_id"), unique=True, index=True, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    activity_level = Column(String(50), default="Moderate")
    medical_conditions = Column(String(500), default="")
    allergies = Column(String(500), default="None reported")
    dietary_preference = Column(String(50), default="Non-Vegetarian") # Vegetarian, Vegan, Non-Vegetarian
    calorie_target = Column(Float, default=2000.0)
    protein_target = Column(Float, default=75.0)
    carbohydrate_target = Column(Float, default=225.0)
    fat_target = Column(Float, default=65.0)
    fiber_target = Column(Float, default=30.0)
    sodium_limit = Column(Float, default=2300.0)
    potassium_limit = Column(Float, nullable=True)
    fluid_limit_ml = Column(Float, nullable=True)
    clinical_guideline_source = Column(String(255), default="NIDDK / NIH Clinical Dietary Guidelines")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="diet_profile")


class DietPlan(Base):
    __tablename__ = "diet_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), ForeignKey("patients.patient_id"), index=True, nullable=False)
    document_id = Column(Integer, nullable=True)
    title = Column(String(255), nullable=False)
    condition_context = Column(String(255), nullable=True)
    daily_calories = Column(Float, default=2000.0)
    daily_targets_json = Column(Text, nullable=True) # Full macronutrient breakdown
    meal_schedule_json = Column(Text, nullable=True) # 5-meal schedule with foods, calories, clinical notes
    breakfast_json = Column(Text, nullable=True)
    mid_morning_json = Column(Text, nullable=True)
    lunch_json = Column(Text, nullable=True)
    snack_json = Column(Text, nullable=True)
    dinner_json = Column(Text, nullable=True)
    foods_to_prefer_json = Column(Text, nullable=True)
    foods_to_avoid_json = Column(Text, nullable=True)
    lifestyle_notes_json = Column(Text, nullable=True)
    safety_disclaimer = Column(Text, nullable=True)
    guidance_source = Column(String(255), default="NIDDK/NIH Nutrition Guidelines & USDA FoodData Central")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("PatientProfile", back_populates="diet_plans")


class FoodItem(Base):
    __tablename__ = "food_items"
    
    id = Column(Integer, primary_key=True, index=True)
    food_id = Column(String(50), unique=True, index=True, nullable=False)
    food_name = Column(String(255), index=True, nullable=False)
    food_category = Column(String(100), index=True, nullable=False)
    serving_size = Column(Float, default=100.0)
    serving_unit = Column(String(50), default="g")
    calories = Column(Float, default=0.0)
    protein_g = Column(Float, default=0.0)
    carbohydrates_g = Column(Float, default=0.0)
    fat_g = Column(Float, default=0.0)
    fiber_g = Column(Float, default=0.0)
    sugar_g = Column(Float, default=0.0)
    sodium_mg = Column(Float, default=0.0)
    potassium_mg = Column(Float, default=0.0)
    calcium_mg = Column(Float, default=0.0)
    iron_mg = Column(Float, default=0.0)
    vitamin_a = Column(String(50), default="0 IU")
    vitamin_c = Column(String(50), default="0 mg")
    vitamin_d = Column(String(50), default="0 IU")
    cholesterol_mg = Column(Float, default=0.0)
    glycemic_index = Column(String(50), default="Low") # Low, Medium, High
    suitability_notes = Column(Text, nullable=True)


class HospitalDirectory(Base):
    __tablename__ = "hospital_directory"
    
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String(50), unique=True, index=True, nullable=False)
    hospital_name = Column(String(255), index=True, nullable=False)
    address = Column(String(500), nullable=True)
    city = Column(String(100), index=True, nullable=True)
    state = Column(String(100), index=True, nullable=True)
    department = Column(String(150), index=True, nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(255), nullable=True)
    rating = Column(Float, default=4.5)
    specialties_json = Column(Text, nullable=True)


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), index=True, nullable=False)
    document_id = Column(Integer, nullable=True)
    title = Column(String(255), default="Document Discussion")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), index=True, nullable=False)
    patient_id = Column(String(100), index=True, nullable=False)
    document_id = Column(Integer, nullable=True)
    role = Column(String(20), nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    intent = Column(String(100), nullable=True) # Report Question, Medicine Question, Diet Question, etc.
    source_type = Column(String(100), nullable=True)
    citations_json = Column(Text, nullable=True) # JSON list of citations [{document, page, section, text}]
    confidence_score = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(100), index=True, nullable=True)
    user_id = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
