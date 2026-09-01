import json
import urllib.request
import urllib.parse

BASE_URL = "http://127.0.0.1:8000/api"

def test_chat_history_features():
    print("=== TESTING CHAT HISTORY & CONVERSATION MANAGEMENT ===")

    patient_id = "user_11"

    # 1. Create a Potassium conversation
    print("\n--- 1. Sending Query 1: Potassium Level ---")
    payload1 = {
        "patient_id": patient_id,
        "document_id": None,
        "message": "What is the highest safe value of potassium for humans?"
    }
    req1 = urllib.request.Request(
        f"{BASE_URL}/chat",
        data=json.dumps(payload1).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req1) as res:
        data1 = json.loads(res.read().decode("utf-8"))
        conv1_id = data1.get("conversation_id")
        print(f"Created Conversation 1: ID = {conv1_id}")
        assert conv1_id is not None

    # 2. Append a follow-up message to the same conversation
    print("\n--- 2. Sending Follow-up in Conversation 1 ---")
    payload1_followup = {
        "patient_id": patient_id,
        "document_id": None,
        "conversation_id": conv1_id,
        "message": "What foods should I avoid if my potassium is high?"
    }
    req1_followup = urllib.request.Request(
        f"{BASE_URL}/chat",
        data=json.dumps(payload1_followup).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req1_followup) as res:
        data1_followup = json.loads(res.read().decode("utf-8"))
        print(f"Appended message to Conversation 1 (ID: {data1_followup.get('conversation_id')})")
        assert data1_followup.get("conversation_id") == conv1_id

    # 3. Create a second conversation for Report Comparison
    print("\n--- 3. Sending Query 2: Report Comparison ---")
    payload2 = {
        "patient_id": patient_id,
        "document_id": None,
        "message": "Compare my previous and present reports and explain what changed."
    }
    req2 = urllib.request.Request(
        f"{BASE_URL}/chat",
        data=json.dumps(payload2).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req2) as res:
        data2 = json.loads(res.read().decode("utf-8"))
        conv2_id = data2.get("conversation_id")
        print(f"Created Conversation 2: ID = {conv2_id}")
        assert conv2_id is not None
        assert conv2_id != conv1_id

    # 4. Fetch full chat history
    print("\n--- 4. Fetching Full Chat History List ---")
    req_history = urllib.request.Request(f"{BASE_URL}/chat/history/{patient_id}")
    with urllib.request.urlopen(req_history) as res:
        history = json.loads(res.read().decode("utf-8"))
        print(f"Total Conversations Found: {len(history)}")
        assert len(history) >= 2, "Should have at least 2 distinct conversations!"
        
        for c in history[:10]:
            clean_last = c['last_message'][:40].encode('ascii', 'ignore').decode('ascii')
            clean_title = c['title'].encode('ascii', 'ignore').decode('ascii')
            print(f" -> Session #{c['conversation_id']} | Title: '{clean_title}' | Messages: {c['message_count']} | Last: {clean_last}...")

    # 5. Delete conversation 2
    print(f"\n--- 5. Deleting Conversation {conv2_id} ---")
    req_del = urllib.request.Request(
        f"{BASE_URL}/chat/conversations/{conv2_id}",
        method="DELETE"
    )
    with urllib.request.urlopen(req_del) as res:
        del_data = json.loads(res.read().decode("utf-8"))
        print(f"Delete Response: {del_data}")
        assert del_data.get("status") == "success"

    # 6. Verify history updated
    req_history2 = urllib.request.Request(f"{BASE_URL}/chat/history/{patient_id}")
    with urllib.request.urlopen(req_history2) as res:
        history2 = json.loads(res.read().decode("utf-8"))
        ids = [c["conversation_id"] for c in history2]
        assert conv2_id not in ids, f"Conversation {conv2_id} should have been deleted!"
        print(f" -> PASS: Conversation {conv2_id} successfully deleted. Remaining: {len(history2)}")

    print("\n=======================================================")
    print(" CHAT HISTORY & SESSION MANAGEMENT VERIFIED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    test_chat_history_features()
