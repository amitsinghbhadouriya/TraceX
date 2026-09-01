"""
Phase 7 — Gemini Chat Handler
Tool-calling loop grounded in computed evidence.
"""
import json
import logging
from typing import Optional

from app.core.config import get_settings
from app.assistant.redactor import SessionRedactor
from app.assistant.tools import TOOL_DECLARATIONS, ToolExecutor

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_INSTRUCTION = """You are TraceX, an expert fraud investigation assistant.

CRITICAL RULES — you MUST follow these without exception:
1. You ONLY report facts that are returned by the analysis tools. NEVER invent transactions, risk scores, entity IDs, relationships, or connections.
2. If a tool returns no data or an error, explicitly state that the information is not available in the analysis results.
3. You are a support tool for investigators. Always include a disclaimer: "This is investigative support — suspicion is not proof of fraud."
4. When presenting risk scores or signals, explain what they mean in plain language.
5. Be concise, factual, and professional. Avoid speculation beyond the evidence provided.
6. All entity identifiers shown are anonymized tokens — you must never try to reverse or guess real identities.

You have access to tools that query the fraud analysis results. Use them to answer every question about specific entities, networks, or transactions."""

MOCK_RESPONSE = """**Dataset Summary (Gemini API not configured)**

I'm running in mock mode because no Gemini API key is configured.

To enable the AI investigation assistant:
1. Add your `GEMINI_API_KEY` to `ml-engine/.env`
2. Restart the ML engine

In a live session, I would use tool calls to retrieve:
- Entity risk scores and contributing factors from the analysis engine
- Cluster summaries and network structures
- Top anomalous transactions
- Entity connection maps

> This is investigative support — suspicion is not proof of fraud."""


class GeminiChatHandler:
    def __init__(self, session_id: str, redactor: SessionRedactor):
        self.session_id = session_id
        self.redactor   = redactor
        self.executor   = ToolExecutor(session_id, redactor)
        self._client    = None
        self._model     = None
        self._setup_client()

    def _setup_client(self):
        if not settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY not set — running in mock mode.")
            return
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            tools = [{"function_declarations": TOOL_DECLARATIONS}]
            self._model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=SYSTEM_INSTRUCTION,
                tools=tools,
            )
            self._client = genai
        except Exception as e:
            logger.exception("Failed to initialise Gemini client: %s", e)

    def chat(self, user_message: str, history: list) -> dict:
        """
        Process a user message via Gemini with tool-calling.

        Args:
            user_message: Raw user query
            history: List of { role, parts } dicts (Gemini format)

        Returns:
            {
                "response_text": str,
                "tool_calls": [ { tool_name, args, result } ],
                "updated_history": list,
            }
        """
        # Redact user message before sending to LLM
        safe_message = self.redactor.redact_text(user_message)

        if not self._model:
            return {
                "response_text":  MOCK_RESPONSE,
                "tool_calls":     [],
                "updated_history": history,
            }

        tool_calls_trace = []
        try:
            chat_session = self._model.start_chat(history=history)
            response = chat_session.send_message(safe_message)

            # ── Tool-calling loop ─────────────────────────────────────────────
            while response.candidates[0].content.parts[0].function_call.name if (
                response.candidates and
                response.candidates[0].content.parts and
                hasattr(response.candidates[0].content.parts[0], "function_call") and
                response.candidates[0].content.parts[0].function_call.name
            ) else False:
                fc = response.candidates[0].content.parts[0].function_call
                tool_name = fc.name
                args = dict(fc.args) if fc.args else {}

                logger.info("Gemini tool call: %s(%s)", tool_name, args)

                # Execute tool against evidence store
                tool_result = self.executor.execute(tool_name, args)
                tool_calls_trace.append({
                    "tool_name": tool_name,
                    "args":      args,
                    "result":    tool_result,
                })

                # Send tool result back to Gemini
                from google.generativeai.types import content_types
                response = chat_session.send_message(
                    content_types.to_content({
                        "role": "tool",
                        "parts": [{"function_response": {
                            "name":     tool_name,
                            "response": {"result": json.dumps(tool_result, default=str)},
                        }}],
                    })
                )

            response_text = response.text
        except Exception as e:
            logger.exception("Gemini chat error: %s", e)
            response_text = (
                "I encountered an error processing your request. "
                "Please try again."
            )

        # Add disclaimer
        response_text += (
            "\n\n---\n*This is investigative support — suspicion is not proof of fraud.*"
        )

        updated_history = chat_session.history if hasattr(chat_session, "history") else history

        return {
            "response_text":   response_text,
            "tool_calls":      tool_calls_trace,
            "updated_history": updated_history,
        }


# ── Session-scoped handler cache ───────────────────────────────────────────────

_handlers: dict[str, dict] = {}


def get_or_create_handler(session_id: str) -> tuple[GeminiChatHandler, SessionRedactor, list]:
    """Get existing chat handler for session, or create a new one."""
    if session_id not in _handlers:
        redactor = SessionRedactor()
        handler  = GeminiChatHandler(session_id, redactor)
        _handlers[session_id] = {"handler": handler, "redactor": redactor, "history": []}
    entry = _handlers[session_id]
    return entry["handler"], entry["redactor"], entry["history"]


def update_history(session_id: str, history: list):
    if session_id in _handlers:
        _handlers[session_id]["history"] = history
