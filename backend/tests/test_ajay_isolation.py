import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_user_isolation():
    print("==================================================================")
    print("  TESTING COMPLETE USER & REPORT ISOLATION (AJAY VS ALEX)        ")
    print("==================================================================")

    # 1. Register new user "ajay"
    ts = int(time.time())
    ajay_username = f"ajay_{ts}"
    reg_payload = {
        "username": ajay_username,
        "password": "Password123!",
        "full_name": "Ajay Kumar",
        "email": f"ajay_{ts}@example.com",
        "age": 29,
        "gender": "Male",
        "blood_group": "A+",
        "medical_conditions": "Asthma, General Wellness"
    }

    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/register",
        data=json.dumps(reg_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        reg_data = json.loads(resp.read().decode())
        ajay_token = reg_data.get("access_token")
        ajay_user = reg_data.get("user", {})
        ajay_patient_id = ajay_user.get("patient_id")
        print(f"[PASS] 1. Registered user: {ajay_user.get('full_name')} (Username: {ajay_username})")
        print(f"       Patient ID: {ajay_patient_id}")
        assert ajay_patient_id.startswith("user_")
        assert ajay_user.get("full_name") == "Ajay Kumar"

    # 2. Check /api/patients/me with Ajay's token
    req = urllib.request.Request(
        f"{BASE_URL}/api/patients/me",
        headers={"Authorization": f"Bearer {ajay_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        me_data = json.loads(resp.read().decode())
        print(f"[PASS] 2. GET /api/patients/me with Ajay's token:")
        print(f"       Returned Profile Name: {me_data.get('full_name')}")
        print(f"       Returned Patient ID: {me_data.get('patient_id')}")
        print(f"       Blood Group: {me_data.get('blood_group')}")
        # MUST BE AJAY, NOT ALEX!
        assert me_data.get("full_name") == "Ajay Kumar"
        assert me_data.get("patient_id") == ajay_patient_id
        assert me_data.get("blood_group") == "A+"

    # 3. Check Ajay's documents list (MUST BE 0, NOT Alex's 3 reports)
    req = urllib.request.Request(
        f"{BASE_URL}/api/documents/patient/{ajay_patient_id}",
        headers={"Authorization": f"Bearer {ajay_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        docs = json.loads(resp.read().decode())
        print(f"[PASS] 3. Ajay's initial reports count: {len(docs)} (Strictly isolated!)")
        assert len(docs) == 0

    # 4. Check Ajay's prescriptions list (MUST BE 0, NOT Alex's)
    req = urllib.request.Request(
        f"{BASE_URL}/api/prescriptions/patient/{ajay_patient_id}",
        headers={"Authorization": f"Bearer {ajay_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        rxs = json.loads(resp.read().decode())
        print(f"[PASS] 4. Ajay's initial prescriptions count: {len(rxs)} (Strictly isolated!)")
        assert len(rxs) == 0

    # 5. Upload a document specifically for Ajay
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="ajay_annual_blood_check.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
        f"PDF-RAW-REPORT-CONTENT-AJAY-HEMOGLOBIN-14.8\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="patient_id"\r\n\r\n'
        f"{ajay_patient_id}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="document_type"\r\n\r\n'
        f"Blood Report\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="report_date"\r\n\r\n'
        f"2026-08-20\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="report_tag"\r\n\r\n'
        f"Present Report\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/documents/upload",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {ajay_token}"
        }
    )
    with urllib.request.urlopen(req) as resp:
        up_res = json.loads(resp.read().decode())
        print(f"[PASS] 5. Uploaded personal report for Ajay: {up_res.get('document_name')}")
        assert up_res.get("patient_id") == ajay_patient_id

    # 6. Verify Ajay now has exactly 1 report
    req = urllib.request.Request(
        f"{BASE_URL}/api/documents/patient/{ajay_patient_id}",
        headers={"Authorization": f"Bearer {ajay_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        ajay_docs = json.loads(resp.read().decode())
        print(f"[PASS] 6. Ajay's updated reports count: {len(ajay_docs)}")
        assert len(ajay_docs) == 1
        assert ajay_docs[0]["document_name"] == "ajay_annual_blood_check.pdf"

    # 7. Check Alex Morgan's reports to verify zero cross-contamination
    alex_login_req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps({"username": "alex.morgan", "password": "password123"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(alex_login_req) as resp:
        alex_token = json.loads(resp.read().decode()).get("access_token")

    req = urllib.request.Request(
        f"{BASE_URL}/api/patients/me",
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        alex_profile = json.loads(resp.read().decode())
        print(f"[PASS] 7. Logged back in as Alex:")
        print(f"       Name: {alex_profile.get('full_name')} (ID: {alex_profile.get('patient_id')})")
        assert alex_profile.get("full_name") == "Alex Morgan"

    req = urllib.request.Request(
        f"{BASE_URL}/api/documents/patient/my_health_profile",
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        alex_docs = json.loads(resp.read().decode())
        print(f"       Alex's reports count: {len(alex_docs)}")
        # Verify Ajay's report is NOT in Alex's list
        doc_names = [d["document_name"] for d in alex_docs]
        assert "ajay_annual_blood_check.pdf" not in doc_names
        print(f"       Alex's reports: {doc_names}")

    print("\n==================================================================")
    print("  SUCCESS: ABSOLUTE REPORT ISOLATION VERIFIED FOR ALL USERS!      ")
    print("==================================================================")

if __name__ == "__main__":
    test_user_isolation()
