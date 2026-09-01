import os
import io
import json
import urllib.request
import urllib.parse
from PIL import Image, ImageDraw

BASE_URL = "http://127.0.0.1:8000/api"

def create_non_medical_dummy_image(path: str):
    """Creates a simple dummy non-medical image (e.g., solid colorful square)."""
    img = Image.new("RGB", (300, 300), color=(73, 109, 137))
    d = ImageDraw.Draw(img)
    d.text((20, 20), "Sample non-medical image landscape photo", fill=(255, 255, 0))
    img.save(path)

def create_multipart_form(fields: dict, files: dict):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = io.BytesIO()
    
    for k, v in fields.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode())
        body.write(f"{v}\r\n".encode())
        
    for k, (filename, filedata, content_type) in files.items():
        body.write(f"--{boundary}\r\n".encode())
        body.write(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode())
        body.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        body.write(filedata)
        body.write(b"\r\n")
        
    body.write(f"--{boundary}--\r\n".encode())
    return body.getvalue(), f"multipart/form-data; boundary={boundary}"

def test_non_medical_upload_rejection():
    print("=== TESTING NON-MEDICAL IMAGE & FILE UPLOAD REJECTION ===")

    # 1. Test uploading a non-medical image
    dummy_img_path = "tests/test_random_cat_photo.png"
    create_non_medical_dummy_image(dummy_img_path)
    
    try:
        with open(dummy_img_path, "rb") as f:
            img_bytes = f.read()

        fields = {
            "patient_id": "user_11",
            "document_type": "Medical Report",
            "report_date": "2026-08-26",
            "report_tag": "Present Report"
        }
        files = {
            "file": ("test_random_cat_photo.png", img_bytes, "image/png")
        }

        body, content_type = create_multipart_form(fields, files)
        req = urllib.request.Request(
            f"{BASE_URL}/documents/upload",
            data=body,
            headers={"Content-Type": content_type},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req) as res:
                assert False, "Non-medical image should have been REJECTED with 400 Bad Request!"
        except urllib.error.HTTPError as e:
            err_body = json.loads(e.read().decode("utf-8"))
            detail = err_body.get("detail", "")
            print(f"\n[HTTP {e.code}] Server Response Detail:\n{detail}")
            assert e.code == 400, f"Expected 400 Bad Request but got {e.code}"
            assert "correct medical report" in detail.lower() or "medical laboratory" in detail.lower(), "Error message must ask user for correct medical report!"
            print("\n -> PASS: Non-medical image successfully rejected with clean 'Please upload correct medical report' notice!")

    finally:
        if os.path.exists(dummy_img_path):
            os.remove(dummy_img_path)

    # 2. Test uploading a valid medical report docx
    sample_medical_doc = "c:/Users/Lenovo/Downloads/datasets/sample_kidney_disease_medical_report.docx"
    if os.path.exists(sample_medical_doc):
        print("\n--- Testing Valid Medical Document Upload ---")
        with open(sample_medical_doc, "rb") as f:
            doc_bytes = f.read()

        fields = {
            "patient_id": "user_11",
            "document_type": "Kidney Function Test",
            "report_date": "2026-08-26",
            "report_tag": "Present Report"
        }
        files = {
            "file": ("sample_kidney_disease_medical_report.docx", doc_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        }

        body, content_type = create_multipart_form(fields, files)
        req = urllib.request.Request(
            f"{BASE_URL}/documents/upload",
            data=body,
            headers={"Content-Type": content_type},
            method="POST"
        )

        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            doc_id = res_data.get("document_id")
            params_extracted = res_data.get("parameters_extracted")
            print(f"Uploaded Doc ID: {doc_id} | Parameters Extracted: {params_extracted}")
            assert params_extracted > 0, "Valid medical document must extract biomarkers!"
            print(" -> PASS: Valid medical report correctly accepted and parsed!")

            # Clean up test uploaded document
            del_req = urllib.request.Request(
                f"{BASE_URL}/documents/{doc_id}",
                method="DELETE"
            )
            with urllib.request.urlopen(del_req) as del_res:
                print(f" -> Cleaned up test document {doc_id}.")

    print("\n=======================================================")
    print(" NON-MEDICAL IMAGE REJECTION GUARDRAIL PASSED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_non_medical_upload_rejection()
