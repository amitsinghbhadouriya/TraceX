"""
Assistant Router — Phase 7
POST /api/ml/chat/{session_id}
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core import session_store
from app.assistant.chat import get_or_create_handler, update_history

router = APIRouter(prefix="/api/ml", tags=["assistant"])
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


@router.post("/chat/{session_id}")
async def chat(session_id: str, body: ChatRequest):
    """
    Send a message to the Gemini investigation assistant.
    The LLM is grounded strictly in computed evidence via tool calls.
    """
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found or expired.")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    handler, redactor, history = get_or_create_handler(session_id)

    try:
        result = handler.chat(body.message, history)
    except Exception as e:
        logger.exception("Chat failed for session %s: %s", session_id, e)
        raise HTTPException(status_code=500, detail="Assistant failed to process the request.")

    update_history(session_id, result.get("updated_history", history))

    # Log to session (for audit)
    chat_log = session.get("chat_log", [])
    chat_log.append({
        "user_message":  body.message,
        "response":      result["response_text"],
        "tool_calls":    result["tool_calls"],
    })
    session_store.update_session(session_id, {"chat_log": chat_log})

    return {
        "session_id":    session_id,
        "response":      result["response_text"],
        "tool_calls":    result["tool_calls"],
        "message_count": len(chat_log),
    }


@router.get("/chat-history/{session_id}")
async def get_chat_history(session_id: str):
    """Return the conversation history for a session."""
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "session_id": session_id,
        "messages": session.get("chat_log", []),
    }
