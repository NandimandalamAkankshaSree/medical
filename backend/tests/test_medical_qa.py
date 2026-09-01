import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_medical_questions():
    print("=== TESTING MEDICAL QUESTIONS AND TYPO TOLERANCE ===")

    test_queries = [
        # The user's exact query with typo "pottasium" and "highest value"
        "what is the highest value of pottasium for human",
        # General question about heart rate / pulse
        "what is the normal resting pulse rate for humans",
        # General question about uric acid
        "what causes high uric acid and what are its symptoms",
        # General medical question about kidney filtration
        "what does eGFR mean and how does the kidney filter blood",
        # Low value / deficiency query
        "what is the lowest value of calcium in blood"
    ]

    for q in test_queries:
        print(f"\n--- Testing Query: '{q}' ---")
        payload = {
            "patient_id": "user_11",
            "document_id": None,
            "message": q
        }
        req = urllib.request.Request(
            f"{BASE_URL}/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode("utf-8"))

        content = data.get("content", "")
        print(f"Source Type: {data.get('source_type')}")
        clean_preview = content[:350].encode('ascii', errors='replace').decode('ascii')
        print(f"Response Preview:\n{clean_preview}...\n")
        
        # Verifications
        assert "Clinical Diagnostic Marker" not in content, "Fallback generic placeholder was incorrectly returned!"
        assert len(content) > 100, "Response content is too short!"
        if "pottasium" in q:
            assert ("5.0" in content or "5.2" in content) and ("6.0" in content or "6.5" in content), "Potassium highest safe limit and critical threshold missing!"
            print(" -> PASS: Exact potassium highest values (5.0 mEq/L) & critical threshold (>= 6.0-6.5 mEq/L) properly returned!")

    print("\n=======================================================")
    print(" ALL MEDICAL QUESTIONS AND GENERAL QUERIES PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_medical_questions()
