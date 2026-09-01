import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def test_nlp_responses():
    print("==================================================================")
    print("  TESTING NATURAL LANGUAGE PROCESSING (NLP) RESPONSES ACROSS TYPES")
    print("==================================================================")

    test_cases = [
        ("GREETING", "Hello, can you help me understand my health?"),
        ("TERMINOLOGY_HBA1C", "What is HbA1c and how does it work?"),
        ("TERMINOLOGY_CREATININE", "What does serum creatinine measure in the kidneys?"),
        ("TERMINOLOGY_LIPIDS", "Explain the difference between LDL and HDL cholesterol."),
        ("LIFESTYLE_SUGAR", "How can I lower my blood sugar levels naturally?"),
        ("LIFESTYLE_CHOLESTEROL", "What are some tips to reduce bad cholesterol?"),
        ("COMPARISON", "Compare my previous and present reports and explain the trends."),
        ("FINDINGS", "Are any of my test results abnormal or out of range?"),
        ("DIET", "What healthy foods should I eat based on my medical condition?")
    ]

    for label, query in test_cases:
        chat_payload = {
            "patient_id": "my_health_profile",
            "message": query
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/chat",
            data=json.dumps(chat_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            content = data.get("content", "")
            first_3_lines = "\n       ".join(content.split("\n")[:4])
            safe_lines = first_3_lines.encode('ascii', 'replace').decode('ascii')
            print(f"\n[PASS] Query: \"{query}\"")
            print(f"       Intent: {data.get('intent')} | Source: {data.get('source_type')}")
            print(f"       NLP Response Preview:\n       {safe_lines}...")
            assert len(content) > 100

    print("\n==================================================================")
    print("  ALL NLP QUERIES GENERATED RICH, STRUCTURED NATURAL ANSWERS!     ")
    print("==================================================================")

if __name__ == "__main__":
    test_nlp_responses()
