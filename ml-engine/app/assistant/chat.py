"""
Phase 7 — Gemini & Forensic Evidence Chat Handler
Tool-calling loop grounded strictly in computed dataset evidence.
"""
import json
import logging
import re
from typing import Optional, Any

from app.core.config import get_settings
from app.core import session_store
from app.assistant.redactor import SessionRedactor
from app.assistant.tools import TOOL_DECLARATIONS, ToolExecutor

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_INSTRUCTION = """You are TraceX, an expert financial crime and fraud network investigation copilot.

CRITICAL RULES — you MUST follow these without exception:
1. You ONLY report facts that are returned by the analysis tools. NEVER invent transactions, risk scores, entity IDs, relationships, or connections.
2. If a tool returns no data or an error, explicitly state that the information is not available in the analysis results.
3. You are a support tool for investigators. Always include a disclaimer: "This is investigative support — suspicion is not proof of fraud."
4. When presenting risk scores or signals, explain what they mean in plain language.
5. Be concise, factual, and professional. Avoid speculation beyond the evidence provided.
6. All entity identifiers shown are anonymized tokens — you must never try to reverse or guess real identities.

You have access to tools that query the fraud analysis results. Use them to answer every question about specific entities, networks, or transactions."""


class GeminiChatHandler:
    def __init__(self, session_id: str, redactor: SessionRedactor):
        self.session_id = session_id
        self.redactor   = redactor
        self.executor   = ToolExecutor(session_id, redactor)
        self._client    = None
        self._model     = None
        self._setup_client()

    def _setup_client(self):
        if not settings.gemini_api_key or "your_gemini" in settings.gemini_api_key.lower():
            logger.info("GEMINI_API_KEY not configured — using deterministic evidence engine.")
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
        Process a user message via Gemini (or built-in evidence engine fallback) with tool-calling.
        """
        safe_message = self.redactor.redact_text(user_message)

        if not self._model:
            return self._generate_evidence_response(user_message, safe_message, history)

        tool_calls_trace = []
        try:
            chat_session = self._model.start_chat(history=history)
            response = chat_session.send_message(safe_message)

            # ── Tool-calling loop ─────────────────────────────────────────────
            loop_limit = 5
            while loop_limit > 0 and (
                response.candidates and
                response.candidates[0].content.parts and
                hasattr(response.candidates[0].content.parts[0], "function_call") and
                response.candidates[0].content.parts[0].function_call.name
            ):
                loop_limit -= 1
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
            updated_history = chat_session.history if hasattr(chat_session, "history") else history

        except Exception as e:
            logger.exception("Gemini chat error, falling back to evidence engine: %s", e)
            return self._generate_evidence_response(user_message, safe_message, history)

        # Add disclaimer
        if "*This is investigative support" not in response_text:
            response_text += "\n\n---\n*This is investigative support — suspicion is not proof of fraud.*"

        return {
            "response_text":   response_text,
            "tool_calls":      tool_calls_trace,
            "updated_history": updated_history,
        }

    # ── Deterministic Forensic Evidence Engine ─────────────────────────────────

    def _generate_evidence_response(self, raw_message: str, safe_message: str, history: list) -> dict:
        """
        Analyzes the user's inquiry against active dataset evidence and formats
        a structured forensic intelligence report.
        """
        msg_lower = raw_message.lower().strip()
        tool_calls = []

        # 1. Check if user asked about a specific cluster
        cluster_match = re.search(r'(?:cluster|network|community)\s*#?\s*(\d+)', msg_lower)
        if cluster_match:
            cid = int(cluster_match.group(1))
            res = self.executor.execute("get_cluster_summary", {"cluster_id": cid})
            tool_calls.append({"tool_name": "get_cluster_summary", "args": {"cluster_id": cid}, "result": res})

            if "error" in res:
                response_text = (
                    f"### ⚠️ Cluster Investigation Report: Cluster {cid}\n\n"
                    f"{res['error']}\n\n"
                    f"**Available Cluster IDs:** {', '.join(str(c) for c in res.get('available_cluster_ids', []))}"
                )
            else:
                level_badge = "🔴 CRITICAL" if res["risk_level"] == "CRITICAL" else ("🟠 HIGH" if res["risk_level"] == "HIGH" else ("🟡 MEDIUM" if res["risk_level"] == "MEDIUM" else "🟢 LOW"))
                breakdown = ", ".join(f"{cnt} {k}s" for k, cnt in res.get("entity_type_counts", {}).items())
                factors = "\n".join(f"- **{f}**" for f in res.get("primary_factors", []))
                
                members_preview = ""
                if res.get("sample_members"):
                    sample_lines = [
                        f"- `{m['label']}` ({m['type']}) — Risk Score: **{m['risk_score']}** ({m['risk_level']}) {'⭐ [HUB]' if m.get('is_hub') else ''}"
                        for m in res["sample_members"][:8]
                    ]
                    members_preview = "\n\n**Sample Entities in Cluster:**\n" + "\n".join(sample_lines)

                response_text = (
                    f"### 🔍 Coordinated Network Analysis: Cluster {res['community_id']}\n\n"
                    f"- **Risk Assessment:** {level_badge} (**{res['risk_score']} / 100**)\n"
                    f"- **Cluster Size:** {res['member_count']} linked entities ({breakdown})\n"
                    f"- **Average Member Threat Score:** {res['avg_member_score']} / 100\n"
                    f"- **Shared Hardware / Entity Links:** {res['shared_entity_edges']} cross-account connections\n\n"
                    f"#### 🚩 Contributing Risk Factors:\n{factors}"
                    f"{members_preview}\n\n"
                    f"💡 **Investigator Recommendation:** Inspect shared merchant/device nodes to trace fund flow across this coordinated ring."
                )

        # 2. Check if user asked about multiple/all clusters or priority
        elif any(p in msg_lower for p in ["which cluster", "which network", "first cluster", "all cluster", "list cluster", "what cluster", "suspicious network", "investigate first", "clusters"]):
            res = self.executor.execute("get_all_clusters", {})
            tool_calls.append({"tool_name": "get_all_clusters", "args": {}, "result": res})

            clusters = res.get("clusters", [])
            if not clusters:
                response_text = "### ℹ️ Suspicious Networks\n\nNo clusters or community graphs have been computed for this dataset yet. Please run full analysis first."
            else:
                top = clusters[0]
                lines = []
                for c in clusters[:6]:
                    badge = "🔴" if c["risk_level"] == "CRITICAL" else ("🟠" if c["risk_level"] == "HIGH" else "🟡")
                    lines.append(
                        f"- {badge} **Cluster {c['community_id']}** — Score: **{c['risk_score']}** ({c['risk_level']}) | {c['member_count']} entities | {c['shared_entity_edges']} shared links"
                    )

                response_text = (
                    f"### 🎯 Priority Network Investigation Plan\n\n"
                    f"Based on computed Louvain community detection and centrality metrics, **Cluster {top['community_id']}** should be investigated first:\n\n"
                    f"- **Priority Target:** Cluster {top['community_id']} (Risk Score: **{top['risk_score']} / 100**)\n"
                    f"- **Key Driver:** {top['primary_factors'][0] if top.get('primary_factors') else 'Multiple coordinated transactions'}\n\n"
                    f"#### 📊 Ranked Network Clusters:\n" + "\n".join(lines) + "\n\n"
                    f"👉 *Ask `Check cluster {top['community_id']}` to drill into individual members and shared hardware.*"
                )

        # 3. Check if user asked about a specific entity (Account / Merchant / Device)
        elif any(k in msg_lower for k in ["account", "entity", "acc_", "merch_", "dev_", "user", "who is", "why is"]):
            # Extract potential entity token
            tokens = re.findall(r'[\w\-]+::[\w\-]+|acc_[\w\-]+|merch_[\w\-]+|dev_[\w\-]+|tok_[\w\-]+', msg_lower)
            ent_id = tokens[0] if tokens else "account::unknown"
            
            res = self.executor.execute("get_entity_risk", {"entity_id": ent_id})
            tool_calls.append({"tool_name": "get_entity_risk", "args": {"entity_id": ent_id}, "result": res})

            if "error" in res:
                # Fallback to high risk entities
                hres = self.executor.execute("get_high_risk_entities", {"min_score": 50, "limit": 5})
                tool_calls.append({"tool_name": "get_high_risk_entities", "args": {"min_score": 50, "limit": 5}, "result": hres})
                
                ents_list = "\n".join(f"- `{e['entity_type']} {e.get('label', '')}` (Risk: **{e['risk_score']}**) — {e['top_factor']}" for e in hres.get("entities", []))
                response_text = (
                    f"### ℹ️ Entity Query\n\n"
                    f"Could not find exact match for `{ent_id}`. Here are the top flagged entities in this dataset:\n\n"
                    f"{ents_list if ents_list else 'No high-risk entities detected.'}"
                )
            else:
                cres = self.executor.execute("get_entity_connections", {"entity_id": ent_id})
                tool_calls.append({"tool_name": "get_entity_connections", "args": {"entity_id": ent_id}, "result": cres})
                
                factors = "\n".join(f"- {f}" for f in res.get("contributing_factors", []))
                response_text = (
                    f"### 👤 Entity Dossier: `{res['entity_id']}`\n\n"
                    f"- **Type:** `{res['entity_type'].upper()}`\n"
                    f"- **Threat Score:** **{res['risk_score']} / 100** ({res['risk_level']})\n"
                    f"- **Assigned Cluster:** Cluster {res.get('community_id', 'N/A')}\n"
                    f"- **Graph Connections:** {res.get('connection_count', 0)} links ({'⭐ Hub Entity' if res.get('is_hub') else 'Standard Node'})\n\n"
                    f"#### 📌 Primary Risk Factors:\n{factors}"
                )

        # 4. Check if user asked about anomalies or top transactions
        elif any(p in msg_lower for p in ["anomaly", "anomalies", "top transaction", "anomalous transaction", "highest risk", "unusual"]):
            res = self.executor.execute("get_top_anomalous_transactions", {"n": 5, "min_score": 0.3})
            tool_calls.append({"tool_name": "get_top_anomalous_transactions", "args": {"n": 5, "min_score": 0.3}, "result": res})

            txns = res.get("transactions", [])
            if not txns:
                response_text = "### ℹ️ Anomaly Report\n\nNo anomalous transactions found above the threshold."
            else:
                txn_lines = []
                for t in txns:
                    sigs = ", ".join(t.get("triggered_signals", [])) or "Multivariate outlier"
                    txn_lines.append(
                        f"- **Account:** `{t.get('account_id', 'N/A')}` | **Amount:** `${t.get('amount', 0):,.2f}` | **Anomaly Score:** `{t.get('composite_anomaly_score', 0):.2f}`\n  *Signals:* {sigs}"
                    )

                response_text = (
                    f"### ⚡ Top Flagged Transaction Anomalies\n\n"
                    f"Isolation Forest & behavioral signal detectors identified the following top outlier transactions:\n\n"
                    + "\n\n".join(txn_lines)
                )

        # 5. Default: Dataset Executive Summary
        else:
            res = self.executor.execute("get_dataset_summary", {})
            tool_calls.append({"tool_name": "get_dataset_summary", "args": {}, "result": res})

            response_text = (
                f"### 📋 Case Intelligence Briefing: `{res.get('filename', 'Dataset')}`\n\n"
                f"- **Total Ledger Transactions:** {res.get('total_transactions', 0):,} records\n"
                f"- **Anomalies Detected:** {res.get('anomalous_count', 0)} ({res.get('anomaly_rate', 0)*100:.1f}% rate)\n"
                f"- **Monitored Entities:** {res.get('total_entities', 0)} nodes across {len(res.get('available_entity_types', []))} entity types\n"
                f"- **High-Risk Entities:** {res.get('high_risk_entities', 0)} high-risk, {res.get('critical_entities', 0)} critical\n"
                f"- **Identified Fraud Rings:** {res.get('suspicious_networks', 0)} suspicious network clusters\n\n"
                f"💡 **Suggested Questions:**\n"
                f"- *\"Which network cluster should I investigate first?\"*\n"
                f"- *\"Check cluster 0\"*\n"
                f"- *\"Show top anomalous transactions\"*"
            )

        response_text += "\n\n---\n*This is investigative support — suspicion is not proof of fraud.*"

        new_history = list(history) + [
            {"role": "user", "parts": [safe_message]},
            {"role": "model", "parts": [response_text]}
        ]

        return {
            "response_text":   response_text,
            "tool_calls":      tool_calls,
            "updated_history": new_history,
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
