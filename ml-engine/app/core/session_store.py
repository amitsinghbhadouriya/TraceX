"""
In-memory session store for analysis results.
Keyed by session_id (UUID). TTL cleanup runs on access.
For production: swap with Redis.
"""
import time
import uuid
from typing import Any, Optional

# { session_id: { "data": ..., "created_at": float } }
_store: dict[str, dict] = {}

DEFAULT_TTL = 3600 * 24  # 24 hours


def create_session(data: dict) -> str:
    session_id = str(uuid.uuid4())
    _store[session_id] = {"data": data, "created_at": time.time()}
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    _cleanup_expired()
    entry = _store.get(session_id)
    if entry is None:
        return None
    return entry["data"]


def update_session(session_id: str, updates: dict) -> bool:
    entry = _store.get(session_id)
    if entry is None:
        return False
    entry["data"].update(updates)
    return True


def delete_session(session_id: str) -> None:
    _store.pop(session_id, None)


def _cleanup_expired() -> None:
    now = time.time()
    expired = [sid for sid, entry in _store.items()
                if now - entry["created_at"] > DEFAULT_TTL]
    for sid in expired:
        del _store[sid]
