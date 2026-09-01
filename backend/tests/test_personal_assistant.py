import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("=== Testing Personal Health Assistant & Visualizer Live Stack ===")
    
    # 1. Health check
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"[PASS] 1. Backend Health Check: status={res.get('status')}")
    
    # 2. Personal Profile (/me)
    req = urllib.request.Request(f"{BASE_URL}/api/patients/me")
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"[PASS] 2. Personal Profile retrieved: name={res.get('full_name')} ({res.get('patient_id')}), age={res.get('age')}, blood={res.get('blood_group')}")
        assert res.get('patient_id') == 'my_health_profile'

    # 3. Personal Reports
    req = urllib.request.Request(f"{BASE_URL}/api/documents/patient/my_health_profile")
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"[PASS] 3. Personal Documents loaded: count={len(res)}")
        for d in res:
            print(f"   - {d.get('document_name')} ({d.get('report_date')}, tag={d.get('document_type')})")
        assert len(res) >= 2

    # 4. Past vs Present Comparison Matrix & Longitudinal Trends
    req = urllib.request.Request(f"{BASE_URL}/api/visualization/trends/my_health_profile")
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        matrix = res.get('comparison_matrix', [])
        print(f"[PASS] 4. Past vs Present Matrix: {len(matrix)} biomarkers compared across {res.get('total_reports')} reports")
        for m in matrix[:4]:
            print(f"   * {m.get('parameter_name')} ({m.get('category')}): {m.get('previous_value')} -> {m.get('present_value')} {m.get('unit')} (Delta={m.get('difference')}, {m.get('percentage_change')}) [{m.get('trend_status')}]")
        assert len(matrix) >= 4

    # 5. Personal AI Assistant Chatbot (Comparative Question)
    chat_payload = {
        "patient_id": "my_health_profile",
        "message": "Compare my previous and present reports and tell me how my glucose and cholesterol levels have changed."
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/chat",
        data=json.dumps(chat_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"[PASS] 5. Personal AI Chatbot comparative answer generated:")
        print(f"   Source: {res.get('source_type')}")
        print(f"   Answer Preview: {res.get('content')[:180]}...")
        print(f"   Citations Count: {len(res.get('citations', []))}")
        assert len(res.get('content', '')) > 20

    # 6. Profile Edit API test
    update_payload = {
        "full_name": "Alex Morgan",
        "allergies": "Penicillin, Peanuts",
        "primary_doctor": "Dr. Sarah Jenkins, MD"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/patients/my_health_profile",
        data=json.dumps(update_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"[PASS] 6. Profile Edit Success: allergies='{res.get('allergies')}', doctor='{res.get('primary_doctor')}'")
        assert "Penicillin" in res.get('allergies', '')

    print("\n[SUCCESS] ALL PERSONAL HEALTH ASSISTANT LIVE CHECKS PASSED 100%!")

if __name__ == "__main__":
    test_api()
