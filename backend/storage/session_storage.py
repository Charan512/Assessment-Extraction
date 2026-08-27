"""
Thread-safe in-memory session storage with automatic expiry.

All session data lives only in memory — lost on server restart.
Sessions auto-expire after the configured SESSION_EXPIRY_MINUTES.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

from config import get_settings
from core.exceptions import SessionExpiredError, SessionNotFoundError
from models.domain import Session
from models.enums import SessionStatus

logger = logging.getLogger(__name__)
settings = get_settings()


class SessionStorage:
    """
    Async-safe in-memory store for Session objects.

    Usage:
        storage = SessionStorage()
        sid = await storage.create_session()
        session = await storage.get_session(sid)
        await storage.update_session(sid, {"status": SessionStatus.PROCESSING})
    """

    def __init__(self) -> None:
        self._store: dict[str, Session] = {}
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Core CRUD
    # ------------------------------------------------------------------

    async def create_session(self) -> Session:
        """Create a new empty session and return it."""
        session = Session()
        async with self._lock:
            self._store[session.session_id] = session
        logger.info("Session created | session_id=%s", session.session_id)
        return session

    async def get_session(self, session_id: str) -> Session:
        """
        Retrieve a session by ID.

        Raises:
            SessionNotFoundError: if session_id doesn't exist.
            SessionExpiredError: if session has exceeded expiry time.
        """
        async with self._lock:
            session = self._store.get(session_id)

        if session is None:
            raise SessionNotFoundError(session_id)

        expiry = session.created_at + timedelta(minutes=settings.session_expiry_minutes)
        if datetime.utcnow() > expiry:
            await self.delete_session(session_id)
            raise SessionExpiredError(session_id)

        return session

    async def update_session(self, session_id: str, updates: dict[str, Any]) -> Session:
        """
        Apply a dict of field updates to a session.

        Example:
            await storage.update_session(sid, {"status": SessionStatus.COMPLETE})
        """
        async with self._lock:
            session = self._store.get(session_id)
            if session is None:
                raise SessionNotFoundError(session_id)

            for key, value in updates.items():
                if hasattr(session, key):
                    setattr(session, key, value)
                else:
                    logger.warning(
                        "update_session: unknown field '%s' for session %s", key, session_id
                    )

        return session

    async def delete_session(self, session_id: str) -> None:
        """Remove a session from memory."""
        async with self._lock:
            removed = self._store.pop(session_id, None)
        if removed:
            logger.info("Session deleted | session_id=%s", session_id)

    async def session_exists(self, session_id: str) -> bool:
        """Return True if the session exists and has not expired."""
        try:
            await self.get_session(session_id)
            return True
        except (SessionNotFoundError, SessionExpiredError):
            return False

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def cleanup_expired_sessions(self) -> int:
        """
        Remove all sessions that have exceeded their expiry time.
        Returns the number of sessions removed.
        Called periodically by the background cleanup task in main.py.
        """
        cutoff = datetime.utcnow() - timedelta(minutes=settings.session_expiry_minutes)
        expired_ids: list[str] = []

        async with self._lock:
            for sid, session in list(self._store.items()):
                if session.created_at < cutoff:
                    expired_ids.append(sid)

        for sid in expired_ids:
            await self.delete_session(sid)

        if expired_ids:
            logger.info("Cleaned up %d expired session(s)", len(expired_ids))

        return len(expired_ids)

    async def get_all_session_ids(self) -> list[str]:
        """Return all active session IDs (for admin/debug use)."""
        async with self._lock:
            return list(self._store.keys())

    async def active_count(self) -> int:
        """Return number of active sessions."""
        async with self._lock:
            return len(self._store)


# ---------------------------------------------------------------------------
# Background cleanup task
# ---------------------------------------------------------------------------

async def run_periodic_cleanup(storage: SessionStorage) -> None:
    """
    Infinite loop that cleans up expired sessions every CLEANUP_INTERVAL_MINUTES.
    Launched as an asyncio background task on application startup.
    """
    interval_seconds = settings.cleanup_interval_minutes * 60
    logger.info(
        "Session cleanup task started (interval: %d min)", settings.cleanup_interval_minutes
    )
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            removed = await storage.cleanup_expired_sessions()
            active = await storage.active_count()
            logger.debug(
                "Cleanup run: removed=%d, active=%d", removed, active
            )
        except Exception as exc:
            logger.error("Error during session cleanup: %s", exc)
