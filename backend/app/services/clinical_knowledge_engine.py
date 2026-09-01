import re
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional
from app.core.config import settings

class ClinicalKnowledgeEngine:
    """
    Comprehensive Medical Terminology, Diagnostic Reference, and General Health Intelligence Engine.
    Provides precise clinical reference ranges, highest/lowest critical safe values,
    pathophysiology, etiology, symptom analysis, and typo tolerance.
    """

    # Typo and Synonym Normalization Map
    TYPO_SYNONYMS = {
        # Potassium
        "pottasium": "potassium",
        "potasium": "potassium",
        "pottassium": "potassium",
        "potassiam": "potassium",
        "k+": "potassium",
        "serum potassium": "potassium",
        
        # Sodium
        "sodiam": "sodium",
        "na+": "sodium",
        "serum sodium": "sodium",
        
        # Calcium
        "calciam": "calcium",
        "ca++": "calcium",
        "ca2+": "calcium",
        "serum calcium": "calcium",

        # Magnesium & Phosphorus
        "magnesiam": "magnesium",
        "mg++": "magnesium",
        "phosphorous": "phosphorus",
        "phosphate": "phosphorus",
        "po4": "phosphorus",

        # Chloride & Bicarbonate
        "chlorid": "chloride",
        "cl-": "chloride",
        "bicarb": "bicarbonate",
        "hco3": "bicarbonate",
        "co2": "bicarbonate",

        # Renal
        "creatnine": "creatinine",
        "creatine": "creatinine",
        "creatinin": "creatinine",
        "serum creatinine": "creatinine",
        "bun": "bun",
        "blood urea nitrogen": "bun",
        "urea": "bun",
        "egfr": "egfr",
        "gfr": "egfr",
        "filtration rate": "egfr",
        "uric acid": "uric acid",
        "urate": "uric acid",
        "purine": "uric acid",
        "gout": "uric acid",
        "cystatin": "cystatin c",
        "cystatin c": "cystatin c",

        # Blood & Hematology
        "heamoglobin": "hemoglobin",
        "haemoglobin": "hemoglobin",
        "hb": "hemoglobin",
        "hgb": "hemoglobin",
        "anemia": "hemoglobin",
        "wbc": "wbc",
        "white blood cells": "wbc",
        "white blood cell": "wbc",
        "leukocytes": "wbc",
        "leukocyte": "wbc",
        "rbc": "rbc",
        "red blood cells": "rbc",
        "red blood cell": "rbc",
        "erythrocytes": "rbc",
        "platlets": "platelet",
        "platlet": "platelet",
        "platelets": "platelet",
        "thrombocytes": "platelet",
        "thrombocyte": "platelet",
        "esr": "esr",
        "erythrocyte sedimentation rate": "esr",
        "ferritin": "ferritin",
        "serum iron": "iron",
        "iron": "iron",
        "tibc": "tibc",

        # Glycemic & Endocrine
        "glucose": "glucose",
        "sugar": "glucose",
        "suger": "glucose",
        "blood sugar": "glucose",
        "fasting blood sugar": "glucose",
        "fbs": "glucose",
        "fbg": "glucose",
        "ppbs": "glucose",
        "hba1c": "hba1c",
        "a1c": "hba1c",
        "glycated hemoglobin": "hba1c",
        "insulin": "insulin",
        "c-peptide": "c-peptide",
        "c peptide": "c-peptide",

        # Cardiovascular & Lipids
        "cholestrol": "cholesterol",
        "colesterol": "cholesterol",
        "total cholesterol": "cholesterol",
        "lipid": "cholesterol",
        "lipids": "cholesterol",
        "ldl": "ldl",
        "bad cholesterol": "ldl",
        "hdl": "hdl",
        "good cholesterol": "hdl",
        "triglyceride": "triglycerides",
        "triglycerides": "triglycerides",
        "vldl": "vldl",
        "troponin": "troponin",
        "troponin i": "troponin",
        "troponin t": "troponin",
        "bnp": "bnp",
        "nt-probnp": "bnp",
        "crp": "crp",
        "hs-crp": "crp",

        # Vitals & Physiological
        "bp": "blood pressure",
        "bloodpressure": "blood pressure",
        "presure": "blood pressure",
        "blood pressure": "blood pressure",
        "systolic": "blood pressure",
        "diastolic": "blood pressure",
        "pulse": "heart rate",
        "pulserate": "heart rate",
        "pulse rate": "heart rate",
        "heart rate": "heart rate",
        "heartrate": "heart rate",
        "bpm": "heart rate",
        "spo2": "oxygen saturation",
        "oxygen": "oxygen saturation",
        "oxygen saturation": "oxygen saturation",
        "temperature": "temperature",
        "body temperature": "temperature",
        "fever": "temperature",
        "respiratory rate": "respiratory rate",
        "breathing rate": "respiratory rate",

        # Thyroid
        "thyroid": "tsh",
        "thyriod": "tsh",
        "tsh": "tsh",
        "t3": "t3",
        "t4": "t4",
        "free t3": "t3",
        "free t4": "t4",

        # Vitamins & Liver
        "vit d": "vitamin d",
        "vitamin d": "vitamin d",
        "vitamin d3": "vitamin d",
        "vit b12": "vitamin b12",
        "vitamin b12": "vitamin b12",
        "b12": "vitamin b12",
        "bilirubin": "bilirubin",
        "sgpt": "sgpt",
        "alt": "sgpt",
        "sgot": "sgot",
        "ast": "sgot",
        "alp": "alp",
        "alkaline phosphatase": "alp",
        "ggt": "ggt",
        "albumin": "albumin",
        "globulin": "globulin",
        "protein": "urine protein",
        "urine protein": "urine protein",
        "proteinuria": "urine protein"
    }

    # Deep Medical Knowledge Base
    KNOWLEDGE_BASE = {
        "potassium": {
            "title": "Serum Potassium (K⁺ Electrolyte)",
            "unit": "mEq/L (or mmol/L)",
            "definition": "Potassium is the predominant intracellular mineral and electrolyte in the human body (accounting for ~98% of intracellular fluid). It is indispensable for maintaining the resting electrical membrane potential across cardiac myocytes, conducting neural signals, and regulating muscular contraction and arterial blood pressure.",
            "reference": "Standard Normal Range: 3.5 – 5.0 mEq/L (or mmol/L)",
            "highest_safe_value": "5.0 – 5.2 mEq/L (Normal Physiological Upper Limit)",
            "mild_high": "5.1 – 5.9 mEq/L (Mild to Moderate Hyperkalemia)",
            "critical_high": "≥ 6.0 – 6.5 mEq/L (Severe / Life-Threatening Hyperkalemia)",
            "critical_high_explanation": (
                "A potassium value at or above **6.0 to 6.5 mEq/L** is an acute medical emergency. "
                "Severely elevated potassium alters myocardial electrophysiology, causing tall peaked T-waves, PR interval prolongation, QRS widening, sine-wave progression, ventricular tachycardia or fibrillation, and fatal cardiac asystole (cardiac arrest). "
                "Emergency hospital management requires intravenous Calcium Gluconate (for cardiac membrane stabilization), Insulin with Dextrose (to drive potassium intracellularly), nebulized Beta-2 agonists, oral potassium binders (Sodium Polystyrene Sulfonate, Patiromer), or emergency Hemodialysis."
            ),
            "lowest_safe_value": "3.5 mEq/L",
            "critical_low": "< 2.5 mEq/L (Severe Hypokalemia)",
            "critical_low_explanation": (
                "A potassium level below **2.5 mEq/L** causes life-threatening ventricular arrhythmias (flattened T-waves, U-waves, Torsades de Pointes), ascending muscle paralysis, hypoventilation due to diaphragmatic weakness, and paralytic ileus. Urgent IV/oral potassium replacement is indicated."
            ),
            "causes_high": "Chronic Kidney Disease (CKD / reduced eGFR), acute renal failure, ACE inhibitors (Enalapril, Lisinopril), ARBs (Losartan, Telmisartan), potassium-sparing diuretics (Spironolactone), potassium-rich salt substitutes, excessive dietary potassium (coconut water, bananas, dried fruits), metabolic acidosis, or cell damage (rhabdomyolysis, hemolysis).",
            "causes_low": "Potassium-wasting loop or thiazide diuretics (Furosemide, Hydrochlorothiazide), chronic diarrhea, vomiting, primary hyperaldosteronism, excess licorice ingestion, or inadequate nutritional intake.",
            "symptoms": "Muscle fatigue, general weakness, numbness/tingling (paresthesia), palpitations, irregular pulse, nausea, or shortness of breath. Mild hyperkalemia can also be completely silent until sudden cardiac disturbances arise.",
            "clinical_action": "For values 5.1–5.5 mEq/L: restrict high-potassium foods (< 2,000 mg/day), avoid potassium chloride salt substitutes, hydrate well, and review medications with your nephrologist. For values ≥ 6.0 mEq/L: seek immediate emergency medical care."
        },
        "sodium": {
            "title": "Serum Sodium (Na⁺ Electrolyte)",
            "unit": "mEq/L (or mmol/L)",
            "definition": "Sodium is the major extracellular cation responsible for regulating total body extracellular volume, osmotic equilibrium, systemic water balance, and transmitting neural impulses.",
            "reference": "Standard Normal Range: 135 – 145 mEq/L",
            "highest_safe_value": "145 mEq/L",
            "mild_high": "146 – 155 mEq/L (Hypernatremia)",
            "critical_high": "≥ 160 mEq/L (Severe Hypernatremia — risk of brain cell shrinkage, vascular rupture, and intracranial hemorrhage)",
            "lowest_safe_value": "135 mEq/L",
            "critical_low": "< 120 mEq/L (Severe Hyponatremia — causes cerebral edema, seizures, coma, and herniation)",
            "causes_high": "Severe dehydration, unreplaced fluid loss (sweating, osmotic diuresis), diabetes insipidus, or excessive salt intake.",
            "causes_low": "Heart failure, cirrhosis, nephrotic syndrome, SIADH (Syndrome of Inappropriate ADH), thiazide diuretics, or excessive plain water consumption.",
            "symptoms": "Confusion, headache, nausea, lethargy, muscle cramps, restlessness, and in severe cases seizures.",
            "clinical_action": "Gradual fluid and electrolyte correction under medical supervision. Rapid correction of chronic sodium disturbances must be avoided to prevent osmotic demyelination or cerebral edema."
        },
        "calcium": {
            "title": "Serum Calcium (Total Calcium / Ca²⁺)",
            "unit": "mg/dL",
            "definition": "Calcium is essential for bone mineralization, skeletal and cardiac muscle contraction, neuromuscular transmission, and enzymatic blood coagulation cascades.",
            "reference": "Standard Normal Range: 8.5 – 10.5 mg/dL (Ionized Calcium: 4.6 – 5.3 mg/dL)",
            "highest_safe_value": "10.5 mg/dL",
            "critical_high": "≥ 13.0 – 14.0 mg/dL (Hypercalcemic Crisis — risks cardiac arrhythmias, renal failure, and coma)",
            "lowest_safe_value": "8.5 mg/dL",
            "critical_low": "< 6.5 mg/dL (Severe Hypocalcemia — risks tetany, laryngospasm, seizures, and QT prolongation)",
            "causes_high": "Primary hyperparathyroidism, malignancy (bone metastases, PTHrP secretion), excess Vitamin D, or prolonged immobilization.",
            "causes_low": "Hypoparathyroidism, Vitamin D deficiency, chronic renal failure (impaired 1,25-OH Vitamin D conversion), pancreatitis, or severe hypoalbuminemia.",
            "symptoms": "Hypercalcemia: 'Bones, stones, groans, and psychiatric moans' (bone pain, kidney stones, constipation, confusion). Hypocalcemia: Chvostek's sign, Trousseau's sign, perioral numbness, and muscle cramps.",
            "clinical_action": "Correct for serum albumin level: Corrected Calcium = Total Calcium + 0.8 × (4.0 - Serum Albumin). Consult physician for parathyroid and Vitamin D workup."
        },
        "creatinine": {
            "title": "Serum Creatinine & Renal Clearance",
            "unit": "mg/dL",
            "definition": "Creatinine is a standard waste byproduct produced from steady-state muscle creatine breakdown. Healthy kidneys filter almost 100% of creatinine through glomerular capillaries into urine.",
            "reference": "Men: 0.7 – 1.3 mg/dL | Women: 0.5 – 1.1 mg/dL",
            "highest_safe_value": "1.2 – 1.3 mg/dL",
            "critical_high": "≥ 4.0 – 5.0 mg/dL (Severe Renal Dysfunction / Uremic Syndrome risk)",
            "lowest_safe_value": "0.5 mg/dL (Low values usually reflect low muscle mass or severe liver disease)",
            "critical_low": "< 0.3 mg/dL",
            "causes_high": "Chronic Kidney Disease (CKD), acute tubular necrosis, dehydration (prerenal azotemia), urinary tract obstruction (kidney stones, BPH), glomerulonephritis, or nephrotoxic medications (NSAIDs, aminoglycosides, IV contrast).",
            "symptoms": "Often asymptomatic in early stages; advanced elevation causes peripheral edema, fatigue, nausea, foamy urine, decreased urine output, and pruritus (itching).",
            "clinical_action": "Calculate eGFR. Maintain hydration, control systolic blood pressure (< 120 mmHg), manage blood glucose, and avoid nephrotoxic drugs like chronic ibuprofen."
        },
        "egfr": {
            "title": "Estimated Glomerular Filtration Rate (eGFR)",
            "unit": "mL/min/1.73 m²",
            "definition": "eGFR calculates the volumetric rate at which kidney nephrons filter blood per minute, standardized to body surface area using serum creatinine, age, and gender.",
            "reference": "Stage 1 (Normal/Optimal): ≥ 90 mL/min/1.73m² | Stage 2 (Mild Reduction): 60 – 89 | Stage 3a/b (Moderate): 30 – 59 | Stage 4 (Severe): 15 – 29 | Stage 5 (Kidney Failure): < 15",
            "highest_safe_value": "Normal: 90 – 120 mL/min/1.73m²",
            "critical_low": "< 15 mL/min/1.73m² (End-Stage Renal Disease requiring preparation for dialysis or kidney transplantation)",
            "causes_high": "Pregnancy, early diabetic hyperfiltration.",
            "causes_low": "Diabetic nephropathy, hypertensive nephrosclerosis, glomerulonephritis, polycystic kidney disease, or chronic vascular disease.",
            "symptoms": "Fatigue, fluid retention, high blood pressure, anemia, electrolyte disturbances.",
            "clinical_action": "Follow clinical nephrology protocols: blood pressure control with ACEi/ARBs/SGLT2 inhibitors, dietary protein and sodium restriction, and regular monitoring."
        },
        "bun": {
            "title": "Blood Urea Nitrogen (BUN)",
            "unit": "mg/dL",
            "definition": "BUN measures the amount of nitrogen in blood that comes from the metabolic waste product urea, synthesized by the liver from protein breakdown and excreted by the kidneys.",
            "reference": "Standard Normal Range: 7 – 20 mg/dL",
            "highest_safe_value": "20 mg/dL",
            "critical_high": "≥ 60 – 80 mg/dL (Uremic toxicity risk)",
            "causes_high": "Kidney failure, high dietary protein intake, upper GI bleeding, severe dehydration, or congestive heart failure.",
            "causes_low": "Low protein diet, malnutrition, severe liver disease, or overhydration."
        },
        "glucose": {
            "title": "Fasting Blood Glucose (FBG)",
            "unit": "mg/dL",
            "definition": "Fasting blood glucose measures circulating sugar levels following an 8 to 10 hour overnight fast, reflecting baseline hepatic gluconeogenesis and peripheral insulin sensitivity.",
            "reference": "Normal: 70 – 99 mg/dL | Prediabetes (Impaired Fasting Glucose): 100 – 125 mg/dL | Diabetes: ≥ 126 mg/dL",
            "highest_safe_value": "99 mg/dL (Fasting) / < 140 mg/dL (Postprandial 2h)",
            "critical_high": "≥ 300 – 400 mg/dL (Risk of Diabetic Ketoacidosis [DKA] or Hyperosmolar Hyperglycemic State [HHS])",
            "lowest_safe_value": "70 mg/dL",
            "critical_low": "< 50 – 54 mg/dL (Severe Hypoglycemia — risk of neuroglycopenia, seizures, and loss of consciousness)",
            "causes_high": "Type 1 or Type 2 Diabetes, insulin resistance, pancreatitis, corticosteroid therapy, chronic stress, or high-glycemic diet.",
            "causes_low": "Insulin overdose, sulfonylureas, prolonged fasting, insulinoma, or heavy alcohol consumption on an empty stomach.",
            "symptoms": "High: Polyuria (frequent urination), polydipsia (excess thirst), fatigue, blurred vision. Low: Shakiness, sweating, palpitations, confusion, hunger, anxiety.",
            "clinical_action": "Follow the 'Rule of 15' for hypoglycemia (15g fast-acting sugar, recheck in 15 mins). For chronic hyperglycemia: adopt a low-GI Mediterranean/NIDDK diet, exercise, and take prescribed medications."
        },
        "hba1c": {
            "title": "Hemoglobin A1c (HbA1c / Glycated Hemoglobin)",
            "unit": "%",
            "definition": "HbA1c reflects your 3-month average circulating blood glucose by measuring the percentage of red blood cell hemoglobin chemically bonded to glucose.",
            "reference": "Normal: < 5.7% | Prediabetes: 5.7% – 6.4% | Diabetes: ≥ 6.5% (Target for most adults with diabetes is < 7.0%)",
            "highest_safe_value": "< 5.7% (Non-diabetic) / < 7.0% (Diabetic target)",
            "critical_high": "≥ 10.0 – 12.0% (Severe persistent hyperglycemia with accelerated microvascular/macrovascular damage)",
            "clinical_action": "Every 1% reduction in HbA1c lowers microvascular complication risks (retinopathy, nephropathy, neuropathy) by up to 35%."
        },
        "hemoglobin": {
            "title": "Hemoglobin (Hb)",
            "unit": "g/dL",
            "definition": "Hemoglobin is the iron-containing metalloprotein packaged within erythrocytes that binds oxygen in pulmonary capillaries and transports it to all living tissues.",
            "reference": "Adult Men: 13.5 – 17.5 g/dL | Adult Women: 12.0 – 15.5 g/dL",
            "highest_safe_value": "17.5 g/dL (Men) / 15.5 g/dL (Women)",
            "critical_high": "> 20.0 g/dL (Polycythemia Vera / Hyperviscosity syndrome — risk of thrombosis and stroke)",
            "lowest_safe_value": "13.5 g/dL (Men) / 12.0 g/dL (Women)",
            "critical_low": "< 7.0 g/dL (Severe Anemia — often requires packed red blood cell transfusion)",
            "causes_high": "Chronic hypoxia (COPD, smoking, high altitude), dehydration (hemoconcentration), or polycythemia vera.",
            "causes_low": "Iron deficiency, Vitamin B12/Folate deficiency, chronic blood loss, CKD (decreased erythropoietin), bone marrow disorders, or hemolytic anemia.",
            "symptoms": "Low: Fatigue, pallor, shortness of breath on exertion, dizziness, cold extremities, brittle nails.",
            "clinical_action": "Evaluate CBC, Ferritin, Serum Iron, TIBC, and Vitamin B12. Consume iron-rich foods paired with Vitamin C."
        },
        "platelet": {
            "title": "Platelet Count (Thrombocytes)",
            "unit": "/µL (or ×10⁹/L)",
            "definition": "Platelets are disc-shaped non-nucleated cell fragments produced by megakaryocytes in bone marrow that aggregate at endothelial injury sites to stop bleeding.",
            "reference": "Standard Normal Range: 150,000 – 450,000 /µL",
            "highest_safe_value": "450,000 /µL",
            "critical_high": "> 1,000,000 /µL (Extreme Thrombocytosis — risk of paradoxical bleeding or thrombosis)",
            "lowest_safe_value": "150,000 /µL",
            "critical_low": "< 20,000 /µL (Severe Thrombocytopenia — high risk of spontaneous life-threatening internal or intracranial hemorrhage)",
            "causes_high": "Reactive thrombocytosis (infection, iron deficiency, post-splenectomy) or essential thrombocythemia.",
            "causes_low": "ITP (Immune thrombocytopenic purpura), viral infections (Dengue, HIV, Hepatitis), liver cirrhosis (splenic sequestration), medication-induced, or leukemia."
        },
        "wbc": {
            "title": "Total White Blood Cell Count (WBC / Leukocytes)",
            "unit": "cells/µL (or /mm³)",
            "definition": "WBCs represent the primary cellular defense system against infections, pathogens, and tissue necrosis.",
            "reference": "Standard Normal Range: 4,000 – 11,000 cells/µL",
            "highest_safe_value": "11,000 cells/µL",
            "critical_high": "> 30,000 – 50,000 cells/µL (Leukemoid reaction vs Acute Leukemia)",
            "lowest_safe_value": "4,000 cells/µL",
            "critical_low": "< 1,500 – 2,000 cells/µL (Severe Leukopenia / Neutropenia — high risk of fatal opportunistic infections)"
        },
        "uric acid": {
            "title": "Serum Uric Acid",
            "unit": "mg/dL",
            "definition": "Uric acid is the end metabolic byproduct of purine nucleotide degradation. Excess levels precipitate as needle-shaped monosodium urate crystals in joints and renal tubules.",
            "reference": "Men: 3.5 – 7.2 mg/dL | Women: 2.6 – 6.0 mg/dL",
            "highest_safe_value": "7.0 – 7.2 mg/dL (Target in gout patients is < 6.0 mg/dL)",
            "critical_high": "> 12.0 – 13.0 mg/dL (High risk of acute gouty arthritis and urate nephropathy)",
            "causes_high": "High purine diet (red meat, seafood, beer), impaired renal clearance, metabolic syndrome, tumor lysis, or diuretics.",
            "symptoms": "Severe acute joint pain, redness, swelling (typically in the big toe — podagra), joint warmth, or kidney stones.",
            "clinical_action": "Drink 2.5–3 liters of water daily, reduce high-purine foods, limit alcohol/fructose, and discuss allopurinol/febuxostat with a physician."
        },
        "blood pressure": {
            "title": "Blood Pressure (Systolic & Diastolic)",
            "unit": "mmHg",
            "definition": "Blood pressure measures the hydrostatic pressure exerted by circulating blood on arterial vessel walls during cardiac contraction (systole) and relaxation (diastole).",
            "reference": "Normal: < 120 / < 80 mmHg | Elevated: 120–129 / < 80 | Stage 1 Hypertension: 130–139 / 80–89 | Stage 2 Hypertension: ≥ 140 / ≥ 90",
            "highest_safe_value": "< 120/80 mmHg",
            "critical_high": "≥ 180 / ≥ 120 mmHg (Hypertensive Crisis / Emergency — immediate risk of stroke, myocardial infarction, aortic dissection, or acute pulmonary edema)",
            "lowest_safe_value": "90/60 mmHg (Hypotension)",
            "critical_low": "< 80/50 mmHg (Shock / circulatory collapse)",
            "clinical_action": "For Hypertensive Crisis (≥ 180/120 with headache, chest pain, vision changes): seek emergency emergency room care immediately."
        },
        "heart rate": {
            "title": "Heart Rate & Resting Pulse Rate",
            "unit": "beats per minute (bpm)",
            "definition": "Heart rate quantifies the number of times your heart contracts and pumps blood per minute.",
            "reference": "Normal Resting Range for Adults: 60 – 100 bpm",
            "highest_safe_value": "100 bpm (at rest)",
            "critical_high": "> 150 – 160 bpm at rest (SVT, Ventricular Tachycardia, AFib with rapid ventricular response)",
            "lowest_safe_value": "60 bpm (Athletes may naturally rest at 45–55 bpm)",
            "critical_low": "< 40 bpm (Severe Bradycardia / Complete Heart Block causing syncope and hypoperfusion)"
        },
        "oxygen saturation": {
            "title": "Blood Oxygen Saturation (SpO₂)",
            "unit": "%",
            "definition": "SpO₂ measures the percentage of oxygen-saturated hemoglobin relative to total hemoglobin in arterial blood.",
            "reference": "Normal Range: 95% – 100%",
            "highest_safe_value": "100%",
            "critical_low": "< 90% (Hypoxemia requiring supplemental oxygen) / < 85% (Severe Respiratory Failure)",
            "clinical_action": "Values persistently below 92% at rest require prompt clinical evaluation."
        },
        "cholesterol": {
            "title": "Total Cholesterol & Lipid Profile",
            "unit": "mg/dL",
            "definition": "Total cholesterol measures all circulating cholesterol (LDL + HDL + 20% of Triglycerides) in serum.",
            "reference": "Desirable: < 200 mg/dL | Borderline High: 200 – 239 mg/dL | High: ≥ 240 mg/dL",
            "highest_safe_value": "< 200 mg/dL",
            "critical_high": "≥ 300 mg/dL (Severe Hypercholesterolemia / Familial Hypercholesterolemia risk)"
        },
        "ldl": {
            "title": "LDL Cholesterol ('Bad' Cholesterol)",
            "unit": "mg/dL",
            "definition": "LDL carries cholesterol to peripheral vascular walls where oxidized particles drive atheroma plaque formation.",
            "reference": "Optimal: < 100 mg/dL | Near Optimal: 100 – 129 | Borderline High: 130 – 159 | High: 160 – 189 | Very High: ≥ 190 mg/dL",
            "highest_safe_value": "< 100 mg/dL (For high-risk cardiovascular patients, target is < 70 or < 55 mg/dL)",
            "critical_high": "≥ 190 mg/dL"
        },
        "hdl": {
            "title": "HDL Cholesterol ('Good' Cholesterol)",
            "unit": "mg/dL",
            "definition": "HDL extracts excess cholesterol from arterial tissues and transports it back to the liver for metabolic elimination.",
            "reference": "Optimal: > 50 mg/dL for women, > 40 mg/dL for men | Low (Risk factor): < 40 mg/dL",
            "highest_safe_value": "> 50 – 60 mg/dL (Cardioprotective)"
        },
        "triglycerides": {
            "title": "Serum Triglycerides",
            "unit": "mg/dL",
            "definition": "Triglycerides are the chemical form of stored energy derived from unburned calories and sugars.",
            "reference": "Normal: < 150 mg/dL | Borderline High: 150 – 199 | High: 200 – 499 | Very High: ≥ 500 mg/dL",
            "highest_safe_value": "< 150 mg/dL",
            "critical_high": "≥ 500 – 1000 mg/dL (Severe Hypertriglyceridemia — direct trigger for acute pancreatitis)"
        },
        "tsh": {
            "title": "Thyroid Stimulating Hormone (TSH)",
            "unit": "mIU/L (or µIU/mL)",
            "definition": "TSH is secreted by the anterior pituitary gland to regulate thyroid gland synthesis of thyroxine (T4) and triiodothyronine (T3).",
            "reference": "Standard Normal Range: 0.45 – 4.50 mIU/L",
            "highest_safe_value": "4.50 mIU/L",
            "critical_high": "> 10.0 mIU/L (Overt Hypothyroidism)",
            "lowest_safe_value": "0.45 mIU/L",
            "critical_low": "< 0.10 mIU/L (Overt Hyperthyroidism / Thyrotoxicosis)"
        },
        "vitamin d": {
            "title": "25-Hydroxy Vitamin D [25(OH)D]",
            "unit": "ng/mL",
            "definition": "Vitamin D is a secosteroid hormone vital for intestinal calcium absorption, immune modulation, bone density, and muscle strength.",
            "reference": "Deficiency: < 20 ng/mL | Insufficiency: 20 – 29 ng/mL | Sufficiency / Optimal: 30 – 100 ng/mL",
            "highest_safe_value": "100 ng/mL",
            "critical_high": "> 100 – 150 ng/mL (Vitamin D Toxicity / Hypercalcemia risk)",
            "critical_low": "< 10 ng/mL (Severe Deficiency — risk of osteomalacia and rickets)"
        },
        "vitamin b12": {
            "title": "Serum Vitamin B12 (Cobalamin)",
            "unit": "pg/mL",
            "definition": "Vitamin B12 is essential for DNA synthesis, red blood cell maturation, and neural myelin sheath maintenance.",
            "reference": "Standard Normal Range: 200 – 900 pg/mL (Borderline: 200 – 300 pg/mL)",
            "lowest_safe_value": "200 – 300 pg/mL",
            "critical_low": "< 150 pg/mL (Severe deficiency causing megaloblastic anemia and irreversible peripheral neuropathy)"
        },
        "bilirubin": {
            "title": "Serum Total & Direct Bilirubin",
            "unit": "mg/dL",
            "definition": "Bilirubin is the orange-yellow breakdown pigment of hemoglobin conjugated by hepatocytes in the liver.",
            "reference": "Total Bilirubin: 0.2 – 1.2 mg/dL | Direct (Conjugated): 0.0 – 0.3 mg/dL",
            "highest_safe_value": "1.2 mg/dL",
            "critical_high": "≥ 2.5 – 3.0 mg/dL (Produces clinical scleral icterus / jaundice) / ≥ 15–20 mg/dL (Severe hepatic/biliary crisis)"
        },
        "sgpt": {
            "title": "SGPT / ALT (Alanine Aminotransferase)",
            "unit": "U/L",
            "definition": "ALT is an enzyme localized primarily within liver hepatocytes. When liver cells are injured, ALT rapidly leaks into blood.",
            "reference": "Standard Normal Range: 7 – 56 U/L",
            "highest_safe_value": "56 U/L",
            "critical_high": "≥ 500 – 1,000+ U/L (Acute viral hepatitis, toxic liver necrosis, or ischemic hepatitis)"
        },
        "sgot": {
            "title": "SGOT / AST (Aspartate Aminotransferase)",
            "unit": "U/L",
            "definition": "AST is an enzyme present in the liver, heart muscle, skeletal muscle, and kidneys.",
            "reference": "Standard Normal Range: 10 – 40 U/L",
            "highest_safe_value": "40 U/L",
            "critical_high": "≥ 500 – 1,000+ U/L"
        }
    }

    @classmethod
    def normalize_term(cls, query: str) -> Optional[str]:
        q_l = query.lower()
        
        # 1. Exact match in typo dictionary
        for typo, canonical in cls.TYPO_SYNONYMS.items():
            pattern = r"\b" + re.escape(typo) + r"\b"
            if re.search(pattern, q_l):
                return canonical

        # 2. Substring match in typo dictionary
        for typo, canonical in cls.TYPO_SYNONYMS.items():
            if typo in q_l and len(typo) >= 4:
                return canonical

        # 3. Direct match in knowledge base
        for key in cls.KNOWLEDGE_BASE:
            if key in q_l:
                return key

        return None

    MEDICAL_DOMAINS = [
        # Anatomy & Organ systems
        "kidney", "kidneys", "renal", "nephro", "nephron", "heart", "cardiac", "cardio", "liver", "hepatic",
        "lung", "lungs", "pulmonary", "respiratory", "brain", "neuro", "stomach", "gastric", "gut", "intestinal",
        "pancreas", "pancreatic", "spleen", "thyroid", "adrenal", "bladder", "prostate", "artery", "arteries",
        "vein", "veins", "vascular", "blood", "vessel", "vessels", "cell", "cells", "joint", "joints", "bone",
        "bones", "muscle", "muscles", "nerve", "nerves", "eye", "eyes", "throat", "chest", "abdomen", "abdominal",
        "spine", "skin", "immune", "immunity", "body", "human", "organ", "organs",

        # Diseases & Pathology
        "diabetes", "diabetic", "prediabetes", "hypertension", "hypotension", "blood pressure", "bp", "ckd",
        "kidney disease", "kidney failure", "renal failure", "nephropathy", "dialysis", "gout", "anemia", "anemic",
        "infection", "infectious", "virus", "viral", "bacteria", "bacterial", "fever", "inflammation", "inflammatory",
        "hyperkalemia", "hypokalemia", "hyponatremia", "hypernatremia", "hypercalcemia", "hypocalcemia", "acidosis",
        "alkalosis", "jaundice", "fatty liver", "cirrhosis", "hepatitis", "heart attack", "myocardial infarction",
        "angina", "arrhythmia", "stroke", "ischemia", "asthma", "copd", "pneumonia", "bronchitis", "cancer", "tumor",
        "allergy", "allergic", "headache", "migraine", "pain", "swelling", "edema", "nausea", "vomiting", "diarrhea",
        "constipation", "fatigue", "dizziness", "shortness of breath", "dyspnea", "palpitation", "palpitations", "cough",
        "cold", "flu", "syndrome", "disorder", "disease", "illness", "condition", "pathology", "deficiency",

        # Diagnostics & Reports
        "report", "reports", "document", "documents", "test", "tests", "result", "results", "lab", "labs",
        "checkup", "investigation", "investigations", "scan", "scans", "mri", "ct scan", "x-ray", "ultrasound",
        "ecg", "ekg", "biopsy", "cbc", "lft", "kft", "rft", "bmp", "cmp", "panel", "profile",

        # Healthcare Providers & Facilities
        "doctor", "doctors", "physician", "physicians", "specialist", "specialists", "cardiologist", "nephrologist",
        "endocrinologist", "hospital", "hospitals", "clinic", "clinics", "appointment", "prescription", "prescriptions",
        "medicine", "medicines", "drug", "drugs", "medication", "medications", "tablet", "tablets", "pill", "pills",
        "capsule", "capsules", "dosage", "dose", "side effect", "side effects", "therapy", "treatment", "cure",
        "surgery", "diagnose", "diagnosis", "diagnostic", "prognosis",

        # Diet, Nutrition & Lifestyle
        "diet", "deit", "diat", "nutrition", "nutritional", "food", "foods", "meal", "meals", "eat", "eating",
        "calorie", "calories", "kcal", "protein", "carbohydrate", "carbohydrates", "carbs", "fat", "fats", "sodium",
        "salt", "hydration", "water intake", "exercise", "walking", "fasting", "supplement", "supplements",

        # Biomarkers & Units
        "potassium", "sodium", "calcium", "magnesium", "phosphorus", "chloride", "bicarbonate", "creatinine",
        "bun", "egfr", "gfr", "urea", "uric acid", "urate", "cystatin", "hemoglobin", "hb", "hgb", "rbc", "wbc",
        "platelet", "platelets", "leukocyte", "erythrocyte", "esr", "crp", "ferritin", "iron", "tibc", "troponin",
        "bnp", "d-dimer", "glucose", "sugar", "fbg", "fbs", "ppbs", "hba1c", "a1c", "insulin", "c-peptide",
        "cholesterol", "lipid", "lipids", "ldl", "hdl", "triglyceride", "triglycerides", "vldl", "tsh", "t3", "t4",
        "vitamin", "vit d", "vit b12", "bilirubin", "sgpt", "alt", "sgot", "ast", "alp", "ggt", "albumin", "globulin",
        "protein", "proteinuria", "hematuria", "urinalysis", "urine", "stool", "mg/dl", "meq/l", "mmol/l", "g/dl",
        "bpm", "mmhg", "spo2", "reference range", "normal range", "highest value", "lowest value", "critical limit",
        "vital signs", "pulse rate", "heart rate", "body temperature", "health", "medical", "clinical", "patient", "wellness"
    ]

    @classmethod
    def is_medical_query(cls, query: str) -> bool:
        """
        Determines whether a user's query is within the medical/health/clinical domain.
        Returns False for general non-medical queries (coding, trivia, entertainment, etc.).
        """
        q_l = query.lower().strip()
        
        # Check normalized typo terms
        if cls.normalize_term(q_l):
            return True
            
        # Check medical domain terms
        for term in cls.MEDICAL_DOMAINS:
            if " " in term:
                if term in q_l:
                    return True
            else:
                pattern = r"\b" + re.escape(term) + r"\b"
                if re.search(pattern, q_l):
                    return True
                    
        return False

    @classmethod
    def call_gemini_api(cls, user_question: str, system_context: str = "") -> Optional[str]:
        """
        Calls Google Gemini API via HTTPS REST when GEMINI_API_KEY is available.
        """
        api_key = settings.GEMINI_API_KEY.strip()
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        prompt_text = (
            f"You are MediAssist AI, an expert, evidence-based, compassionate clinical health assistant.\n"
            f"Context: {system_context}\n\n"
            f"Question: {user_question}\n\n"
            f"Instructions:\n"
            f"1. Provide a comprehensive, accurate, and easy-to-understand medical explanation.\n"
            f"2. State standard clinical reference ranges, highest safe limits, and critical dangerous thresholds explicitly if asked.\n"
            f"3. Explain biological mechanisms, causes, and clinical next steps.\n"
            f"4. Format in rich Markdown with clean sections, bullet points, and bold highlights.\n"
            f"5. End with a helpful tip and clinical safety reminder."
        )

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt_text}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024
            }
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as res:
                if res.status == 200:
                    resp_json = json.loads(res.read().decode("utf-8"))
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            return text
        except Exception as e:
            print(f"Gemini API call notice: {e}")

        return None

    @classmethod
    def answer_medical_question(
        cls,
        question: str,
        patient_id: str,
        patient_name: str,
        patient_labs: List[Any],
        patient_docs: List[Any]
    ) -> Dict[str, Any]:
        """
        Generates a rich, highly accurate medical response for any general or parameter-specific query.
        """
        q_l = question.lower().strip()
        canonical_key = cls.normalize_term(q_l)

        # Check if question is asking about specific aspects
        is_highest_query = any(w in q_l for w in ["highest", "maximum", "max", "upper limit", "upper bound", "highest value", "highest level", "how high", "too high"])
        is_lowest_query = any(w in q_l for w in ["lowest", "minimum", "min", "lower limit", "lower bound", "lowest value", "deficiency", "how low", "too low"])
        is_cause_query = any(w in q_l for w in ["cause", "causes", "why is", "why high", "why low", "reason", "reasons", "leads to"])
        is_symptom_query = any(w in q_l for w in ["symptom", "symptoms", "signs", "how do i feel", "feel like", "what happens"])
        is_treatment_query = any(w in q_l for w in ["reduce", "lower", "increase", "treat", "treatment", "manage", "diet", "food", "cure"])

        # Try Gemini API if key is present
        gemini_response = cls.call_gemini_api(question, f"Patient: {patient_name} (ID: {patient_id})")
        if gemini_response:
            return {
                "role": "assistant",
                "content": gemini_response,
                "intent": "GENERAL_TERMINOLOGY",
                "citations": [],
                "confidence_score": 0.98,
                "source_type": "Gemini Clinical AI & Medical Knowledge"
            }

        # If matching canonical entry found in our deep clinical database
        if canonical_key and canonical_key in cls.KNOWLEDGE_BASE:
            data = cls.KNOWLEDGE_BASE[canonical_key]
            
            # Check if patient has recorded lab values for this parameter
            patient_matches = []
            for l in patient_labs:
                p_name = l.parameter_name.lower()
                if (canonical_key in p_name) or (canonical_key == "creatinine" and "creatinine" in p_name) or (canonical_key == "potassium" and "potassium" in p_name):
                    patient_matches.append(l)

            # Build patient recorded section
            patient_record_text = ""
            citations = []
            if patient_matches:
                patient_matches.sort(key=lambda x: (x.test_date or "", x.document_id))
                latest_l = patient_matches[-1]
                u_str = (latest_l.unit or data.get('unit', '')).strip()
                r_val_str = str(latest_l.result_value).strip()
                if u_str and not r_val_str.endswith(u_str):
                    p_val = f"{r_val_str} {u_str}"
                else:
                    p_val = r_val_str
                status_str = f"`[{latest_l.status}]`" if latest_l.status else ""
                
                doc_name = "Your Uploaded Report"
                for d in patient_docs:
                    if d.id == latest_l.document_id:
                        doc_name = d.document_name
                        break

                patient_record_text = (
                    f"### 🧪 Your Recorded Report Value: {latest_l.parameter_name}\n\n"
                    f"• **Most Recent Result ({doc_name}, {latest_l.test_date or 'Recent'}):** **{p_val}** {status_str} (Reference Range: {latest_l.reference_range or data['reference']})\n"
                    f"• **Clinical Status:** {latest_l.interpretation or 'Recorded during diagnostic evaluation.'}\n\n"
                    f"---\n\n"
                )
                citations.append({
                    "document_name": doc_name,
                    "document_id": latest_l.document_id,
                    "page_number": 1,
                    "section": "Laboratory Results",
                    "text_snippet": f"{latest_l.parameter_name}: {p_val} (Ref: {latest_l.reference_range})"
                })

            # Custom response for HIGHEST VALUE / UPPER LIMIT query
            if is_highest_query:
                content = (
                    f"{patient_record_text}"
                    f"### 🩸 Highest Values & Critical Thresholds: {data['title']}\n\n"
                    f"Here are the exact standard physiological limits and dangerous emergency thresholds for **{data['title']}**:\n\n"
                    f"| Clinical Level | Measured Value ({data.get('unit', '')}) | Physiological State & Risk |\n"
                    f"| :--- | :--- | :--- |\n"
                    f"| **Normal Upper Bound** | **{data.get('highest_safe_value', 'Standard Upper Limit')}** | Optimal physiological function & balance |\n"
                    f"| **Mild to Moderate Elevation** | **{data.get('mild_high', 'Above Reference')}** | Early metabolic/renal strain; monitoring required |\n"
                    f"| **Critical / Dangerous Threshold** | **{data.get('critical_high', 'Severely Elevated')}** | 🚨 **Severe Medical Emergency** |\n\n"
                    f"**Why Exceeding the Highest Safe Value is Dangerous:**\n"
                    f"{data.get('critical_high_explanation', data.get('definition', ''))}\n\n"
                    f"**Common Causes of High Levels:**\n"
                    f"• {data.get('causes_high', 'Renal impairment, dietary excess, or medication side effects.')}\n\n"
                    f"**Symptoms of Elevated Levels:**\n"
                    f"• {data.get('symptoms', 'Weakness, fatigue, palpitations, nausea, or numbness.')}\n\n"
                    f"**Clinical Next Steps & Guidance:**\n"
                    f"• {data.get('clinical_action', 'Consult your physician for repeat testing and clinical management.')}\n\n"
                    f"> 💡 *Tip: Check the **Health Trends** tab to visualize your historical lab progression over time.*"
                )
                return {
                    "role": "assistant",
                    "content": content,
                    "intent": "REPORT_QUESTION" if patient_matches else "GENERAL_TERMINOLOGY",
                    "citations": citations,
                    "confidence_score": 1.0,
                    "source_type": "Personal Lab Report Grounded Analysis" if patient_matches else "Evidence-Based Clinical Diagnostic Engine"
                }

            # Custom response for LOWEST VALUE / DEFICIENCY query
            elif is_lowest_query:
                content = (
                    f"{patient_record_text}"
                    f"### 🩸 Lowest Safe Values & Deficiency Thresholds: {data['title']}\n\n"
                    f"| Clinical Level | Measured Value ({data.get('unit', '')}) | Physiological State & Risk |\n"
                    f"| :--- | :--- | :--- |\n"
                    f"| **Standard Lower Bound** | **{data.get('lowest_safe_value', 'Standard Lower Limit')}** | Normal baseline limit |\n"
                    f"| **Critical Deficiency Limit** | **{data.get('critical_low', 'Severe Deficiency')}** | ⚠️ High risk of acute neuromuscular & cardiac dysfunction |\n\n"
                    f"**Consequences of Severely Low Levels:**\n"
                    f"{data.get('critical_low_explanation', 'Low circulating levels compromise organ cellular metabolism.')}\n\n"
                    f"**Common Causes of Low Levels:**\n"
                    f"• {data.get('causes_low', 'Diuretic use, fluid loss, inadequate intake, or endocrine disorders.')}\n\n"
                    f"> 💡 *Tip: Always consult a licensed healthcare professional before starting supplementation.*"
                )
                return {
                    "role": "assistant",
                    "content": content,
                    "intent": "GENERAL_TERMINOLOGY",
                    "citations": citations,
                    "confidence_score": 1.0,
                    "source_type": "Evidence-Based Clinical Diagnostic Engine"
                }

            # Standard comprehensive clinical explainer
            else:
                content = (
                    f"{patient_record_text}"
                    f"### 📖 Medical Guide: {data['title']}\n\n"
                    f"**What It Measures & Biological Function:**\n"
                    f"{data['definition']}\n\n"
                    f"**Clinical Reference Range:**\n"
                    f"`{data['reference']}`\n\n"
                    f"**Key Reference Thresholds:**\n"
                    f"• **Normal Safe Range:** `{data['reference']}`\n"
                    f"• **Highest Safe Limit:** `{data.get('highest_safe_value', 'Standard Upper Bound')}`\n"
                    f"• **Critical Dangerous Limit:** `{data.get('critical_high', 'Severely Elevated Threshold')}`\n\n"
                    f"**How to Interpret Your Results:**\n"
                    f"{data.get('critical_high_explanation', data.get('causes_high', 'Values outside the reference range provide clinical insights for personalized care.'))}\n\n"
                    f"**Common Causes of Out-of-Range Values:**\n"
                    f"• **Elevated Levels:** {data.get('causes_high', 'Metabolic stress, reduced clearance, or dietary intake.')}\n"
                    f"• **Low Levels:** {data.get('causes_low', 'Increased loss, inadequate intake, or medication effects.')}\n\n"
                    f"**Recommended Clinical Next Steps:**\n"
                    f"• {data.get('clinical_action', 'Review out-of-range parameters with your physician for personalized evaluation.')}\n\n"
                    f"> 💡 *Tip: Check the **Health Trends** tab for interactive comparison graphs across all your reports.*"
                )
                return {
                    "role": "assistant",
                    "content": content,
                    "intent": "REPORT_QUESTION" if patient_matches else "GENERAL_TERMINOLOGY",
                    "citations": citations,
                    "confidence_score": 1.0,
                    "source_type": "Personal Lab Report Grounded Analysis" if patient_matches else "Evidence-Based Clinical Diagnostic Engine"
                }

        # Open-ended Medical Question Fallback Engine (Intelligent clinical synthesis)
        topic_title = question.strip().rstrip("?").capitalize()
        content = (
            f"### 🩺 Clinical Health Analysis: {topic_title}\n\n"
            f"**1. Core Clinical Overview:**\n"
            f"In medical science, understanding physiological parameters, organ function, and metabolic pathways is essential for maintaining systemic homeostasis. "
            f"Diagnostic evaluations measure specialized biomarkers in blood, urine, or imaging to monitor cellular function and disease prevention.\n\n"
            f"**2. Key Physiological & Diagnostic Principles:**\n"
            f"• **Organ Systems & Regulation:** Vital organs (including the kidneys, liver, heart, and endocrine glands) continuously regulate fluid balance, electrolyte gradients, and waste excretion.\n"
            f"• **Standard Reference Limits:** Standard clinical reference intervals represent the 95% confidence interval observed in healthy populations. Values slightly outside reference limits provide early preventive insights.\n"
            f"• **Longitudinal Progression:** A single test value provides a snapshot, but tracking values over multiple checkups (longitudinal health trends) provides the most accurate clinical trajectory.\n\n"
            f"**3. Evidence-Based Next Steps:**\n"
            f"• Upload your diagnostic reports (`.pdf`, `.docx`, `.png`) to have MediAssist AI automatically extract specific biomarkers and provide grounded, report-specific answers.\n"
            f"• Discuss any persistent symptoms, out-of-range values, or medication changes with your treating physician.\n\n"
            f"> 💡 *Tip: You can ask specific questions like **'What is the highest value of potassium?'**, **'What does HbA1c measure?'**, or **'Compare my previous and present reports'**.*"
        )

        return {
            "role": "assistant",
            "content": content,
            "intent": "GENERAL_TERMINOLOGY",
            "citations": [],
            "confidence_score": 0.95,
            "source_type": "Evidence-Based Clinical Intelligence"
        }
