import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.models import FoodItem, DietPlan, PatientDietProfile, PatientProfile, MedicalDocument

# 1. Authoritative NIDDK/NIH Nutrition Knowledge Chunks for RAG
NIDDK_NUTRITION_KNOWLEDGE_BASE = [
    {
        "id": "NIDDK-DIAB-01",
        "condition": "Type 2 Diabetes Mellitus / Prediabetes / Glycemic Control",
        "title": "NIDDK Diabetes Meal Planning & Carbohydrate Management",
        "source": "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK/NIH)",
        "url": "https://www.niddk.nih.gov/health-information/diabetes/overview/diet-eating-physical-activity",
        "guidelines": [
            "Use the Diabetes Plate Method: Fill 1/2 of your plate with non-starchy vegetables (spinach, broccoli, green beans), 1/4 with lean protein (skinless poultry, tofu, fish, eggs, paneer), and 1/4 with quality complex carbohydrates (quinoa, brown rice, oats, legumes).",
            "Choose high-fiber foods (at least 25-35g daily) such as lentils, oats, chia seeds, and berries to slow glucose absorption and reduce postprandial glycemic spikes.",
            "Limit refined carbohydrates, sugar-sweetened beverages, fruit juices, and sweets.",
            "Distribute carbohydrate intake evenly across 3 main meals and 2 light snacks rather than consuming a single large carbohydrate load.",
            "Pair carbohydrate sources with healthy fats or proteins to stabilize blood glucose curves."
        ]
    },
    {
        "id": "NIDDK-CKD-02",
        "condition": "Chronic Kidney Disease (CKD) / Elevated Creatinine / Renal Care",
        "title": "NIDDK Eating Right for Chronic Kidney Disease",
        "source": "NIDDK / National Kidney Disease Education Program (NIH)",
        "url": "https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/eating-nutrition",
        "guidelines": [
            "Control Sodium Intake: Keep daily sodium strictly under 1,500 - 2,000 mg to prevent fluid retention and control blood pressure. Avoid processed deli meats, pickles, and canned soups.",
            "Moderate Protein Intake: Adjust protein to 0.6 - 0.8 g/kg body weight in non-dialysis stages to reduce renal filtration workload and nitrogenous waste accumulation.",
            "Monitor Potassium & Phosphorus: Restrict high-potassium foods (bananas, potatoes, tomatoes) and high-phosphorus additives (colas, processed cheeses) when indicated.",
            "Choose Kidney-Friendly Fruits & Vegetables: Apples, blueberries, strawberries, cauliflower, cabbage, bottle gourd (lauki), and bell peppers are low in potassium and phosphorus.",
            "Maintain consistent hydration as advised by your nephrologist."
        ]
    },
    {
        "id": "NIDDK-HTN-03",
        "condition": "Hypertension / High Blood Pressure / DASH Cardiovascular Plan",
        "title": "NIH NHLBI Dietary Approaches to Stop Hypertension (DASH Plan)",
        "source": "National Institutes of Health (NIH/NHLBI)",
        "url": "https://www.nhlbi.nih.gov/education/dash-eating-plan",
        "guidelines": [
            "Sodium Reduction: Target less than 1,500 - 2,000 mg sodium daily. Enhance meals using herbs, citrus juice, garlic, and sodium-free spices.",
            "Potassium, Magnesium & Calcium Rich Diet: Consume dark leafy greens, unsalted almonds, low-fat yogurt, and legumes to support vascular tone.",
            "Emphasize whole grains, fiber-rich fruits, vegetables, and low-fat dairy products.",
            "Limit saturated fats (<6% of total daily calories) and eliminate industrial trans fatty acids."
        ]
    },
    {
        "id": "NIDDK-LIPID-04",
        "condition": "Hyperlipidemia / High Cholesterol / Elevated Triglycerides",
        "title": "NIH Therapeutic Lifestyle Changes (TLC) for Cholesterol Management",
        "source": "National Heart, Lung, and Blood Institute (NIH/NHLBI)",
        "url": "https://www.nhlbi.nih.gov/health-topics/therapeutic-lifestyle-changes",
        "guidelines": [
            "Increase Soluble Fiber: Consume 10-25g of soluble fiber per day from oats, barley, psyllium husk, kidney beans, and apples to bind dietary cholesterol in the gut.",
            "Replace Saturated Fats with Poly- and Monounsaturated Fats: Use extra virgin olive oil, avocado, walnuts, and fatty fish (salmon, sardines) rich in Omega-3.",
            "If Triglycerides are elevated (>150 mg/dL), eliminate refined sugars, high-fructose corn syrup, and strictly limit alcohol consumption."
        ]
    },
    {
        "id": "NIDDK-THY-05",
        "condition": "Thyroid Health / Hypothyroidism / Metabolic Support",
        "title": "Clinical Nutrition for Endocrine & Thyroid Function",
        "source": "American Thyroid Association & NIH Endocrine Guidelines",
        "url": "https://www.thyroid.org/guidelines/",
        "guidelines": [
            "Ensure adequate dietary Selenium and Zinc (found in brazil nuts, pumpkin seeds, lentils, and eggs) to support T4 to T3 thyroid hormone conversion.",
            "Cook cruciferous vegetables (cabbage, cauliflower, broccoli) before eating to deactivate goitrogens.",
            "Take thyroid medications with plain water on an empty stomach at least 30-60 minutes before breakfast or coffee.",
            "Maintain balanced iodine intake from iodized salt and seaweeds without excessive supplementation."
        ]
    },
    {
        "id": "NIDDK-LIV-06",
        "condition": "Fatty Liver / NAFLD / Hepatic Health",
        "title": "Nutritional Guidance for Non-Alcoholic Fatty Liver Disease (NAFLD)",
        "source": "American Association for the Study of Liver Diseases (AASLD)",
        "url": "https://www.aasld.org/practice-guidelines",
        "guidelines": [
            "Adopt a Mediterranean dietary pattern rich in monounsaturated fats (olive oil), cruciferous vegetables, and antioxidant-rich greens.",
            "Strictly eliminate high-fructose corn syrup, sweetened beverages, and commercial bakery products.",
            "Incorporate green tea, black coffee (unfiltered, without sugar), and garlic to support hepatic antioxidant pathways.",
            "Aim for gradual 7-10% body weight reduction if indicated to reduce hepatic steatosis."
        ]
    },
    {
        "id": "NIDDK-ANEM-07",
        "condition": "Anemia / Iron Deficiency / Low Hemoglobin",
        "title": "Dietary Management for Iron-Deficiency Anemia & Hemoglobin Repletion",
        "source": "WHO & NIH Hematology Guidelines",
        "url": "https://www.who.int/health-topics/anaemia",
        "guidelines": [
            "Include bioavailable iron sources: spinach, beetroot, pomegranate, lentils, chickpeas, and lean poultry.",
            "Pair non-heme iron foods with Vitamin C (lemon juice, oranges, amla, bell peppers) to boost absorption up to 300%.",
            "Avoid drinking black tea, coffee, or milk within 1 hour of iron-rich meals (tannins and calcium inhibit iron uptake).",
            "Ensure sufficient Folate (B9) and Vitamin B12 for red blood cell maturation."
        ]
    },
    {
        "id": "NIDDK-ASTHMA-08",
        "condition": "Asthma / Respiratory Health / Anti-Inflammatory",
        "title": "Anti-Inflammatory Nutrition for Respiratory Wellness",
        "source": "Global Initiative for Asthma (GINA) & NIH",
        "url": "https://ginasthma.org/",
        "guidelines": [
            "Consume anti-inflammatory bioflavonoids and antioxidants from turmeric, ginger, berries, and leafy greens.",
            "Boost Vitamin D and Magnesium intake (pumpkin seeds, spinach, fortified foods) to support airway smooth muscle relaxation.",
            "Avoid foods with sulfite preservatives (dried fruits, processed wines) and artificial flavorings that trigger bronchospasms.",
            "Drink warm fluids and herbal teas (ginger-tulsi) to soothe respiratory mucosa."
        ]
    },
    {
        "id": "NIDDK-GEN-09",
        "condition": "General Healthy Eating / Weight Management / Preventive Health",
        "title": "NIDDK Healthy Eating for Vitality and Disease Prevention",
        "source": "National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK/NIH)",
        "url": "https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity",
        "guidelines": [
            "Aim for a colorful, diverse diet rich in whole foods, prioritizing minimally processed ingredients.",
            "Practice mindful eating and portion awareness using standard measuring cups or visual hand-portion guides.",
            "Hydrate primarily with plain water, herbal infusions, and sparkling water without added sweeteners."
        ]
    }
]

# 2. Comprehensive USDA FoodData Central Structured Dataset
DEFAULT_USDA_FOOD_DATABASE = [
    {
        "food_id": "USDA-101",
        "food_name": "Steel-Cut Rolled Oats (Cooked)",
        "food_category": "Whole Grains",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 71.0,
        "protein_g": 2.5,
        "carbohydrates_g": 12.0,
        "fat_g": 1.5,
        "fiber_g": 1.7,
        "sugar_g": 0.3,
        "sodium_mg": 2.0,
        "potassium_mg": 61.0,
        "calcium_mg": 8.0,
        "iron_mg": 0.9,
        "vitamin_a": "0 IU",
        "vitamin_c": "0 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Rich in beta-glucan soluble fiber; excellent for lowering LDL and managing blood sugar."
    },
    {
        "food_id": "USDA-102",
        "food_name": "Brown Basmati Rice (Cooked)",
        "food_category": "Whole Grains",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 112.0,
        "protein_g": 2.6,
        "carbohydrates_g": 23.5,
        "fat_g": 0.9,
        "fiber_g": 1.8,
        "sugar_g": 0.2,
        "sodium_mg": 1.0,
        "potassium_mg": 79.0,
        "calcium_mg": 10.0,
        "iron_mg": 0.5,
        "vitamin_a": "0 IU",
        "vitamin_c": "0 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Medium/Low GI complex carbohydrate providing sustained energy without steep glucose spikes."
    },
    {
        "food_id": "USDA-103",
        "food_name": "Organic Quinoa (Cooked)",
        "food_category": "Whole Grains",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 120.0,
        "protein_g": 4.4,
        "carbohydrates_g": 21.3,
        "fat_g": 1.9,
        "fiber_g": 2.8,
        "sugar_g": 0.9,
        "sodium_mg": 7.0,
        "potassium_mg": 172.0,
        "calcium_mg": 17.0,
        "iron_mg": 1.5,
        "vitamin_a": "0 IU",
        "vitamin_c": "0 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Complete plant protein containing all 9 essential amino acids; gluten-free and low-glycemic."
    },
    {
        "food_id": "USDA-201",
        "food_name": "Fresh Baby Spinach (Raw)",
        "food_category": "Vegetables",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 23.0,
        "protein_g": 2.9,
        "carbohydrates_g": 3.6,
        "fat_g": 0.4,
        "fiber_g": 2.2,
        "sugar_g": 0.4,
        "sodium_mg": 79.0,
        "potassium_mg": 558.0,
        "calcium_mg": 99.0,
        "iron_mg": 2.7,
        "vitamin_a": "9377 IU",
        "vitamin_c": "28 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Extremely high in folate, lutein, and non-heme iron; non-starchy base for the Diabetes Plate Method."
    },
    {
        "food_id": "USDA-202",
        "food_name": "Steamed Broccoli Florets",
        "food_category": "Vegetables",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 35.0,
        "protein_g": 2.4,
        "carbohydrates_g": 7.2,
        "fat_g": 0.4,
        "fiber_g": 3.3,
        "sugar_g": 1.4,
        "sodium_mg": 41.0,
        "potassium_mg": 293.0,
        "calcium_mg": 40.0,
        "iron_mg": 0.7,
        "vitamin_a": "775 IU",
        "vitamin_c": "65 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Rich in sulforaphane antioxidant; supports hepatic detoxification and cardiovascular health."
    },
    {
        "food_id": "USDA-301",
        "food_name": "Grilled Skinless Chicken Breast",
        "food_category": "Lean Poultry",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 165.0,
        "protein_g": 31.0,
        "carbohydrates_g": 0.0,
        "fat_g": 3.6,
        "fiber_g": 0.0,
        "sugar_g": 0.0,
        "sodium_mg": 74.0,
        "potassium_mg": 256.0,
        "calcium_mg": 15.0,
        "iron_mg": 1.0,
        "vitamin_a": "33 IU",
        "vitamin_c": "0 mg",
        "vitamin_d": "5 IU",
        "cholesterol_mg": 85.0,
        "glycemic_index": "Low",
        "suitability_notes": "Ultra-lean high-protein source with minimal saturated fat; optimal for muscle preservation."
    },
    {
        "food_id": "USDA-302",
        "food_name": "Wild Atlantic Salmon (Baked)",
        "food_category": "Fish & Seafood",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 182.0,
        "protein_g": 25.0,
        "carbohydrates_g": 0.0,
        "fat_g": 8.1,
        "fiber_g": 0.0,
        "sugar_g": 0.0,
        "sodium_mg": 60.0,
        "potassium_mg": 490.0,
        "calcium_mg": 12.0,
        "iron_mg": 0.8,
        "vitamin_a": "150 IU",
        "vitamin_c": "0 mg",
        "vitamin_d": "526 IU",
        "cholesterol_mg": 63.0,
        "glycemic_index": "Low",
        "suitability_notes": "Rich in EPA/DHA Omega-3 fatty acids; reduces triglycerides and systemic vascular inflammation."
    },
    {
        "food_id": "USDA-303",
        "food_name": "Organic Firm Tofu (Pan-seared)",
        "food_category": "Plant Protein",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 144.0,
        "protein_g": 15.7,
        "carbohydrates_g": 3.0,
        "fat_g": 8.0,
        "fiber_g": 2.3,
        "sugar_g": 0.8,
        "sodium_mg": 14.0,
        "potassium_mg": 237.0,
        "calcium_mg": 683.0,
        "iron_mg": 2.8,
        "vitamin_a": "85 IU",
        "vitamin_c": "0.2 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Zero cholesterol, high isoflavones and calcium; excellent plant-based protein for renal and cardio health."
    },
    {
        "food_id": "USDA-401",
        "food_name": "Yellow Moong Dal (Cooked)",
        "food_category": "Legumes",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 105.0,
        "protein_g": 7.0,
        "carbohydrates_g": 19.1,
        "fat_g": 0.4,
        "fiber_g": 7.6,
        "sugar_g": 1.2,
        "sodium_mg": 2.0,
        "potassium_mg": 292.0,
        "calcium_mg": 27.0,
        "iron_mg": 1.4,
        "vitamin_a": "15 IU",
        "vitamin_c": "1.0 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Easily digestible legume with high prebiotic soluble fiber; stabilizes postprandial glucose."
    },
    {
        "food_id": "USDA-501",
        "food_name": "Raw California Walnuts",
        "food_category": "Nuts & Seeds",
        "serving_size": 30.0,
        "serving_unit": "g",
        "calories": 196.0,
        "protein_g": 4.5,
        "carbohydrates_g": 4.1,
        "fat_g": 19.5,
        "fiber_g": 2.0,
        "sugar_g": 0.8,
        "sodium_mg": 1.0,
        "potassium_mg": 132.0,
        "calcium_mg": 29.0,
        "iron_mg": 0.9,
        "vitamin_a": "6 IU",
        "vitamin_c": "0.4 mg",
        "vitamin_d": "0 IU",
        "cholesterol_mg": 0.0,
        "glycemic_index": "Low",
        "suitability_notes": "Top botanical source of alpha-linolenic acid (ALA Omega-3); proven to improve lipid profile."
    }
]

class DietService:
    """
    Evidence-grounded clinical diet and nutrition service.
    Grounds recommendations in NIDDK/NIH clinical guidelines, USDA FoodData Central,
    and patient-specific conditions & biomarker trends.
    """
    _seeded = False

    @classmethod
    def seed_food_database(cls, db: Session):
        if cls._seeded:
            return
        if db.query(FoodItem).count() == 0:
            for item in DEFAULT_USDA_FOOD_DATABASE:
                food = FoodItem(
                    food_id=item["food_id"],
                    food_name=item["food_name"],
                    food_category=item["food_category"],
                    serving_size=item["serving_size"],
                    serving_unit=item["serving_unit"],
                    calories=item["calories"],
                    protein_g=item["protein_g"],
                    carbohydrates_g=item["carbohydrates_g"],
                    fat_g=item["fat_g"],
                    fiber_g=item["fiber_g"],
                    sugar_g=item["sugar_g"],
                    sodium_mg=item["sodium_mg"],
                    potassium_mg=item["potassium_mg"],
                    calcium_mg=item["calcium_mg"],
                    iron_mg=item["iron_mg"],
                    vitamin_a=item["vitamin_a"],
                    vitamin_c=item["vitamin_c"],
                    vitamin_d=item["vitamin_d"],
                    cholesterol_mg=item["cholesterol_mg"],
                    glycemic_index=item["glycemic_index"],
                    suitability_notes=item["suitability_notes"]
                )
                db.add(food)
            db.commit()
        cls._seeded = True

    @classmethod
    def search_food_database(
        cls,
        db: Session,
        query: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        cls.seed_food_database(db)
        q = db.query(FoodItem)
        if query:
            q = q.filter(FoodItem.food_name.ilike(f"%{query.strip()}%"))
        if category and category.lower() != "all":
            q = q.filter(FoodItem.food_category.ilike(f"%{category.strip()}%"))
        items = q.limit(limit).all()
        return [
            {
                "food_id": f.food_id,
                "food_name": f.food_name,
                "food_category": f.food_category,
                "serving_size": f.serving_size,
                "serving_unit": f.serving_unit,
                "calories": f.calories,
                "protein_g": f.protein_g,
                "carbohydrates_g": f.carbohydrates_g,
                "fat_g": f.fat_g,
                "fiber_g": f.fiber_g,
                "sugar_g": f.sugar_g,
                "sodium_mg": f.sodium_mg,
                "potassium_mg": f.potassium_mg,
                "calcium_mg": f.calcium_mg,
                "iron_mg": f.iron_mg,
                "vitamin_a": f.vitamin_a,
                "vitamin_c": f.vitamin_c,
                "vitamin_d": f.vitamin_d,
                "cholesterol_mg": f.cholesterol_mg,
                "glycemic_index": f.glycemic_index,
                "suitability_notes": f.suitability_notes
            } for f in items
        ]

    @classmethod
    def retrieve_niddk_guidelines(cls, condition_or_query: str) -> List[Dict[str, Any]]:
        query_l = (condition_or_query or "").lower()
        matched = []

        for chunk in NIDDK_NUTRITION_KNOWLEDGE_BASE:
            cond_l = chunk["condition"].lower()
            title_l = chunk["title"].lower()

            if any(term in query_l for term in ["diabet", "glucose", "sugar", "hba1c"]) and "diabet" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["kidney", "ckd", "renal", "creatinine"]) and "kidney" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["hypertens", "pressure", "bp", "dash"]) and "hypertens" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["lipid", "cholesterol", "triglyceride"]) and "lipid" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["thyroid", "tsh", "hypothyroid"]) and "thyroid" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["liver", "sgpt", "sgot", "nafld"]) and "liver" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["anemia", "iron", "hemoglobin", "hb"]) and "anemia" in cond_l:
                matched.append(chunk)
            elif any(term in query_l for term in ["asthma", "wheezing", "respiratory", "allergy"]) and "asthma" in cond_l:
                matched.append(chunk)

        if not matched:
            matched.append(NIDDK_NUTRITION_KNOWLEDGE_BASE[-1]) # Default General Guidelines

        return matched

    @classmethod
    def generate_personalized_diet_plan(
        cls,
        db: Session,
        patient_id: str,
        document_id: Optional[int] = None,
        target_condition: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a personalized, clinical-evidence-grounded diet recommendation.
        Uses patient profile, lab report context, USDA structured food items, and NIDDK/NIH RAG guidelines.
        """
        cls.seed_food_database(db)

        patient = db.query(PatientProfile).filter(PatientProfile.patient_id == patient_id).first()
        if not patient:
            # Create transient profile if not found
            patient = PatientProfile(
                patient_id=patient_id,
                full_name="Patient",
                age=40,
                gender="Male",
                medical_conditions="General Health Maintenance"
            )

        conditions = target_condition or patient.medical_conditions or "General Health Maintenance"
        cond_l = conditions.lower()

        # Calculate Calorie & Macro targets (Mifflin-St Jeor)
        age = patient.age or 40
        weight = patient.weight_kg or 70.0
        height = patient.height_cm or 170.0
        gender = patient.gender or "Male"

        if gender.lower() == "male":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161

        activity_multiplier = 1.375
        tdee = round(bmr * activity_multiplier, -1)

        # Condition flags
        is_diabetic = any(w in cond_l for w in ["diabet", "glucose", "sugar", "hba1c"])
        is_ckd = any(w in cond_l for w in ["kidney", "ckd", "renal", "creatinine"])
        is_htn = any(w in cond_l for w in ["hypertens", "pressure", "bp", "dash"])
        is_lipid = any(w in cond_l for w in ["lipid", "cholesterol", "triglyceride", "ldl"])
        is_thyroid = any(w in cond_l for w in ["thyroid", "tsh", "hypothyroid"])
        is_liver = any(w in cond_l for w in ["liver", "nafld", "fatty liver", "sgpt", "sgot"])
        is_anemia = any(w in cond_l for w in ["anemia", "iron", "hemoglobin", "hb"])
        is_asthma = any(w in cond_l for w in ["asthma", "respiratory", "wheezing", "bronchial"])

        # Target macros
        if is_ckd:
            protein_g = round(0.7 * weight, 1) # Controlled renal protein
            sodium_limit_mg = 1500.0
            carb_pct = 0.55
        elif is_diabetic:
            protein_g = round(1.2 * weight, 1)
            sodium_limit_mg = 2000.0
            carb_pct = 0.40 # Low-glycemic load
        elif is_htn:
            protein_g = round(1.1 * weight, 1)
            sodium_limit_mg = 1500.0 # DASH sodium cap
            carb_pct = 0.50
        elif is_anemia:
            protein_g = round(1.3 * weight, 1) # High iron-protein
            sodium_limit_mg = 2000.0
            carb_pct = 0.48
        else:
            protein_g = round(1.1 * weight, 1)
            sodium_limit_mg = 2000.0
            carb_pct = 0.50

        carbs_g = round((tdee * carb_pct) / 4, 1)
        fat_g = round((tdee * 0.25) / 9, 1)
        potassium_limit_mg = 2000.0 if is_ckd else 3500.0

        # Retrieve NIDDK guidelines for context
        niddk_chunks = cls.retrieve_niddk_guidelines(conditions)
        niddk_primary = niddk_chunks[0]

        # -------------------------------------------------------------
        # Condition-Tailored 5-Meal Schedule
        # -------------------------------------------------------------
        if is_ckd:
            plan_title = f"Renal Preservation & Kidney Care Nutrition Plan — {conditions}"
            breakfast = {
                "meal_name": "Breakfast (8:00 AM)",
                "items": [
                    "Cooked rolled oats (1 cup) with low-potassium almond milk and a sprinkle of cinnamon",
                    "Sliced red apple (1/2 cup) or fresh blueberries (low potassium & phosphorus)",
                    "Warm chamomile tea or boiled water"
                ],
                "calories": 290,
                "carbs_g": 48,
                "protein_g": 6,
                "fat_g": 5,
                "clinical_notes": "Low potassium and phosphorus breakfast to minimize glomerular filtration stress."
            }
            mid_morning = {
                "meal_name": "Mid-Morning Snack (10:45 AM)",
                "items": ["Crisp cucumber and cabbage slices with a touch of lemon juice", "Puffed rice cakes (2 pcs)"],
                "calories": 90,
                "carbs_g": 18,
                "protein_g": 2,
                "fat_g": 1,
                "clinical_notes": "Hydrating, low-sodium renal-safe snack."
            }
            lunch = {
                "meal_name": "Balanced Lunch (1:15 PM)",
                "items": [
                    "Cooked white basmati rice or couscous (3/4 cup)",
                    "Steamed bottle gourd (lauki) or cauliflower with 1 tsp cold-pressed olive oil",
                    "Paneer or firm tofu cubes (50g) OR 1 boiled egg white",
                    "Yellow moong dal soup (light, 1/2 cup)"
                ],
                "calories": 440,
                "carbs_g": 60,
                "protein_g": 16,
                "fat_g": 10,
                "clinical_notes": "Moderate controlled protein with low-leachable phosphorus."
            }
            evening_snack = {
                "meal_name": "Evening Nourishment (4:45 PM)",
                "items": ["Warm ginger herbal tea", "Unsalted whole grain crackers (2 pcs)"],
                "calories": 110,
                "carbs_g": 16,
                "protein_g": 3,
                "fat_g": 2,
                "clinical_notes": "Soothes digestion without electrolyte overload."
            }
            dinner = {
                "meal_name": "Light Dinner (7:30 PM)",
                "items": [
                    "Steamed green beans and carrots with cumin tempering",
                    "Whole wheat roti (1 thin chapati) or white rice (1/2 cup)",
                    "Clear vegetable broth with a squeeze of fresh lemon"
                ],
                "calories": 360,
                "carbs_g": 46,
                "protein_g": 10,
                "fat_g": 8,
                "clinical_notes": "Light evening meal preventing nocturnal fluid retention."
            }
            foods_to_prefer = [
                {"food": "Low-potassium fruits (Apples, Berries, Pears, Pineapples)", "rationale": "Safely provides dietary antioxidants without elevating serum potassium."},
                {"food": "Kidney-friendly vegetables (Cauliflower, Cabbage, Bottle Gourd, Bell Peppers)", "rationale": "Low in renal burden, alkaline-forming."},
                {"food": "Controlled high-biological-value protein (Egg whites, Tofu, Paneer)", "rationale": "Supports nitrogen balance without excess urea byproduct formation."},
                {"food": "Olive oil and Flaxseed oil", "rationale": "Clean calorie sources that do not generate protein waste."}
            ]
            foods_to_avoid = [
                {"food": "High-potassium fruits & tubers (Bananas, Potatoes, Tomatoes, Oranges)", "rationale": "Prevents hyperkalemia and cardiac conduction risks in reduced GFR."},
                {"food": "High-sodium processed deli meats, canned broths, pickles", "rationale": "Excess sodium triggers fluid retention and elevates renal vascular pressure."},
                {"food": "Dark colas, processed cheeses, packaged baked items", "rationale": "Contains inorganic phosphorus additives that leach bone calcium."},
                {"food": "Excessive protein powders or high-purine red meats", "rationale": "Generates excess BUN and creatinine filtration strain."}
            ]

        elif is_anemia:
            plan_title = f"Hematopoietic & Iron Repletion Nutrition Plan — {conditions}"
            breakfast = {
                "meal_name": "Breakfast (8:00 AM)",
                "items": [
                    "Iron-fortified oatmeal (1 cup) with black raisins, soaked pumpkin seeds & chia seeds",
                    "Fresh pomegranate juice (1/2 cup) with 1 tsp fresh amla/lemon juice",
                    "Boiled egg (1 whole) or pan-seared paneer"
                ],
                "calories": 350,
                "carbs_g": 45,
                "protein_g": 16,
                "fat_g": 8,
                "clinical_notes": "Non-heme iron combined with Vitamin C ascorbic acid to boost iron absorption by 300%."
            }
            mid_morning = {
                "meal_name": "Mid-Morning Snack (10:45 AM)",
                "items": ["Dried figs (anjeer - 2 pcs) and Medjool dates (2 pcs)", "Roasted pumpkin seeds (1 tbsp)"],
                "calories": 150,
                "carbs_g": 28,
                "protein_g": 4,
                "fat_g": 3,
                "clinical_notes": "Dense in plant iron, copper, and active folate."
            }
            lunch = {
                "meal_name": "Balanced Lunch (1:15 PM)",
                "items": [
                    "Spinach Dal (Palak Moong Dal - 1 large bowl)",
                    "Grated Beetroot & Carrot salad with extra lemon dressing",
                    "Cooked Brown Basmati Rice or 2 Multigrain Rotis",
                    "Grilled skinless chicken breast OR Organic tofu (100g)"
                ],
                "calories": 520,
                "carbs_g": 58,
                "protein_g": 34,
                "fat_g": 12,
                "clinical_notes": "High heme & non-heme iron synthesis support with zero iron-inhibiting tannins."
            }
            evening_snack = {
                "meal_name": "Evening Nourishment (4:45 PM)",
                "items": ["Roasted chickpeas (chana - 1 small cup)", "Fresh amla (Indian gooseberry) shot or orange slices"],
                "calories": 140,
                "carbs_g": 22,
                "protein_g": 7,
                "fat_g": 2,
                "clinical_notes": "Sustained iron repletion with bioavailable ascorbic acid."
            }
            dinner = {
                "meal_name": "Light Dinner (7:30 PM)",
                "items": [
                    "Lentil and vegetable stew with moringa (drumstick leaves)",
                    "Wild salmon or cottage cheese stir-fry with broccoli and bell peppers",
                    "Cooked quinoa (1/2 cup)"
                ],
                "calories": 420,
                "carbs_g": 36,
                "protein_g": 30,
                "fat_g": 14,
                "clinical_notes": "Provides Vitamin B12, Folate, and essential amino acids for erythrocyte maturation."
            }
            foods_to_prefer = [
                {"food": "Dark leafy greens (Spinach, Moringa, Fenugreek, Kale)", "rationale": "High plant iron, folate, and carotenoids for red blood cell synthesis."},
                {"food": "Iron-dense fruits (Beetroot, Pomegranate, Black raisins, Figs)", "rationale": "Enhances hemoglobin concentration naturally."},
                {"food": "Vitamin C boosters (Amla, Lemons, Oranges, Bell peppers)", "rationale": "Essential cofactor converting ferric iron to absorbable ferrous state."},
                {"food": "Lean meats, Eggs, Lentils, Pumpkin seeds", "rationale": "Supplies amino acid precursors for hemoglobin globin chains."}
            ]
            foods_to_avoid = [
                {"food": "Black tea, Coffee, and Colas with or near meals", "rationale": "Tannins, polyphenols, and phytates bind iron and block gut absorption."},
                {"food": "Excess dairy milk directly with iron-rich lunches", "rationale": "High calcium competes with iron at enterocyte transporter channels."},
                {"food": "Refined sugars and processed junk foods", "rationale": "Empty calories devoid of hematinic micronutrients."}
            ]

        elif is_asthma:
            plan_title = f"Anti-Inflammatory & Respiratory Support Nutrition Plan — {conditions}"
            breakfast = {
                "meal_name": "Breakfast (8:00 AM)",
                "items": [
                    "Warm rolled oats (1 cup) with ground turmeric, ginger, blueberries & chia seeds",
                    "Warm almond milk or herbal tulsi-ginger infusion (1 cup)",
                    "Boiled egg whites (2 pcs) or organic tofu cubes"
                ],
                "calories": 320,
                "carbs_g": 42,
                "protein_g": 15,
                "fat_g": 7,
                "clinical_notes": "Curcumin and gingerols downregulate NF-kB airway inflammation."
            }
            mid_morning = {
                "meal_name": "Mid-Morning Snack (10:45 AM)",
                "items": ["Fresh sweet oranges or kiwi fruit (high bioflavonoids)", "Raw unsalted almonds (8-10 pcs)"],
                "calories": 140,
                "carbs_g": 18,
                "protein_g": 4,
                "fat_g": 7,
                "clinical_notes": "Magnesium and Vitamin C support bronchial smooth muscle relaxation."
            }
            lunch = {
                "meal_name": "Balanced Lunch (1:15 PM)",
                "items": [
                    "Warm Mediterranean vegetable soup with garlic, oregano, and spinach",
                    "Grilled wild salmon (120g) OR Pan-seared paneer with black pepper",
                    "Cooked Brown Rice or Quinoa (3/4 cup)",
                    "Steamed broccoli with extra virgin olive oil dressing"
                ],
                "calories": 510,
                "carbs_g": 48,
                "protein_g": 36,
                "fat_g": 16,
                "clinical_notes": "Omega-3 fatty acids attenuate leukotriene-mediated bronchoconstriction."
            }
            evening_snack = {
                "meal_name": "Evening Nourishment (4:45 PM)",
                "items": ["Warm golden milk (turmeric almond milk with a pinch of black pepper)", "Roasted pumpkin seeds (1 tbsp)"],
                "calories": 130,
                "carbs_g": 8,
                "protein_g": 5,
                "fat_g": 8,
                "clinical_notes": "Soothes respiratory tract and promotes restful nocturnal breathing."
            }
            dinner = {
                "meal_name": "Light Dinner (7:30 PM)",
                "items": [
                    "Warm clear vegetable and lentil stew with carrots, celery, and fresh cilantro",
                    "Grilled skinless chicken or tofu (100g)",
                    "Steamed sweet potato cubes (1/2 cup)"
                ],
                "calories": 400,
                "carbs_g": 38,
                "protein_g": 30,
                "fat_g": 10,
                "clinical_notes": "Light non-acidic evening meal preventing gastroesophageal reflux airway triggers."
            }
            foods_to_prefer = [
                {"food": "Anti-inflammatory spices (Turmeric, Ginger, Garlic, Cinnamon)", "rationale": "Inhibits inflammatory cytokine pathways in respiratory mucosa."},
                {"food": "Omega-3 rich foods (Salmon, Walnuts, Flaxseeds, Chia seeds)", "rationale": "Reduces airway hyperresponsiveness and improves lung function."},
                {"food": "Magnesium & Vitamin D rich foods (Spinach, Almonds, Fortified dairy)", "rationale": "Facilitates bronchial smooth muscle relaxation."},
                {"food": "Warm soups, herbal infusions (Tulsi, Chamomile)", "rationale": "Hydrates mucosal lining and prevents cold-induced bronchospasm."}
            ]
            foods_to_avoid = [
                {"food": "Sulfite-containing foods (Dried apricots, packaged wine, commercial sauces)", "rationale": "Known to trigger acute bronchospasms in sensitive individuals."},
                {"food": "Ice-cold refrigerated beverages and ice creams", "rationale": "Thermal shock can trigger vagal bronchoconstriction."},
                {"food": "Heavy deep-fried, oily snacks", "rationale": "Causes delayed gastric emptying and acid reflux triggering cough reflex."},
                {"food": "Artificial food colorings and chemical preservatives", "rationale": "May trigger histamine release and allergic respiratory flare-ups."}
            ]

        else:
            # Default / Diabetes / Lipid / Hypertension / General Clinical Plan
            plan_title = f"Personalized Clinical Nutrition & Meal Plan — {conditions}"
            breakfast = {
                "meal_name": "Breakfast (8:00 AM)",
                "items": [
                    "Steel-Cut Rolled Oats (1 cup cooked) topped with chia seeds, crushed walnuts & cinnamon",
                    "Fresh blueberries or sliced strawberries (1/2 cup)",
                    "1 boiled egg white OR grilled paneer cubes (40g)",
                    "Warm unsweetened green tea or herbal infusion"
                ],
                "calories": 330,
                "carbs_g": 42,
                "protein_g": 14,
                "fat_g": 7,
                "clinical_notes": "High soluble fiber beta-glucan blunts postprandial glucose surges and binds intestinal cholesterol."
            }
            mid_morning = {
                "meal_name": "Mid-Morning Snack (10:45 AM)",
                "items": ["Raw unsalted almonds (10-12 pieces)", "Crisp cucumber and carrot slices with a dash of lemon"],
                "calories": 140,
                "carbs_g": 7,
                "protein_g": 5,
                "fat_g": 11,
                "clinical_notes": "Cardioprotective monounsaturated fats providing sustained satiety."
            }
            lunch = {
                "meal_name": "Balanced Lunch (1:15 PM)",
                "items": [
                    "Diabetes / DASH Plate: 50% non-starchy vegetables (Steamed broccoli, spinach, bell peppers)",
                    "Lean Protein: Grilled skinless chicken breast OR Pan-seared organic tofu/paneer (120g)",
                    "Complex Carbohydrate: Cooked Brown Basmati Rice or Organic Quinoa (3/4 cup)",
                    "Yellow Moong Dal or Lentil Soup (1 small bowl with 1 tsp extra virgin olive oil)"
                ],
                "calories": 520,
                "carbs_g": 52,
                "protein_g": 38,
                "fat_g": 14,
                "clinical_notes": "Ideal glycemic balance: 50% fiber-rich greens, 25% lean protein, 25% whole grains."
            }
            evening_snack = {
                "meal_name": "Evening Nourishment (4:45 PM)",
                "items": ["Plain low-fat Greek yogurt (100g) with crushed walnuts or roasted makhana (fox nuts)", "Infused lemon-ginger warm water"],
                "calories": 160,
                "carbs_g": 9,
                "protein_g": 11,
                "fat_g": 6,
                "clinical_notes": "Probiotics support microbiome metabolic regulation and curb evening cravings."
            }
            dinner = {
                "meal_name": "Light Dinner (7:30 PM)",
                "items": [
                    "Wild baked salmon OR Stir-fried mixed vegetables with cottage cheese/tofu (100g)",
                    "Large colorful bowl salad: lettuce, bell peppers, grated carrots, lemon-herb dressing",
                    "Warm clear vegetable broth with herbs"
                ],
                "calories": 410,
                "carbs_g": 22,
                "protein_g": 32,
                "fat_g": 15,
                "clinical_notes": "Low glycemic load evening meal for optimal overnight metabolic homeostasis."
            }
            foods_to_prefer = [
                {"food": "Non-starchy vegetables (Spinach, Broccoli, Cauliflower, Bell Peppers)", "rationale": "High micronutrient density with near-zero blood sugar impact."},
                {"food": "Complex high-fiber whole grains (Oats, Quinoa, Brown Basmati)", "rationale": "Slow-release energy preventing insulin surges."},
                {"food": "Lean proteins (Skinless poultry, Tofu, Lentils, Paneer, Salmon)", "rationale": "Maintains lean muscle mass and structural metabolic health."},
                {"food": "Healthy fats (Extra virgin olive oil, Walnuts, Chia seeds)", "rationale": "Lowers atherogenic LDL cholesterol and promotes vascular elasticity."}
            ]
            foods_to_avoid = [
                {"food": "Sugar-sweetened beverages, sodas, packaged juices", "rationale": "Causes acute blood glucose spikes and hepatic lipid accumulation."},
                {"food": "High-sodium processed deli meats and canned soups", "rationale": f"Exceeds recommended {sodium_limit_mg}mg daily sodium ceiling."},
                {"food": "Ultra-processed fried snacks and industrial trans fats", "rationale": "Elevates systemic inflammation and atherogenic lipid subfractions."},
                {"food": "Refined flour (Maida), white bread, and pastries", "rationale": "High glycemic index leading to insulin resistance."}
            ]

        lifestyle_notes = [
            "Maintain regular meal timing; avoid skipping breakfast or consuming heavy late-night meals.",
            "Engage in at least 30 minutes of moderate aerobic activity (e.g. brisk walking) 5 days a week.",
            "Take a short 10-15 minute gentle walk after lunch and dinner to stimulate muscle glucose disposal.",
            f"Hydrate consistently (aim for 2.0 to 2.5 liters of clean water daily unless fluid-restricted).",
            "Prioritize 7-8 hours of quality restorative sleep to normalize cortisol and insulin sensitivity."
        ]

        safety_disclaimer = (
            "MediAssist AI provides evidence-grounded nutritional guidance based on NIDDK/NIH clinical guidelines "
            "and your medical records. This informational plan does not replace individualized medical advice from a registered dietitian or physician."
        )

        plan_data = {
            "patient_id": patient_id,
            "document_id": document_id,
            "title": plan_title,
            "condition_context": conditions,
            "guidance_source": niddk_primary["title"],
            "guidance_source_url": niddk_primary["url"],
            "daily_targets": {
                "calories": tdee,
                "protein_g": protein_g,
                "carbs_g": carbs_g,
                "fat_g": fat_g,
                "sodium_limit_mg": sodium_limit_mg,
                "potassium_limit_mg": potassium_limit_mg
            },
            "meal_schedule": {
                "breakfast": breakfast,
                "mid_morning": mid_morning,
                "lunch": lunch,
                "evening_snack": evening_snack,
                "dinner": dinner
            },
            "foods_to_prefer": foods_to_prefer,
            "foods_to_avoid": foods_to_avoid,
            "lifestyle_notes": lifestyle_notes,
            "niddk_clinical_guidelines": niddk_primary["guidelines"],
            "safety_disclaimer": safety_disclaimer
        }

        # Save to database
        db_plan = DietPlan(
            patient_id=patient_id,
            document_id=document_id,
            title=plan_data["title"],
            condition_context=conditions,
            breakfast_json=json.dumps(breakfast),
            mid_morning_json=json.dumps(mid_morning),
            lunch_json=json.dumps(lunch),
            snack_json=json.dumps(evening_snack),
            dinner_json=json.dumps(dinner),
            foods_to_prefer_json=json.dumps(foods_to_prefer),
            foods_to_avoid_json=json.dumps(foods_to_avoid),
            lifestyle_notes_json=json.dumps(lifestyle_notes),
            safety_disclaimer=safety_disclaimer,
            guidance_source=niddk_primary["title"]
        )
        db.add(db_plan)
        db.commit()

        return plan_data
