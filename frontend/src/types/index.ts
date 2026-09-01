export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  patient_id: string;
  age?: number | null;
  gender?: string | null;
  blood_group?: string | null;
  medical_conditions?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  medical_conditions?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  message?: string;
  user: AuthUser;
}

export interface PatientProfile {
  patient_id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  blood_group: string | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  hospital_name?: string | null;
  primary_doctor?: string | null;
  emergency_contact?: string | null;
  document_count?: number;
  prescription_count?: number;
  documents?: MedicalDocumentSummary[];
  prescriptions?: PrescriptionRecord[];
  diet_profile?: PatientDietProfile | null;
}

export interface PatientDietProfile {
  activity_level: string;
  dietary_preference: string;
  calorie_target: number;
  protein_target: number;
  sodium_limit: number;
}

export interface MedicalDocumentSummary {
  id: number;
  document_name: string;
  document_type: string;
  file_type: string;
  report_date: string;
  hospital_name: string;
  doctor_name: string;
  page_count: number;
  quick_summary?: string;
  detailed_summary?: string;
  ocr_status?: string;
  is_name_mismatch?: boolean;
  patient_name_extracted?: string | null;
  disclaimer_note?: string | null;
}

export interface LabParameter {
  parameter_name: string;
  result_value: string;
  numeric_value?: number | null;
  unit: string;
  reference_range: string;
  min_ref?: number | null;
  max_ref?: number | null;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'ABNORMAL' | 'UNKNOWN';
  interpretation?: string;
  category?: string;
  page_number?: number;
  section_name?: string;
}

export interface MedicalDocumentDetail extends MedicalDocumentSummary {
  patient_id: string;
  findings?: string;
  doctor_observations?: string;
  recommendations?: string;
  lab_parameters: LabParameter[];
}

export interface PrescriptionMedicine {
  medicine_name: string;
  normalized_name?: string;
  generic_name?: string;
  rxnorm_cui?: string;
  medicine_class?: string;
  strength?: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  timing_instructions?: string;
  explanation?: string;
  confidence?: number;
  match_confidence?: number;
  safety_note?: string;
}

export interface PrescriptionRecord {
  prescription_id: string;
  doctor_name: string;
  hospital_name: string;
  department?: string;
  prescription_date: string;
  ocr_confidence: number;
  is_low_confidence?: boolean;
  handwriting_sample?: string;
  safety_note?: string;
  medicines: PrescriptionMedicine[];
}

export interface MealItem {
  meal_name: string;
  items: string[];
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  clinical_notes: string;
}

export interface FoodPreference {
  food: string;
  rationale: string;
}

export interface DietPlanResponse {
  patient_id: string;
  document_id?: number | null;
  title: string;
  condition_context: string;
  guidance_source: string;
  guidance_source_url?: string;
  daily_targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    sodium_limit_mg: number;
    potassium_limit_mg: number;
  };
  meal_schedule: {
    breakfast: MealItem;
    mid_morning: MealItem;
    lunch: MealItem;
    evening_snack: MealItem;
    dinner: MealItem;
  };
  foods_to_prefer: FoodPreference[];
  foods_to_avoid: FoodPreference[];
  lifestyle_notes: string[];
  niddk_clinical_guidelines: string[];
  safety_disclaimer: string;
}

export interface USDAFoodItem {
  food_id: string;
  food_name: string;
  food_category: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_a: string;
  vitamin_c: string;
  vitamin_d: string;
  cholesterol_mg: number;
  glycemic_index: string;
  suitability_notes?: string;
}

export interface HospitalDirectoryItem {
  hospital_id: string;
  hospital_name: string;
  address: string;
  city: string;
  state: string;
  department: string;
  phone: string;
  website: string;
  maps_url?: string;
  rating: number;
  specialties: string[];
  source: string;
}

export interface Citation {
  document_name: string;
  document_id?: number;
  page_number: number;
  section: string;
  text_snippet: string;
}

export interface ChatMessageItem {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  citations?: Citation[];
  confidence_score?: number;
  source_type?: string;
  created_at?: string;
}

export interface ReportComparisonParameter {
  parameter_name: string;
  previous_value: string;
  previous_numeric?: number | null;
  current_value: string;
  current_numeric?: number | null;
  difference: string;
  difference_numeric?: number | null;
  percentage_change: string;
  unit: string;
  reference_range: string;
  current_status: string;
  previous_status: string;
}

export interface ReportComparisonResult {
  current_document: {
    id: number;
    name: string;
    type: string;
    date: string;
  };
  previous_document: {
    id: number;
    name: string;
    type: string;
    date: string;
  };
  summary: string;
  comparisons: ReportComparisonParameter[];
  factual_observations: string[];
  disclaimer: string;
}

export interface ComparisonMatrixItem {
  parameter_name: string;
  category: string;
  unit: string;
  reference_range: string;
  min_ref?: number | null;
  max_ref?: number | null;
  previous_date: string;
  previous_value: number;
  previous_status: string;
  previous_doc: string;
  present_date: string;
  present_value: number;
  present_status: string;
  present_doc: string;
  difference: string;
  difference_num?: number | null;
  percentage_change: string;
  pct_change_num?: number | null;
  trend_status: string;
  interpretation?: string;
}

export interface PatientHealthTrendsResponse {
  patient_id: string;
  available_parameters: string[];
  available_categories: string[];
  total_reports: number;
  earliest_report_date?: string | null;
  latest_report_date?: string | null;
  comparison_matrix: ComparisonMatrixItem[];
  trends: {
    parameter_name: string;
    category: string;
    unit: string;
    min_ref?: number | null;
    max_ref?: number | null;
    reference_range: string;
    data_points: {
      date: string;
      document_id?: number;
      document_name: string;
      value: number;
      result_value?: string;
      unit: string;
      status: string;
      min_ref?: number | null;
      max_ref?: number | null;
      reference_range?: string;
      interpretation?: string;
      is_name_mismatch?: boolean;
      patient_name_extracted?: string | null;
      disclaimer_note?: string | null;
    }[];
  }[];
  disclaimers?: {
    document_id: number;
    document_name: string;
    patient_name_extracted?: string | null;
    disclaimer_note?: string | null;
  }[];
  has_external_reports?: boolean;
}

