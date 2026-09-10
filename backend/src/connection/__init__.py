"""
Connection package for Rabbly live streaming and WebSocket coordination.

Provides the dual WebSocket router and LiveSessionManager for bidirectional audio,
subtitles, tldraw board state streaming, and MCP tool orchestration.
"""

from src.connection.manager import LiveSessionContext, LiveSessionManager, session_manager
from src.connection.router import connection_router

__all__ = [
    "connection_router",
    "session_manager",
    "LiveSessionManager",
    "LiveSessionContext",
]
