"""
Dual WebSocket Router for Rabbly Live AI Tutoring.

Provides distinct WebSocket routes for:
1. Inbound data (/ws/live/{session_id}/input): Student voice PCM, text, streamed board states, and MCP tool results.
2. Outbound data (/ws/live/{session_id}/output): Agent voice PCM, live subtitles, tutor status, and dispatched MCP draw commands.
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.connection.manager import session_manager

logger = logging.getLogger("rabbly.connection.router")
logger.setLevel(logging.INFO)

connection_router = APIRouter(tags=["Live Dual WebSocket"])


@connection_router.websocket("/ws/live/{session_id}/input")
async def websocket_input_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket Input Endpoint (Frontend -> Backend).

    Receives:
        - Streamed board states ('board_state') from tldraw canvas.
        - Raw PCM audio chunks ('audio') from the student's microphone.
        - Text messages ('text') from the student chat input.
        - MCP tool results ('mcp_response') executed by the frontend tldraw MCP server.

    Args:
        websocket: The connecting client WebSocket.
        session_id: The room or session identifier.
    """
    await websocket.accept()
    logger.info(
        f"[WS:Input] Connection ACCEPTED for session '{session_id}' from client {websocket.client}"
    )

    session = await session_manager.attach_input_socket(session_id, websocket)

    try:
        while True:
            raw_text = await websocket.receive_text()
            await session_manager.process_input_message(session, raw_text)
    except WebSocketDisconnect:
        logger.info(
            f"[WS:Input] Client disconnected from input channel for session '{session_id}'"
        )
    except Exception as err:
        logger.error(
            f"[WS:Input] Unexpected error on input channel for session '{session_id}': {err}",
            exc_info=True,
        )
    finally:
        await session_manager.detach_input_socket(session_id)


@connection_router.websocket("/ws/live/{session_id}/output")
async def websocket_output_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket Output Endpoint (Backend -> Frontend).

    Transmits:
        - Agent voice PCM chunks ('audio') for playback through student speakers.
        - Live spoken subtitles and speech transcripts ('transcript').
        - Tutor operational status updates ('agent_status': 'listening', 'thinking', 'speaking', 'interrupted').
        - MCP JSON-RPC tool requests ('mcp_request') dispatched to the frontend tldraw blackboard.

    Args:
        websocket: The connecting client WebSocket.
        session_id: The room or session identifier.
    """
    await websocket.accept()
    logger.info(
        f"[WS:Output] Connection ACCEPTED for session '{session_id}' from client {websocket.client}"
    )

    await session_manager.attach_output_socket(session_id, websocket)

    try:
        # Keep connection open and await client heartbeats or disconnect
        while True:
            msg = await websocket.receive_text()
            logger.debug(
                f"[WS:Output] Received client message on output channel: {msg[:50]}"
            )
    except WebSocketDisconnect:
        logger.info(
            f"[WS:Output] Client disconnected from output channel for session '{session_id}'"
        )
    except Exception as err:
        logger.error(
            f"[WS:Output] Unexpected error on output channel for session '{session_id}': {err}",
            exc_info=True,
        )
    finally:
        await session_manager.detach_output_socket(session_id)
