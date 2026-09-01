import json
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db.models import Conversation, ChatMessage
from app.services.agent_supervisor import AgentSupervisor

router = APIRouter(prefix="/chat", tags=["AI Assistant"])

class ChatRequest(BaseModel):
    patient_id: str
    document_id: Optional[int] = None
    message: str
    conversation_id: Optional[int] = None

def generate_conversation_title(message: str) -> str:
    m = message.lower()
    if any(w in m for w in ["potassium", "pottasium"]):
        return "Potassium Level Inquiry"
    elif any(w in m for w in ["compare", "previous", "present", "worsen", "improve", "diff"]):
        return "Report Comparison & Progression"
    elif any(w in m for w in ["creatinine", "egfr", "kidney", "renal", "bun"]):
        return "Kidney Function & Creatinine"
    elif any(w in m for w in ["diet", "food", "eat", "meal", "nutrition", "calories"]):
        return "Diet & Nutrition Plan"
    elif any(w in m for w in ["glucose", "sugar", "diabetes", "hba1c"]):
        return "Glycemic & Diabetes Review"
    elif any(w in m for w in ["cholesterol", "lipid", "ldl", "hdl", "triglyceride"]):
        return "Lipid Profile & Heart Health"
    elif any(w in m for w in ["hemoglobin", "hb", "anemia", "platelet", "blood"]):
        return "Blood Count & Hemoglobin"
    elif any(w in m for w in ["prescription", "medicine", "drug", "tablet", "dose"]):
        return "Medication & Prescription Guide"
    elif any(w in m for w in ["hospital", "doctor", "specialist", "clinic"]):
        return "Healthcare Provider Search"
    elif any(w in m for w in ["step", "action", "treatment", "what should i do"]):
        return "Clinical Action Steps"
    else:
        clean = message.strip()
        if len(clean) > 35:
            clean = clean[:32] + "..."
        return clean.capitalize()

@router.post("")
@router.post("/message")
def ask_ai_assistant(req: ChatRequest, db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Find or create conversation
    conv = None
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()

    if not conv:
        conv_title = generate_conversation_title(req.message)
        conv = Conversation(
            patient_id=req.patient_id,
            document_id=req.document_id,
            title=conv_title
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        patient_id=req.patient_id,
        document_id=req.document_id,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    db.commit()

    # Process query via Agent Supervisor
    response_data = AgentSupervisor.process_query(
        db,
        patient_id=req.patient_id,
        document_id=req.document_id,
        question=req.message
    )

    # Save assistant message
    asst_msg = ChatMessage(
        conversation_id=conv.id,
        patient_id=req.patient_id,
        document_id=req.document_id,
        role="assistant",
        content=response_data["content"],
        intent=response_data.get("intent"),
        source_type=response_data.get("source_type"),
        confidence_score=response_data.get("confidence", 0.95),
        citations_json=json.dumps(response_data.get("citations", []))
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)

    return {
        "conversation_id": conv.id,
        "message_id": asst_msg.id,
        "role": "assistant",
        "content": response_data["content"],
        "intent": response_data.get("intent"),
        "source_type": response_data.get("source_type"),
        "confidence": response_data.get("confidence", 0.95),
        "citations": response_data.get("citations", []),
        "is_safe": response_data.get("is_safe", True)
    }

@router.post("/conversations")
def create_conversation(
    patient_id: str = Query(...),
    document_id: Optional[int] = Query(None),
    title: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    conv = Conversation(
        patient_id=patient_id,
        document_id=document_id,
        title=title or "New Consultation Chat"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "conversation_id": conv.id,
        "patient_id": conv.patient_id,
        "title": conv.title,
        "document_id": conv.document_id,
        "created_at": str(conv.created_at)
    }

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).delete(synchronize_session=False)
    db.delete(conv)
    db.commit()
    return {"status": "success", "message": f"Conversation {conversation_id} deleted."}

@router.delete("/history/{patient_id}")
def clear_patient_chat_history(patient_id: str, db: Session = Depends(get_db)):
    convs = db.query(Conversation).filter(Conversation.patient_id == patient_id).all()
    conv_ids = [c.id for c in convs]
    if conv_ids:
        db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
        db.query(Conversation).filter(Conversation.patient_id == patient_id).delete(synchronize_session=False)
        db.commit()
    return {"status": "success", "message": f"Chat history cleared for patient {patient_id}."}

@router.get("/history/{patient_id}")
def get_chat_history(
    patient_id: str,
    document_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation).filter(Conversation.patient_id == patient_id)
    if document_id:
        query = query.filter(Conversation.document_id == document_id)
    conversations = query.order_by(Conversation.updated_at.desc()).all()

    result = []
    for c in conversations:
        msgs = db.query(ChatMessage).filter(ChatMessage.conversation_id == c.id).order_by(ChatMessage.created_at.asc()).all()
        last_msg = msgs[-1].content if msgs else ""
        result.append({
            "conversation_id": c.id,
            "title": c.title,
            "document_id": c.document_id,
            "created_at": str(c.created_at),
            "updated_at": str(c.updated_at),
            "message_count": len(msgs),
            "last_message": last_msg[:80] if last_msg else "",
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "intent": m.intent,
                    "source_type": m.source_type,
                    "confidence": m.confidence_score,
                    "citations": json.loads(m.citations_json) if m.citations_json else [],
                    "created_at": str(m.created_at)
                } for m in msgs
            ]
        })
    return result
