import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_scope_guardrails():
    print("=== TESTING MEDICAL SCOPE & NON-MEDICAL GUARDRAILS ===")

    # 1. Non-Medical Queries that MUST be declined and ask for medical reports
    non_medical_queries = [
        "tell me a joke about dogs",
        "write a python script to sort an array",
        "who is the president of france",
        "what is the best car to buy in 2026",
        "recommend me a good action movie"
    ]

    for q in non_medical_queries:
        print(f"\n--- Testing Non-Medical Query: '{q}' ---")
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
        intent = data.get("intent", "")
        print(f"Intent: {intent} | Source: {data.get('source_type')}")
        clean_preview = content[:200].encode('ascii', errors='replace').decode('ascii')
        print(f"Response Preview:\n{clean_preview}...\n")
        
        assert intent == "OUT_OF_SCOPE_NON_MEDICAL", f"Query '{q}' should be OUT_OF_SCOPE_NON_MEDICAL but got {intent}"
        assert "upload your medical report" in content.lower(), "Response must ask the user to upload their medical reports!"
        print(f" -> PASS: Properly identified as Non-Medical and prompted for medical reports!")

    # 2. Medical Queries that MUST be answered with medical intelligence
    medical_queries = [
        ("what is the highest value of pottasium for human", "potassium"),
        ("compare my previous and present reports", "report"),
        ("what does high creatinine mean", "creatinine"),
        ("what is the normal resting pulse rate", "pulse rate"),
        ("what diet is recommended for kidney disease", "diet")
    ]

    for q, expected_term in medical_queries:
        print(f"\n--- Testing Medical Query: '{q}' ---")
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
        intent = data.get("intent", "")
        print(f"Intent: {intent} | Source: {data.get('source_type')}")
        clean_preview = content[:200].encode('ascii', errors='replace').decode('ascii')
        print(f"Response Preview:\n{clean_preview}...\n")
        
        assert intent != "OUT_OF_SCOPE_NON_MEDICAL", f"Medical query '{q}' was incorrectly rejected as out-of-scope!"
        assert len(content) > 100, "Medical response is too short!"
        print(f" -> PASS: Valid medical query answered with comprehensive clinical knowledge!")

    print("\n=======================================================")
    print(" ALL MEDICAL SCOPE GUARDRAILS VERIFIED WITH 100% SUCCESS!")
    print("=======================================================")

if __name__ == "__main__":
    test_scope_guardrails()
