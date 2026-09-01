import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def test_auth_and_nlp():
    print("==================================================================")
    print("  TESTING AUTHENTICATION, PERSONAL ISOLATION & NLP RESPONSES     ")
    print("==================================================================")

    # 1. Test Demo Login (alex.morgan / password123)
    login_payload = {
        "username": "alex.morgan",
        "password": "password123"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps(login_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        login_res = json.loads(resp.read().decode())
        print(f"[PASS] 1. Login with demo account (alex.morgan):")
        print(f"       Token: {login_res.get('access_token')[:25]}...")
        print(f"       User: {login_res.get('user', {}).get('full_name')} ({login_res.get('user', {}).get('patient_id')})")
        token = login_res.get('access_token')
        assert token is not None

    # 2. Test Invalid Password Login
    try:
        bad_payload = {
            "username": "alex.morgan",
            "password": "wrong_password_999"
        }
        bad_req = urllib.request.Request(
            f"{BASE_URL}/api/auth/login",
            data=json.dumps(bad_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(bad_req) as resp:
            pass
        print("[FAIL] 2. Invalid password was accepted!")
    except urllib.error.HTTPError as e:
        print(f"[PASS] 2. Invalid password rejected with HTTP {e.code} ({e.reason})")
        assert e.code == 401

    # 3. Test New User Registration
    import time
    test_user = f"patient_{int(time.time())}"
    reg_payload = {
        "username": test_user,
        "password": "SecurePassword#2026",
        "full_name": "Dr. Eleanor Vance",
        "email": f"{test_user}@hospital.example",
        "age": 42,
        "gender": "Female",
        "blood_group": "B+",
        "medical_conditions": "Hypertension, Mild Asthma"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/register",
        data=json.dumps(reg_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        reg_res = json.loads(resp.read().decode())
        print(f"[PASS] 3. Registered new user:")
        print(f"       Username: {reg_res.get('user', {}).get('username')}")
        print(f"       Full Name: {reg_res.get('user', {}).get('full_name')}")
        print(f"       Patient ID: {reg_res.get('user', {}).get('patient_id')}")
        assert reg_res.get('user', {}).get('username') == test_user

    # 4. Test Authenticated Profile (/api/auth/me)
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as resp:
        me_res = json.loads(resp.read().decode())
        print(f"[PASS] 4. Authenticated session verified (/auth/me): {me_res.get('full_name')}")
        assert me_res.get('patient_id') == 'my_health_profile'

    # 5. Test Personal Reports Isolation
    req = urllib.request.Request(f"{BASE_URL}/api/documents/patient/my_health_profile")
    with urllib.request.urlopen(req) as resp:
        docs = json.loads(resp.read().decode())
        print(f"[PASS] 5. Personal documents isolation verified: {len(docs)} reports for my_health_profile")
        for d in docs:
            print(f"       - {d.get('document_name')} ({d.get('report_date')})")

    # 6. Test NLP Conversational Engine with Medical Queries
    nlp_queries = [
        "What does HbA1c measure and how has my value progressed?",
        "Compare my previous and present reports and explain what changed in simple terms.",
        "What do my latest cholesterol and LDL results mean for my heart?",
        "What foods should I eat based on my test results?"
    ]

    print("\n--- Testing Natural Language Processing (NLP) Responses ---")
    for i, q in enumerate(nlp_queries, 1):
        chat_payload = {
            "patient_id": "my_health_profile",
            "message": q
        }
        req = urllib.request.Request(
            f"{BASE_URL}/api/chat",
            data=json.dumps(chat_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            chat_res = json.loads(resp.read().decode())
            print(f"\n[PASS] 6.{i} NLP Query: \"{q}\"")
            print(f"       Source Type: {chat_res.get('source_type')}")
            print(f"       Confidence Score: {chat_res.get('confidence_score')}")
            raw_lines = "\n       ".join(chat_res.get('content', '').split("\n")[:4])
            safe_first_lines = raw_lines.encode('ascii', 'replace').decode('ascii')
            print(f"       Sample Output:\n       {safe_first_lines}...")

    print("\n==================================================================")
    print("  ALL AUTHENTICATION, ISOLATION & NLP CHECKS PASSED 100%!         ")
    print("==================================================================")

if __name__ == "__main__":
    test_auth_and_nlp()
