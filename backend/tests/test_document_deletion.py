import urllib.request
import urllib.parse
import json
import io

BASE_URL = "http://127.0.0.1:8000/api"

def run_deletion_test():
    print("--- TESTING DOCUMENT UPLOAD AND DELETION ---")

    # 1. Fetch current documents for user_11
    req = urllib.request.Request(f"{BASE_URL}/documents/patient/user_11")
    with urllib.request.urlopen(req) as res:
        docs = json.loads(res.read().decode())
    print(f"Initial document count for user_11: {len(docs)}")

    # 2. Upload a dummy test report
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body_parts = []
    
    # File part
    file_content = b"Patient: Nandimandalam Akanksha Sree\nDate: 2026-08-26\nTest: Temporary Blood Glucose = 110 mg/dL"
    body_parts.append(f"--{boundary}".encode())
    body_parts.append(b'Content-Disposition: form-data; name="file"; filename="temporary_test_report.txt"')
    body_parts.append(b'Content-Type: text/plain\r\n')
    body_parts.append(file_content)

    # patient_id part
    body_parts.append(f"--{boundary}".encode())
    body_parts.append(b'Content-Disposition: form-data; name="patient_id"\r\n')
    body_parts.append(b'user_11')

    # document_type part
    body_parts.append(f"--{boundary}".encode())
    body_parts.append(b'Content-Disposition: form-data; name="document_type"\r\n')
    body_parts.append(b'Blood Test')

    body_parts.append(f"--{boundary}--\r\n".encode())
    body = b"\r\n".join(body_parts)

    upload_req = urllib.request.Request(
        f"{BASE_URL}/documents/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(upload_req) as res:
        upload_resp = json.loads(res.read().decode())
    
    uploaded_doc_id = upload_resp["document_id"]
    print(f"Uploaded temporary test document. ID: {uploaded_doc_id}")

    # 3. Verify it is present
    req = urllib.request.Request(f"{BASE_URL}/documents/patient/user_11")
    with urllib.request.urlopen(req) as res:
        updated_docs = json.loads(res.read().decode())
    print(f"Document count after upload: {len(updated_docs)}")
    assert any(d["id"] == uploaded_doc_id for d in updated_docs), "Uploaded doc not found in patient documents!"

    # 4. Delete the document
    del_req = urllib.request.Request(f"{BASE_URL}/documents/{uploaded_doc_id}", method="DELETE")
    with urllib.request.urlopen(del_req) as res:
        del_resp = json.loads(res.read().decode())
    print(f"Delete response: {del_resp}")

    # 5. Verify it is no longer present
    req = urllib.request.Request(f"{BASE_URL}/documents/patient/user_11")
    with urllib.request.urlopen(req) as res:
        final_docs = json.loads(res.read().decode())
    print(f"Document count after deletion: {len(final_docs)}")
    assert not any(d["id"] == uploaded_doc_id for d in final_docs), "Deleted doc still found in patient documents!"

    print("\nSUCCESS: Document deletion verified end-to-end!")

if __name__ == "__main__":
    run_deletion_test()
