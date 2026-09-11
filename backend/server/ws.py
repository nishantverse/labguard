"""
WebSocket Event Broadcast Helpers
=================================
Centralized module for emitting real-time events to connected
frontend clients via Socket.IO.

All route modules call broadcast() here instead of importing
socketio directly, keeping the broadcast logic in one place.
"""

import logging
from flask_socketio import SocketIO

logger = logging.getLogger(__name__)

# Single instance of SocketIO used throughout the application
socketio = SocketIO()


def broadcast(event_name: str, data: dict) -> None:
    """Emit an event to ALL connected Socket.IO clients."""
    try:
        socketio.emit(event_name, data)
        logger.debug(f"Broadcast '{event_name}' → {len(str(data))} bytes")
    except Exception as exc:
        logger.error(f"Failed to broadcast '{event_name}': {exc}")
