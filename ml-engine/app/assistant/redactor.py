"""
Phase 7 — PII Redactor
Replaces real identifiers with stable session-scoped tokens
before any data is sent to the Gemini API.
"""
import hashlib
import re


def _make_token(prefix: str, value: str) -> str:
    """Create a short stable token from an entity value."""
    digest = hashlib.sha256(value.encode()).hexdigest()[:6].upper()
    return f"{prefix}_tok_{digest}"


class SessionRedactor:
    """
    Maintains a bidirectional token↔value map for one analysis session.
    Tokens are stable (same value → same token) but non-reversible externally.
    """

    PREFIX_MAP = {
        "account":   "ACC",
        "device":    "DEV",
        "merchant":  "MCH",
        "location":  "LOC",
        "user":      "USR",
        "ip":        "IP",
    }

    def __init__(self):
        self._token_to_real: dict[str, str] = {}   # server-side only
        self._real_to_token: dict[str, str] = {}

    def tokenize(self, value: str, entity_type: str = "account") -> str:
        if not value or value in ("nan", "None", ""):
            return "[REDACTED]"
        if value in self._real_to_token:
            return self._real_to_token[value]
        prefix = self.PREFIX_MAP.get(entity_type, "ENT")
        token = _make_token(prefix, value)
        self._real_to_token[value]  = token
        self._token_to_real[token]  = value
        return token

    def detokenize(self, token: str) -> str:
        """Reverse lookup — used only server-side, never sent to LLM."""
        return self._token_to_real.get(token, token)

    def redact_entity_data(self, entity: dict) -> dict:
        """Return a copy of an entity dict with sensitive fields tokenized."""
        redacted = dict(entity)
        etype = entity.get("entity_type", "account")

        if "label" in redacted:
            redacted["label"] = self.tokenize(str(redacted["label"]), etype)
        if "node_id" in redacted:
            # node_id is like "account::A102" — tokenize the value part
            parts = redacted["node_id"].split("::", 1)
            if len(parts) == 2:
                redacted["node_id"] = f"{parts[0]}::{self.tokenize(parts[1], etype)}"

        # Remove fields that could contain raw PII
        for field in ("ip_address", "email", "phone", "name", "card_number"):
            redacted.pop(field, None)

        return redacted

    def redact_transaction(self, txn: dict) -> dict:
        """Redact a transaction dict."""
        redacted = dict(txn)
        for field, etype in [
            ("account_id", "account"),
            ("merchant_id", "merchant"),
            ("device_id", "device"),
            ("recipient_id", "account"),
            ("user_id", "user"),
            ("ip_address", "ip"),
        ]:
            if field in redacted and redacted[field]:
                redacted[field] = self.tokenize(str(redacted[field]), etype)
        # Keep only amount, timestamp, category, status, anomaly scores
        allowed = {
            "timestamp", "amount", "category", "status",
            "composite_anomaly_score", "triggered_signals",
            "account_id", "merchant_id", "device_id",  # now tokenized
        }
        return {k: v for k, v in redacted.items() if k in allowed}

    def redact_text(self, text: str) -> str:
        """Scan free text for known real values and replace with tokens."""
        for real, token in self._real_to_token.items():
            text = text.replace(real, token)
        return text
