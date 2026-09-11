"""
Live Session Connection Manager and Coordinator.

Manages paired Dual-WebSocket connections (/input and /output) for each interactive
classroom session. Coordinates the TldrawMcpClient, the GeminiLiveAgent, and the continuous
streaming of whiteboard board states.
"""

import asyncio
import base64
import json
import logging
from typing import Any, Dict, Optional

from fastapi import WebSocket

from src.agent.gemini_live_agent import GeminiLiveAgent
from src.mcp.client import TldrawMcpClient
from src.mcp.types import BoardStatePayload

# Configure connection manager logger
logger = logging.getLogger("rabbly.connection.manager")
logger.setLevel(logging.INFO)


class LiveSessionContext:
    """
    State container for a single active classroom or tutoring session.

    Attributes:
        session_id: Unique session identifier (e.g. 'RAB-1234').
        input_ws: Active WebSocket connection for incoming client data (audio, text, board state, MCP results).
        output_ws: Active WebSocket connection for outbound agent data (audio, subtitles, status, MCP requests).
        mcp_client: Dedicated TldrawMcpClient instance.
        agent: Dedicated GeminiLiveAgent instance.
    """

    def __init__(self, session_id: str):
        """Initialize the LiveSessionContext."""
        self.session_id = session_id
        self.input_ws: Optional[WebSocket] = None
        self.output_ws: Optional[WebSocket] = None
        self.mcp_client = TldrawMcpClient(session_id=session_id)
        self.agent = GeminiLiveAgent(session_id=session_id, mcp_client=self.mcp_client)

        # Connect MCP client outbound transmission to this session's output WebSocket
        self.mcp_client.set_send_callback(self.send_to_output)
        # Connect Agent outbound transmission to this session's output WebSocket
        self.agent.set_outbound_callback(self.send_to_output)

        self._lock = asyncio.Lock()
        logger.info(
            f"[LiveSession:{self.session_id}] Context created with agent and MCP client."
        )

    async def send_to_output(self, message: Dict[str, Any]) -> None:
        """
        Transmit a JSON message to the frontend over the Output WebSocket channel.

        Args:
            message: Dictionary payload to send.
        """
        async with self._lock:
            if self.output_ws:
                try:
                    await self.output_ws.send_text(json.dumps(message))
                    msg_type = message.get("type", "unknown")
                    if msg_type != "audio":  # Avoid spamming log on raw audio frames
                        logger.info(
                            f"[LiveSession:{self.session_id}] Sent '{msg_type}' message to Output WS."
                        )
                except Exception as err:
                    logger.error(
                        f"[LiveSession:{self.session_id}] Failed to send message to Output WS: {err}",
                        exc_info=True,
                    )
            else:
                msg_type = message.get("type", "unknown")
                logger.warning(
                    f"[LiveSession:{self.session_id}] Dropping '{msg_type}' message: Output WS is not connected."
                )


class LiveSessionManager:
    """
    Global registry and coordinator for all live sessions in the Rabbly backend.
    """

    def __init__(self):
        """Initialize the LiveSessionManager."""
        self._sessions: Dict[str, LiveSessionContext] = {}
        self._lock = asyncio.Lock()
        logger.info("[LiveSessionManager] Initialized.")

    async def get_or_create_session(self, session_id: str) -> LiveSessionContext:
        """
        Retrieve existing session context or create a new one.

        Args:
            session_id: The session identifier.

        Returns:
            LiveSessionContext: The active session context.
        """
        async with self._lock:
            if session_id not in self._sessions:
                logger.info(
                    f"[LiveSessionManager] Creating new session context for '{session_id}'"
                )
                self._sessions[session_id] = LiveSessionContext(session_id=session_id)
            return self._sessions[session_id]

    async def attach_output_socket(self, session_id: str, websocket: WebSocket) -> LiveSessionContext:
        """
        Attach the Output WebSocket channel for a session.

        Args:
            session_id: The session identifier.
            websocket: The connected WebSocket.

        Returns:
            LiveSessionContext: The updated session context.
        """
        session = await self.get_or_create_session(session_id)
        session.output_ws = websocket
        logger.info(
            f"[LiveSessionManager] Attached Output WS for session '{session_id}'."
        )

        # Start the agent if not already running
        if not session.agent.is_active:
            logger.info(
                f"[LiveSessionManager] Starting GeminiLiveAgent for session '{session_id}'."
            )
            await session.agent.start()

        return session

    async def detach_output_socket(self, session_id: str) -> None:
        """
        Detach the Output WebSocket channel on disconnect.

        Args:
            session_id: The session identifier.
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.output_ws = None
                logger.info(
                    f"[LiveSessionManager] Detached Output WS for session '{session_id}'."
                )
                if not session.input_ws:
                    logger.info(
                        f"[LiveSessionManager] Stopping agent for session '{session_id}' (both sockets closed)."
                    )
                    await session.agent.stop()
                    self._sessions.pop(session_id, None)

    async def attach_input_socket(self, session_id: str, websocket: WebSocket) -> LiveSessionContext:
        """
        Attach the Input WebSocket channel for a session.

        Args:
            session_id: The session identifier.
            websocket: The connected WebSocket.

        Returns:
            LiveSessionContext: The updated session context.
        """
        session = await self.get_or_create_session(session_id)
        session.input_ws = websocket
        logger.info(
            f"[LiveSessionManager] Attached Input WS for session '{session_id}'."
        )
        return session

    async def detach_input_socket(self, session_id: str) -> None:
        """
        Detach the Input WebSocket channel on disconnect.

        Args:
            session_id: The session identifier.
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.input_ws = None
                logger.info(
                    f"[LiveSessionManager] Detached Input WS for session '{session_id}'."
                )
                if not session.output_ws:
                    logger.info(
                        f"[LiveSessionManager] Stopping agent for session '{session_id}' (both sockets closed)."
                    )
                    await session.agent.stop()
                    self._sessions.pop(session_id, None)

    async def process_input_message(
        self, session: LiveSessionContext, raw_message: str
    ) -> None:
        """
        Route incoming message from the Input WebSocket to the appropriate handler.

        Supported types:
            - 'board_state': Streamed tldraw canvas elements & spatial layout.
            - 'audio': Student microphone audio PCM (base64).
            - 'text': Student typed message.
            - 'mcp_response': JSON-RPC response from frontend tldraw MCP server.

        Args:
            session: The active LiveSessionContext.
            raw_message: Raw text received from WebSocket.
        """
        try:
            data = json.loads(raw_message)
        except json.JSONDecodeError:
            logger.warning(
                f"[LiveSessionManager:{session.session_id}] Received invalid non-JSON input: {raw_message[:100]}"
            )
            return

        msg_type = data.get("type")

        # 1. Continuous Board State Streaming from tldraw
        if msg_type == "board_state":
            payload = data.get("payload", {})
            logger.info(
                f"[LiveSessionManager:{session.session_id}] Received streamed board state: "
                f"{payload.get('elementCount', 0)} elements."
            )
            session.mcp_client.update_board_state(payload)

        # 2. Student Audio PCM Chunks (mic)
        elif msg_type == "audio":
            b64_audio = data.get("data")
            if b64_audio:
                try:
                    pcm_bytes = base64.b64decode(b64_audio)
                    await session.agent.send_audio_chunk(pcm_bytes)
                except Exception as err:
                    logger.error(
                        f"[LiveSessionManager:{session.session_id}] Failed to decode audio chunk: {err}"
                    )

        # 2b. Student Microphone Utterance End
        elif msg_type == "audio_stream_end":
            logger.info(
                f"[LiveSessionManager:{session.session_id}] Received audio_stream_end from student."
            )
            await session.agent.send_audio_stream_end()

        # 3. Student Text Message
        elif msg_type == "text":
            text = data.get("text", "")
            logger.info(
                f"[LiveSessionManager:{session.session_id}] Received student text: '{text}'"
            )
            await session.agent.send_text_message(text)

        # 4. MCP JSON-RPC Response from Frontend tldraw Server
        elif msg_type == "mcp_response":
            logger.info(
                f"[LiveSessionManager:{session.session_id}] Received MCP tool response from frontend."
            )
            session.mcp_client.handle_incoming_response(data)

        # 5. Heartbeat / ping
        elif msg_type == "ping":
            if session.input_ws:
                await session.input_ws.send_text(json.dumps({"type": "pong"}))

        else:
            logger.debug(
                f"[LiveSessionManager:{session.session_id}] Unhandled message type: {msg_type}"
            )


# Global singleton instance
session_manager = LiveSessionManager()
