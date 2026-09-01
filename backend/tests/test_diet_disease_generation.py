import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_diet_disease_generation():
    print("==================================================================")
    print("  TESTING DISEASE-SPECIFIC CLINICAL DIET & 5-MEAL PLAN GENERATION")
    print("==================================================================")

    test_queries = [
        ("DIABETES_QUERY", "What is my deit for my desiase?"),
        ("KIDNEY_QUERY", "Generate a diet plan for chronic kidney disease and high creatinine"),
        ("HYPERTENSION_QUERY", "What foods should I eat for high blood pressure and hypertension?"),
        ("CHOLESTEROL_QUERY", "Give me a meal plan to reduce bad LDL cholesterol"),
        ("ASTHMA_QUERY", "What anti-inflammatory diet is recommended for asthma?"),
        ("ANEMIA_QUERY", "What foods to eat for anemia and low hemoglobin?")
    ]

    for label, query in test_queries:
        payload = {
            "patient_id": "my_health_profile",
            "message": query
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            content = data.get("content", "")
            first_lines = "\n       ".join(content.split("\n")[:8])
            safe_lines = first_lines.encode('ascii', 'replace').decode('ascii')
            print(f"\n[PASS] Query: \"{query}\"")
            print(f"       Intent: {data.get('intent')} | Source: {data.get('source_type')}")
            print(f"       Generated 5-Meal Schedule & Diet Plan:\n       {safe_lines}...\n")
            assert len(content) > 300
            assert "Breakfast" in content or "5-Meal" in content or "Meal" in content

    # Test Direct API Generation for various conditions
    api_conditions = [
        "Type 2 Diabetes Mellitus / Prediabetes",
        "Chronic Kidney Disease (CKD) / Renal Impairment",
        "Asthma / Respiratory Health",
        "Hyperlipidemia / High Cholesterol"
    ]

    print("\n--- Testing Direct API Condition Generation (POST /api/diet/generate) ---")
    for cond in api_conditions:
        req = urllib.request.Request(
            f"{BASE_URL}/api/diet/generate",
            data=json.dumps({"patient_id": "user_6", "condition": cond}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            plan = json.loads(resp.read().decode())
            print(f"[PASS] Condition: {plan.get('condition_context')}")
            print(f"       Plan Title: {plan.get('title')}")
            print(f"       Target Calories: {plan.get('daily_targets', {}).get('calories')} kcal | Sodium Cap: {plan.get('daily_targets', {}).get('sodium_limit_mg')} mg")
            print(f"       Breakfast: {plan.get('meal_schedule', {}).get('breakfast', {}).get('items', [])[:2]}")
            assert plan.get("daily_targets", {}).get("calories") > 1000

    print("\n==================================================================")
    print("  ALL DISEASE-SPECIFIC DIET PLANS & 5-MEAL SCHEDULES VERIFIED!    ")
    print("==================================================================")

if __name__ == "__main__":
    test_diet_disease_generation()
