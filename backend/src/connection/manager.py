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
from typing import Any, Dict, Optional, Set

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
    Supports single-student 1-on-1 sessions as well as multi-student collaborative classrooms.

    Attributes:
        session_id: Unique session or room identifier (e.g. 'RAB-1234').
        output_sockets: Set of active Output WebSockets for broadcasting agent voice, transcripts, and MCP commands.
        input_sockets: Set of active Input WebSockets receiving student audio, text, and board states.
        participants: Roster of active students in the classroom session.
        is_classroom: Whether this session is running in collaborative classroom mode.
        mcp_client: Dedicated TldrawMcpClient instance.
        agent: Dedicated GeminiLiveAgent instance.
    """

    def __init__(self, session_id: str):
        """Initialize the LiveSessionContext."""
        self.session_id = session_id
        self.output_sockets: Set[WebSocket] = set()
        self.input_sockets: Set[WebSocket] = set()
        self.participants: Dict[str, Dict[str, Any]] = {}
        self.is_classroom: bool = False

        self.mcp_client = TldrawMcpClient(session_id=session_id)
        self.agent = GeminiLiveAgent(session_id=session_id, mcp_client=self.mcp_client)

        # Connect MCP client outbound transmission to this session's output broadcast
        self.mcp_client.set_send_callback(self.send_to_output)
        # Connect Agent outbound transmission to this session's output broadcast
        self.agent.set_outbound_callback(self.send_to_output)

        self._lock = asyncio.Lock()
        logger.info(
            f"[LiveSession:{self.session_id}] Context created with agent and MCP client."
        )

    @property
    def output_ws(self) -> Optional[WebSocket]:
        """Convenience property for backward compatibility (returns primary output socket)."""
        return next(iter(self.output_sockets), None) if self.output_sockets else None

    @property
    def input_ws(self) -> Optional[WebSocket]:
        """Convenience property for backward compatibility (returns primary input socket)."""
        return next(iter(self.input_sockets), None) if self.input_sockets else None

    async def send_to_output(self, message: Dict[str, Any]) -> None:
        """
        Transmit a JSON message to all connected students over their Output WebSocket channels.
        Automatically prunes any dead or disconnected sockets.

        Args:
            message: Dictionary payload to send.
        """
        async with self._lock:
            if not self.output_sockets:
                msg_type = message.get("type", "unknown")
                logger.warning(
                    f"[LiveSession:{self.session_id}] Dropping '{msg_type}' message: No Output WS connected."
                )
                return

            dead_sockets = []
            payload_str = json.dumps(message)
            msg_type = message.get("type", "unknown")

            for ws in list(self.output_sockets):
                try:
                    await ws.send_text(payload_str)
                except Exception as err:
                    logger.debug(
                        f"[LiveSession:{self.session_id}] Socket failed during send, marking dead: {err}"
                    )
                    dead_sockets.append(ws)

            for ws in dead_sockets:
                self.output_sockets.discard(ws)

            if msg_type != "audio":
                logger.info(
                    f"[LiveSession:{self.session_id}] Sent '{msg_type}' message to {len(self.output_sockets)} Output WS client(s)."
                )

    async def broadcast_roster(self) -> None:
        """Broadcast updated classroom participant roster to all connected output clients."""
        roster_msg = {
            "type": "roster_update",
            "participants": list(self.participants.values()),
            "count": len(self.participants),
        }
        await self.send_to_output(roster_msg)


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

    async def attach_output_socket(
        self,
        session_id: str,
        websocket: WebSocket,
        user_info: Optional[Dict[str, Any]] = None,
    ) -> LiveSessionContext:
        """
        Attach an Output WebSocket channel for a session/classroom.

        Args:
            session_id: The session or room identifier.
            websocket: The connected WebSocket.
            user_info: Optional participant details (user_id, name, avatar, is_host).

        Returns:
            LiveSessionContext: The updated session context.
        """
        session = await self.get_or_create_session(session_id)
        async with session._lock:
            session.output_sockets.add(websocket)
            if user_info:
                user_id = user_info.get("user_id") or f"student-{len(session.participants) + 1}"
                session.participants[user_id] = {
                    "id": user_id,
                    "name": user_info.get("name") or "Student",
                    "avatar": user_info.get("avatar") or "🎓",
                    "isHost": user_info.get("is_host", False),
                    "isMuted": True,
                    "hasRaisedHand": False,
                    "joinedAt": "Just now",
                }
                if user_info.get("is_classroom"):
                    session.is_classroom = True

        logger.info(
            f"[LiveSessionManager] Attached Output WS for session '{session_id}' (Total output clients: {len(session.output_sockets)})."
        )

        # Start the agent if not already running
        if not session.agent.is_active:
            logger.info(
                f"[LiveSessionManager] Starting GeminiLiveAgent for session '{session_id}'."
            )
            await session.agent.start()

        # If whiteboard state exists, sync snapshot to newly joined client
        if session.mcp_client.latest_board_state.elementCount > 0:
            try:
                await websocket.send_text(
                    json.dumps({
                        "type": "board_sync",
                        "payload": session.mcp_client.latest_board_state.model_dump(),
                    })
                )
            except Exception as e:
                logger.debug(f"Failed to send initial board sync: {e}")

        # Broadcast updated roster
        if session.participants:
            await session.broadcast_roster()

        return session

    async def detach_output_socket(
        self,
        session_id: str,
        websocket: WebSocket,
        user_id: Optional[str] = None,
    ) -> None:
        """
        Detach an Output WebSocket channel on disconnect.

        Args:
            session_id: The session identifier.
            websocket: The disconnected WebSocket.
            user_id: Optional user identifier to remove from roster.
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return

            async with session._lock:
                session.output_sockets.discard(websocket)
                if user_id and user_id in session.participants:
                    session.participants.pop(user_id, None)

            logger.info(
                f"[LiveSessionManager] Detached Output WS for session '{session_id}' (Remaining: {len(session.output_sockets)})."
            )

            # Broadcast updated roster
            if session.output_sockets and session.participants:
                await session.broadcast_roster()

            # If all connections have closed, stop the live agent
            if not session.output_sockets and not session.input_sockets:
                logger.info(
                    f"[LiveSessionManager] Stopping agent for session '{session_id}' (all sockets closed)."
                )
                await session.agent.stop()
                self._sessions.pop(session_id, None)

    async def attach_input_socket(
        self,
        session_id: str,
        websocket: WebSocket,
        user_info: Optional[Dict[str, Any]] = None,
    ) -> LiveSessionContext:
        """
        Attach an Input WebSocket channel for a session/classroom.

        Args:
            session_id: The session identifier.
            websocket: The connected WebSocket.
            user_info: Optional participant details.

        Returns:
            LiveSessionContext: The updated session context.
        """
        session = await self.get_or_create_session(session_id)
        async with session._lock:
            session.input_sockets.add(websocket)
            if user_info and user_info.get("is_classroom"):
                session.is_classroom = True
        logger.info(
            f"[LiveSessionManager] Attached Input WS for session '{session_id}' (Total input clients: {len(session.input_sockets)})."
        )
        return session

    async def detach_input_socket(
        self,
        session_id: str,
        websocket: WebSocket,
    ) -> None:
        """
        Detach an Input WebSocket channel on disconnect.

        Args:
            session_id: The session identifier.
            websocket: The disconnected WebSocket.
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return

            async with session._lock:
                session.input_sockets.discard(websocket)

            logger.info(
                f"[LiveSessionManager] Detached Input WS for session '{session_id}' (Remaining: {len(session.input_sockets)})."
            )
            if not session.output_sockets and not session.input_sockets:
                logger.info(
                    f"[LiveSessionManager] Stopping agent for session '{session_id}' (all sockets closed)."
                )
                await session.agent.stop()
                self._sessions.pop(session_id, None)

    async def process_input_message(
        self,
        session: LiveSessionContext,
        raw_message: str,
        sender_ws: Optional[WebSocket] = None,
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

        # 5. Curriculum Context (Topic, Modules, Notes, Questions)
        elif msg_type == "curriculum_context":
            payload = data.get("payload", {})
            if payload and isinstance(payload, dict):
                logger.info(
                    f"[LiveSessionManager:{session.session_id}] Received curriculum context: '{payload.get('topic')}'"
                )
                await session.agent.update_curriculum_context(payload)

        # 6. Classroom Presence & Interaction Events
        elif msg_type == "join_classroom":
            participant = data.get("participant", {})
            uid = participant.get("id") or f"student-{len(session.participants) + 1}"
            session.participants[uid] = {
                "id": uid,
                "name": participant.get("name", "Student"),
                "avatar": participant.get("avatar", "🎓"),
                "isHost": participant.get("isHost", False),
                "isMuted": participant.get("isMuted", True),
                "hasRaisedHand": False,
                "joinedAt": "Just now",
            }
            session.is_classroom = True
            logger.info(
                f"[LiveSessionManager:{session.session_id}] Participant '{uid}' ({session.participants[uid]['name']}) joined classroom."
            )
            await session.broadcast_roster()

        elif msg_type == "raise_hand":
            uid = data.get("userId")
            hand_raised = bool(data.get("raised", True))
            if uid and uid in session.participants:
                session.participants[uid]["hasRaisedHand"] = hand_raised
                student_name = session.participants[uid].get("name", "A student")
                logger.info(
                    f"[LiveSessionManager:{session.session_id}] Student '{student_name}' handRaised={hand_raised}."
                )
                await session.broadcast_roster()
                if hand_raised:
                    # Notify the AI tutor that a student has raised their hand
                    await session.agent.send_text_message(
                        f"[{student_name} raised their hand in the classroom with a question]"
                    )

        elif msg_type == "mute_toggle":
            uid = data.get("userId")
            is_muted = bool(data.get("isMuted", True))
            if uid and uid in session.participants:
                session.participants[uid]["isMuted"] = is_muted
                await session.broadcast_roster()

        # 7. Heartbeat / ping
        elif msg_type == "ping":
            target_ws = sender_ws or session.input_ws
            if target_ws:
                try:
                    await target_ws.send_text(json.dumps({"type": "pong"}))
                except Exception:
                    pass

        else:
            logger.debug(
                f"[LiveSessionManager:{session.session_id}] Unhandled message type: {msg_type}"
            )


# Global singleton instance
session_manager = LiveSessionManager()
