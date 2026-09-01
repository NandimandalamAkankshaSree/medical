import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_meal_specific_diet_responses():
    print("==================================================================")
    print("  TESTING MEAL-SPECIFIC DIET (BREAKFAST, LUNCH, DINNER, SNACKS)   ")
    print("==================================================================")

    test_cases = [
        ("BREAKFAST_GENERAL", "what should I eat for breakfast?"),
        ("BREAKFAST_DIABETES", "breakfast deit for diabetes"),
        ("LUNCH_QUERY", "what should I eat for lunch?"),
        ("DINNER_QUERY", "what is a healthy dinner for me?"),
        ("SNACKS_QUERY", "what healthy snacks can I eat?"),
        ("ALL_DAY_DIET", "what is my complete diet plan for my disease?")
    ]

    for label, query in test_cases:
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
            print(f"\n[QUERY] \"{query}\"")
            print(f"        Response Preview:\n       {safe_lines}...\n")

            if "breakfast" in query.lower():
                assert "Breakfast" in content
                assert "Balanced Lunch" not in content, "Error: Full lunch included when asking only for breakfast!"
                assert "Light Dinner" not in content, "Error: Full dinner included when asking only for breakfast!"
                print("        [PASS] Only Breakfast provided as requested!")
            elif "lunch" in query.lower():
                assert "Lunch" in content
                assert "Breakfast (" not in content
                assert "Light Dinner" not in content
                print("        [PASS] Only Lunch provided as requested!")
            elif "dinner" in query.lower():
                assert "Dinner" in content
                assert "Breakfast (" not in content
                assert "Balanced Lunch" not in content
                print("        [PASS] Only Dinner provided as requested!")
            elif "snack" in query.lower():
                assert "Snack" in content or "Nourishment" in content
                assert "Balanced Lunch" not in content
                print("        [PASS] Only Snacks provided as requested!")
            elif "complete" in query.lower():
                assert "Complete" in content or "5-Meal" in content
                print("        [PASS] Full-day 5-meal schedule provided for full diet request!")

    print("\n==================================================================")
    print("  ALL MEAL-SPECIFIC DIET QUERIES VERIFIED SUCCESSFULLY!           ")
    print("==================================================================")

if __name__ == "__main__":
    test_meal_specific_diet_responses()
