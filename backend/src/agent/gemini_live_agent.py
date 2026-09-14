"""
Gemini Live Real-Time Multimodal Agent.

This module implements the Rabbly AI Tutor agent using Google GenAI SDK (google-genai).
It manages bidirectional audio streaming with Gemini Live models (e.g. gemini-2.5-flash-native-audio-latest),
integrates the Python tldraw MCP client to execute whiteboard drawing tools, tracks student
interruptions, and coordinates voice/subtitles with blackboard illustrations.
"""

import asyncio
import base64
import logging
import os
from typing import Any, Callable, Coroutine, Dict, List, Optional

from google import genai
from google.genai import types as genai_types
from google.genai import live

from src.mcp.client import TldrawMcpClient
from src.prompt.tutor_prompt import (
    SYSTEM_TUTOR_PROMPT,
    build_curriculum_instructions,
    build_initial_greeting_prompt,
    get_system_prompt,
)
from src.services.curriculum import get_curriculum_plan_for_session

# Configure module-level logger
logger = logging.getLogger("rabbly.agent.gemini_live")
logger.setLevel(logging.INFO)


class GeminiLiveAgent:
    """
    Rabbly AI Tutor real-time agent powered by Google GenAI Live multimodal streaming.

    Attributes:
        session_id: Unique session identifier for the live classroom.
        mcp_client: TldrawMcpClient instance providing tool execution on the blackboard.
        outbound_callback: Coroutine to push messages (audio, transcripts, status) to the Output WebSocket.
        model_name: Gemini model name (defaults to 'gemini-2.5-flash-native-audio-latest' or GEMINI_LIVE_MODEL env).
        is_active: Whether the agent is currently connected and streaming.
    """

    def __init__(
        self,
        session_id: str,
        mcp_client: TldrawMcpClient,
        outbound_callback: Optional[Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]] = None,
        model_name: Optional[str] = None,
        curriculum_data: Optional[Dict[str, Any]] = None,
        voice_name: Optional[str] = None,
    ):
        """
        Initialize the Gemini Live Agent.

        Args:
            session_id: Live session or room identifier.
            mcp_client: Bound TldrawMcpClient for whiteboard tool calls.
            outbound_callback: Callback to emit messages out to the client.
            model_name: Optional custom model name.
            curriculum_data: Optional pre-loaded curriculum plan dictionary.
            voice_name: Gemini voice persona (Aoede, Puck, Fenrir, Kore, Charon).
        """
        self.session_id = session_id
        self.mcp_client = mcp_client
        self.outbound_callback = outbound_callback
        self.curriculum_data = curriculum_data
        self.voice_name = voice_name or "Aoede"

        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_name = (
            model_name
            or os.getenv("GEMINI_LIVE_MODEL")
            or "gemini-3.1-flash-live-preview"
        )

        self.is_active = False
        self.is_paused = False
        self._is_interrupted = False
        self._session_context: Optional[Any] = None
        self._session: Optional[live.AsyncSession] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._client: Optional[genai.Client] = None

        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Initialized with model '{self.model_name}'. "
            f"API Key present: {bool(self.api_key)}"
        )

    def set_curriculum_data(self, curriculum_data: Dict[str, Any]) -> None:
        """Assign or update the curriculum data for this session."""
        self.curriculum_data = curriculum_data
        if curriculum_data and isinstance(curriculum_data, dict):
            voice = curriculum_data.get("aiVoice") or curriculum_data.get("ai_voice")
            if voice and voice in {"Aoede", "Puck", "Fenrir", "Kore", "Charon"}:
                self.voice_name = voice

    def set_voice(self, voice_name: str) -> None:
        """Sets or updates the voice persona for this agent."""
        if voice_name and voice_name in {"Aoede", "Puck", "Fenrir", "Kore", "Charon"}:
            self.voice_name = voice_name
            logger.info(f"[GeminiLiveAgent:{self.session_id}] Voice persona set to '{self.voice_name}'.")

    def set_outbound_callback(
        self, callback: Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]
    ) -> None:
        """
        Configure the outbound WebSocket message callback.

        Args:
            callback: Async function to transmit dicts over the Output WebSocket.
        """
        self.outbound_callback = callback
        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Outbound callback attached."
        )

    async def emit_to_frontend(self, message: Dict[str, Any]) -> None:
        """Pushes a message safely to the frontend via the outbound callback."""
        if self.outbound_callback:
            try:
                await self.outbound_callback(message)
            except Exception as e:
                logger.error(f"[GeminiLiveAgent:{self.session_id}] Error emitting: {e}")

    async def _emit_status(self, status: str, text: Optional[str] = None):
        """Helper to emit agent status changes."""
        await self.emit_to_frontend(
            {
                "type": "agent_status",
                "sessionId": self.session_id,
                "status": status,
                "text": text,
            }
        )

    async def _emit_interrupted(self):
        """Helper to emit agent interrupted event."""
        await self.emit_to_frontend(
            {
                "type": "agent_status",
                "sessionId": self.session_id,
                "status": "interrupted",
            }
        )

    async def pause_agent(self) -> None:
        """Pause agent vocalization and speech output."""
        self.is_paused = True
        self._is_interrupted = True
        logger.info(f"[GeminiLiveAgent:{self.session_id}] Agent paused.")
        await self.emit_to_frontend(
            {
                "type": "agent_status",
                "sessionId": self.session_id,
                "status": "paused",
                "message": "Lecture Paused",
            }
        )

    async def resume_agent(self) -> None:
        """Resume agent interaction."""
        self.is_paused = False
        self._is_interrupted = False
        logger.info(f"[GeminiLiveAgent:{self.session_id}] Agent resumed.")
        await self.emit_to_frontend(
            {
                "type": "agent_status",
                "sessionId": self.session_id,
                "status": "listening",
                "message": "Ready",
            }
        )

    async def interrupt_agent(self) -> None:
        """Handle student barge-in interruption."""
        self._is_interrupted = True
        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Student barged in / interrupted."
        )
        await self.emit_to_frontend(
            {
                "type": "agent_status",
                "sessionId": self.session_id,
                "status": "interrupted",
            }
        )

    def _build_live_config(self) -> genai_types.LiveConnectConfig:
        """Constructs the LiveConnectConfig for Gemini Live session."""
        tools = self.mcp_client.get_genai_tools()

        system_prompt = get_system_prompt(self.curriculum_data)

        # Dynamic voice persona selection
        voice = self.voice_name or "Aoede"
        if self.curriculum_data and isinstance(self.curriculum_data, dict):
            cand = self.curriculum_data.get("aiVoice") or self.curriculum_data.get("ai_voice")
            if cand and cand in {"Aoede", "Puck", "Fenrir", "Kore", "Charon"}:
                voice = cand

        return genai_types.LiveConnectConfig(
            response_modalities=[genai_types.Modality.AUDIO],
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name=voice
                    )
                )
            ),
            system_instruction=genai_types.Content(
                parts=[genai_types.Part.from_text(text=system_prompt)]
            ),
            tools=tools,
            output_audio_transcription=genai_types.AudioTranscriptionConfig(),
        )

    @staticmethod
    def _normalize_tool_result(result: Any) -> Dict[str, Any]:
        """
        Ensure tool result sent to Gemini FunctionResponse is a clean JSON dictionary
        with an 'output' or 'error' key, avoiding nested MCP schema mismatches that can trigger 1011 errors.
        """
        if isinstance(result, dict):
            if result.get("isError") or "error" in result:
                err = result.get("error")
                if isinstance(err, dict) and "message" in err:
                    err = err["message"]
                return {"error": str(err or "Tool execution failed")}
            if "content" in result and isinstance(result["content"], list):
                texts = [
                    str(c.get("text", ""))
                    for c in result["content"]
                    if isinstance(c, dict) and "text" in c
                ]
                return {"output": "\n".join(texts) if texts else "Success"}
            if "output" in result:
                return {"output": result["output"]}
            if "result" in result:
                return {"output": result["result"]}
            return {"output": result}
        return {"output": str(result)}

    async def _reconnect_session(self) -> bool:
        """
        Attempts to cleanly re-establish the live WebSocket connection with Gemini
        after a transient server drop (e.g. 1011 internal error).
        """
        for attempt in range(1, 4):
            try:
                logger.info(
                    f"[GeminiLiveAgent:{self.session_id}] Reconnecting to Gemini Live (attempt {attempt}/3)..."
                )
                await asyncio.sleep(0.75 * attempt)
                if self._session_context:
                    try:
                        await self._session_context.__aexit__(None, None, None)
                    except Exception:
                        pass
                if not self._client:
                    self._client = genai.Client(api_key=self.api_key)
                config = self._build_live_config()
                self._session_context = self._client.aio.live.connect(
                    model=self.model_name, config=config
                )
                self._session = await self._session_context.__aenter__()
                logger.info(
                    f"[GeminiLiveAgent:{self.session_id}] Reconnected successfully to Gemini Live!"
                )
                # Inform frontend of active listening status
                await self.emit_to_frontend(
                    {
                        "type": "agent_status",
                        "sessionId": self.session_id,
                        "status": "listening",
                        "message": "Reconnected. AI Tutor is active.",
                    }
                )
                # Prompt the live agent to continue seamlessly
                try:
                    topic = (
                        self.curriculum_data.get("topic", "the current topic")
                        if self.curriculum_data
                        else "the current topic"
                    )
                    board = self.mcp_client.get_latest_board_state()
                    if self._session:
                        await self._session.send_client_content(
                            turns=[
                                genai_types.Content(
                                    role="user",
                                    parts=[
                                        genai_types.Part.from_text(
                                            text=(
                                                f"Connection recovered. Current blackboard has {board.elementCount} elements ({board.spatialSummary}). "
                                                f"Please continue teaching {topic} on the blackboard seamlessly where you left off. "
                                                "Call get_board_state or your drawing tools as needed and speak naturally to the student."
                                            )
                                        )
                                    ],
                                )
                            ],
                            turn_complete=True,
                        )
                except Exception as prompt_err:
                    logger.warning(
                        f"[GeminiLiveAgent:{self.session_id}] Could not send post-reconnect prompt: {prompt_err}"
                    )
                return True
            except Exception as conn_err:
                logger.warning(
                    f"[GeminiLiveAgent:{self.session_id}] Reconnect attempt {attempt} failed: {conn_err}"
                )
        return False

    async def start(self) -> None:
        """
        Connect to the Gemini Live Multimodal WebSocket API and launch the receive loop.
        Fallbacks to simulation loop if API key is not configured.
        """
        if not self.api_key:
            logger.warning(
                f"[GeminiLiveAgent:{self.session_id}] No GEMINI_API_KEY configured. "
                "Starting in Interactive Simulation Mode."
            )
            self.is_active = True
            self._receive_task = asyncio.create_task(self._simulation_loop())
            return

        try:
            logger.info(
                f"[GeminiLiveAgent:{self.session_id}] Connecting to Gemini Live API via google-genai..."
            )
            self._client = genai.Client(api_key=self.api_key)

            # Pre-load curriculum plan and restore board memory for this session if not provided
            if not self.curriculum_data:
                try:
                    self.curriculum_data = get_curriculum_plan_for_session(self.session_id)
                    if self.curriculum_data:
                        logger.info(
                            f"[GeminiLiveAgent:{self.session_id}] Pre-loaded curriculum plan for topic: '{self.curriculum_data.get('topic')}'"
                        )
                        if self.curriculum_data.get("board_state"):
                            self.mcp_client.restore_from_saved_state(self.curriculum_data["board_state"])
                except Exception as plan_err:
                    logger.warning(
                        f"[GeminiLiveAgent:{self.session_id}] Could not pre-fetch curriculum plan: {plan_err}"
                    )
            elif self.curriculum_data and self.curriculum_data.get("board_state"):
                self.mcp_client.restore_from_saved_state(self.curriculum_data["board_state"])

            config = self._build_live_config()

            # Initiate async bidirectional live session and preserve context manager to prevent premature GC closure
            self._session_context = self._client.aio.live.connect(
                model=self.model_name, config=config
            )
            self._session = await self._session_context.__aenter__()
            self.is_active = True

            logger.info(
                f"[GeminiLiveAgent:{self.session_id}] Successfully connected to Gemini Live session!"
            )

            # Start background message processing loop
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Notify frontend that tutor is listening and ready
            await self.emit_to_frontend(
                {
                    "type": "agent_status",
                    "sessionId": self.session_id,
                    "status": "listening",
                    "message": "Rabbly AI Tutor is live and listening.",
                }
            )

            # Proactively draw the lesson topic title at (80, 50) so the board is visibly active from opening second
            try:
                board = self.mcp_client.get_latest_board_state()
                if board.elementCount == 0:
                    topic = (
                        (self.curriculum_data.get("topic") if self.curriculum_data else None)
                        or "STEM & Mathematics"
                    )
                    logger.info(
                        f"[GeminiLiveAgent:{self.session_id}] Pre-populating board header for topic: '{topic}'"
                    )
                    await self.mcp_client.call_tool(
                        "write_text",
                        {
                            "text": topic,
                            "x": 80,
                            "y": 50,
                            "size": "l",
                            "color": "violet",
                            "font": "sans",
                        },
                    )
            except Exception as init_board_err:
                logger.warning(
                    f"[GeminiLiveAgent:{self.session_id}] Could not pre-populate board header: {init_board_err}"
                )

            # Proactively prompt the live teacher to greet the student with the curriculum topic or memory checkpoint
            try:
                greeting_text = build_initial_greeting_prompt(self.curriculum_data)
                board = self.mcp_client.get_latest_board_state()
                if board and board.elementCount > 0:
                    greeting_text += (
                        f" (Whiteboard currently has {board.elementCount} elements on it: {board.spatialSummary}.)"
                    )
                if self._session:
                    await self._session.send_client_content(
                        turns=[
                            genai_types.Content(
                                role="user",
                                parts=[genai_types.Part.from_text(text=greeting_text)],
                            )
                        ],
                        turn_complete=True,
                    )
                    logger.info(
                        f"[GeminiLiveAgent:{self.session_id}] Dispatched curriculum greeting prompt to live session via send_client_content."
                    )
            except Exception as greet_err:
                logger.warning(
                    f"[GeminiLiveAgent:{self.session_id}] Could not dispatch initial greeting: {greet_err}"
                )

        except Exception as err:
            logger.error(
                f"[GeminiLiveAgent:{self.session_id}] Failed to connect to Gemini Live: {err}",
                exc_info=True,
            )
            self.is_active = True
            # Fallback to simulation loop so the UI remains fully functional
            logger.info(
                f"[GeminiLiveAgent:{self.session_id}] Falling back to Interactive Simulation Mode."
            )
            self._receive_task = asyncio.create_task(self._simulation_loop())

    async def _receive_loop(self) -> None:
        """
        Continuously receives messages from the Gemini Live session across multiple turns,
        parses audio/text, executes tool calls via the MCP client, and auto-recovers from transient errors.
        """
        logger.info(f"[GeminiLiveAgent:{self.session_id}] Started receive loop.")
        try:
            while self.is_active:
                if not self._session:
                    reconnected = await self._reconnect_session()
                    if not reconnected:
                        logger.error(
                            f"[GeminiLiveAgent:{self.session_id}] Could not establish live session, falling back to simulation."
                        )
                        asyncio.create_task(self._simulation_loop())
                        break

                try:
                    assert self._session is not None
                    async for response in self._session.receive():
                        # 1. Handle Model Content (Audio & Transcript)
                        server_content = response.server_content
                        if server_content:
                            if server_content.interrupted:
                                logger.info(
                                    f"[GeminiLiveAgent:{self.session_id}] Student interrupted the agent."
                                )
                                self._is_interrupted = True
                                await self.emit_to_frontend(
                                    {
                                        "type": "agent_status",
                                        "sessionId": self.session_id,
                                        "status": "interrupted",
                                    }
                                )
                                continue

                            # Suppress trailing model_turn parts from interrupted turn or when paused
                            if self.is_paused or self._is_interrupted:
                                if server_content.turn_complete:
                                    self._is_interrupted = False
                                continue

                            if server_content.turn_complete:
                                self._is_interrupted = False

                            # Audio Transcription chunk from Gemini Live
                            if hasattr(server_content, "output_transcription") and server_content.output_transcription:
                                ot = server_content.output_transcription
                                ot_text = getattr(ot, "text", "") if hasattr(ot, "text") else str(ot or "")
                                if ot_text and ot_text.strip():
                                    logger.info(
                                        f"[GeminiLiveAgent:{self.session_id}] Spoken transcript chunk: '{ot_text}'"
                                    )
                                    await self.emit_to_frontend(
                                        {
                                            "type": "transcript",
                                            "sessionId": self.session_id,
                                            "text": ot_text,
                                        }
                                    )

                            model_turn = server_content.model_turn
                            if model_turn and model_turn.parts:
                                for part in model_turn.parts:
                                    # Audio chunk (PCM)
                                    if (
                                        part.inline_data
                                        and part.inline_data.mime_type
                                        and part.inline_data.mime_type.startswith("audio/")
                                        and part.inline_data.data
                                    ):
                                        audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        await self.emit_to_frontend(
                                            {
                                                "type": "audio",
                                                "sessionId": self.session_id,
                                                "data": audio_b64,
                                                "mimeType": part.inline_data.mime_type,
                                            }
                                        )

                                    # Subtitle / Text transcript chunk (filter internal thought tokens)
                                    if part.text:
                                        is_thought = getattr(part, "thought", False)
                                        if is_thought:
                                            logger.debug(
                                                f"[GeminiLiveAgent:{self.session_id}] Model thought: '{part.text.strip()}'"
                                            )
                                        else:
                                            logger.info(
                                                f"[GeminiLiveAgent:{self.session_id}] Spoken transcript chunk: '{part.text}'"
                                            )
                                            await self.emit_to_frontend(
                                                {
                                                    "type": "transcript",
                                                    "sessionId": self.session_id,
                                                    "text": part.text,
                                                }
                                            )

                        # 2. Handle Tool Calls from Gemini
                        tool_call = response.tool_call
                        if tool_call and tool_call.function_calls:
                            calls = tool_call.function_calls
                            logger.info(
                                f"[GeminiLiveAgent:{self.session_id}] Received {len(calls)} tool calls from Gemini."
                            )
                            await self.emit_to_frontend(
                                {
                                    "type": "agent_status",
                                    "sessionId": self.session_id,
                                    "status": "thinking",
                                    "message": "Updating blackboard...",
                                }
                            )

                            function_responses = []
                            for call in calls:
                                call_name = call.name or ""
                                logger.info(
                                    f"[GeminiLiveAgent:{self.session_id}] Executing MCP tool '{call_name}' (ID: {call.id})"
                                )
                                result = await self.mcp_client.call_tool(call_name, call.args or {})
                                norm_response = self._normalize_tool_result(result)

                                function_responses.append(
                                    genai_types.FunctionResponse(
                                        name=call_name,
                                        id=call.id,
                                        response=norm_response,
                                    )
                                )

                            # Return tool results to Gemini session
                            if self._session:
                                logger.info(
                                    f"[GeminiLiveAgent:{self.session_id}] Sending {len(function_responses)} tool responses back to Gemini."
                                )
                                await self._session.send_tool_response(function_responses=function_responses)

                except asyncio.CancelledError:
                    break
                except Exception as turn_err:
                    if not self.is_active:
                        break
                    err_str = str(turn_err)
                    if "1000" in err_str or "ConnectionClosedOK" in err_str:
                        logger.info(
                            f"[GeminiLiveAgent:{self.session_id}] Live session closed normally (1000 OK)."
                        )
                        break

                    logger.warning(
                        f"[GeminiLiveAgent:{self.session_id}] Live session error in turn ({turn_err}). Attempting auto-reconnect..."
                    )
                    self._session = None
                    reconnected = await self._reconnect_session()
                    if not reconnected:
                        logger.error(
                            f"[GeminiLiveAgent:{self.session_id}] Reconnect failed. Switching to interactive simulation mode."
                        )
                        asyncio.create_task(self._simulation_loop())
                        break

        except asyncio.CancelledError:
            logger.info(f"[GeminiLiveAgent:{self.session_id}] Receive loop cancelled.")
        except Exception as err:
            err_str = str(err)
            if "1000" in err_str or "ConnectionClosedOK" in err_str:
                logger.info(
                    f"[GeminiLiveAgent:{self.session_id}] Live session closed normally: {err}"
                )
            else:
                logger.error(
                    f"[GeminiLiveAgent:{self.session_id}] Error in receive loop: {err}",
                    exc_info=True,
                )
        finally:
            self.is_active = False

    async def send_audio_chunk(self, pcm_bytes: bytes) -> None:
        """
        Send a chunk of raw PCM audio received from the student's microphone.

        Args:
            pcm_bytes: Raw mono PCM audio bytes (16kHz or 24kHz).
        """
        if not self.is_active or self.is_paused:
            return

        if self._session:
            try:
                # Dispatch realtime audio chunk to Gemini (using audio= parameter for raw PCM)
                await self._session.send_realtime_input(
                    audio=genai_types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
                )
            except Exception as err:
                logger.error(
                    f"[GeminiLiveAgent:{self.session_id}] Failed to send audio chunk: {err}"
                )
        else:
            # In simulation mode, logging periodic audio activity
            logger.debug(
                f"[GeminiLiveAgent:{self.session_id}] [SimMode] Received {len(pcm_bytes)} bytes audio."
            )

    async def send_audio_stream_end(self) -> None:
        """
        Notify the Gemini Live session that the student has finished speaking / muted microphone.
        Dispatches audio_stream_end to trigger immediate response generation.
        """
        if not self.is_active or not self._session or self.is_paused:
            return

        try:
            await self._session.send_realtime_input(audio_stream_end=True)
            logger.info(
                f"[GeminiLiveAgent:{self.session_id}] Dispatched audio_stream_end signal."
            )
        except Exception as err:
            logger.error(
                f"[GeminiLiveAgent:{self.session_id}] Failed to send audio_stream_end: {err}"
            )

    async def send_text_message(self, text: str) -> None:
        """
        Send a text message from the student to the agent enriched with real-time blackboard context.

        Args:
            text: Text message content.
        """
        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Student sent text: '{text}'"
        )

        board = self.mcp_client.get_latest_board_state()
        board_ctx = (
            f"[Current Blackboard: {board.spatialSummary} ({board.elementCount} elements on 1280x720 canvas). "
            "DIRECTIVE: If your spoken explanation introduces formulas, derivations, or geometric figures, "
            "you MUST invoke the appropriate tool (write_formula, draw_geometry, write_text) in this turn. "
            "Do not merely describe visual figures without drawing them.]"
        )
        enriched_text = f"{text}\n\n{board_ctx}"

        if self.is_active and self._session:
            try:
                await self._session.send_client_content(
                    turns=[
                        genai_types.Content(
                            role="user",
                            parts=[genai_types.Part.from_text(text=enriched_text)],
                        )
                    ],
                    turn_complete=True,
                )
                return
            except Exception as err:
                logger.error(
                    f"[GeminiLiveAgent:{self.session_id}] Failed to send text via Live API: {err}"
                )

        # Fallback to interactive blackboard illustration so student is always answered
        await self._handle_simulation_text(text)

    async def update_curriculum_context(self, curriculum_data: Dict[str, Any]) -> None:
        """
        Update the agent's teaching curriculum with new modules, notes, and topic details.
        Ensures strict tenant and topic isolation: if the topic has changed, re-establishes
        a brand-new Gemini Live session with the new system prompt so former topics are
        completely purged from the AI model's context.

        Args:
            curriculum_data: Dictionary containing topic, modules, notes, and questions.
        """
        new_topic = (curriculum_data.get("topic") or "").strip()
        old_topic = (self.curriculum_data.get("topic") or "").strip() if self.curriculum_data else ""
        topic_changed = bool(old_topic and new_topic and old_topic.lower() != new_topic.lower())

        self.curriculum_data = curriculum_data
        topic = new_topic or "the selected topic"
        modules = curriculum_data.get("modules") or []

        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Received curriculum context for topic: '{topic}' ({len(modules)} modules). Changed: {topic_changed}"
        )

        # If topic changed while agent is active, tear down old session and connect clean isolated session
        if topic_changed and self.is_active and self._client and self.api_key:
            logger.info(
                f"[GeminiLiveAgent:{self.session_id}] Purging former topic '{old_topic}' from AI context. Reconnecting isolated Gemini Live session for '{new_topic}'."
            )
            # Reset board history and interruption state
            self.mcp_client.clear_history()
            self._is_interrupted = False
            self.is_paused = False

            # Cancel old receive task
            if self._receive_task and not self._receive_task.done():
                self._receive_task.cancel()
                try:
                    await self._receive_task
                except (asyncio.CancelledError, Exception):
                    pass

            # Close old Gemini Live context
            if self._session_context:
                try:
                    await self._session_context.__aexit__(None, None, None)
                except Exception:
                    pass
                self._session = None
                self._session_context = None

            try:
                # Build fresh configuration with new topic prompt
                config = self._build_live_config()
                self._session_context = self._client.aio.live.connect(
                    model=self.model_name, config=config
                )
                self._session = await self._session_context.__aenter__()
                self._receive_task = asyncio.create_task(self._receive_loop())

                greeting_text = build_initial_greeting_prompt(self.curriculum_data)
                if self._session:
                    await self._session.send_client_content(
                        turns=[
                            genai_types.Content(
                                role="user",
                                parts=[genai_types.Part.from_text(text=greeting_text)],
                            )
                        ],
                        #skills and other instruction
                        turn_complete=True,
                    )
                logger.info(
                    f"[GeminiLiveAgent:{self.session_id}] Isolated session established for topic '{new_topic}'."
                )
                return
            except Exception as reconnect_err:
                logger.error(
                    f"[GeminiLiveAgent:{self.session_id}] Failed to re-establish isolated session: {reconnect_err}",
                    exc_info=True,
                )

        if self.is_active and self._session:
            first_mod = (
                modules[0].get("title", "Module 1")
                if modules and isinstance(modules[0], dict)
                else "Module 1"
            )
            board = self.mcp_client.get_latest_board_state()
            prompt_update = (
                f"Hi Rabbly! I am ready to study our topic: '{topic}'. "
                f"Current blackboard has {board.elementCount} elements. "
                f"Please call clear_board to start with a fresh canvas, announce today's topic, "
                f"write the title '{topic}' at (80, 50), and draw the opening concepts for {first_mod} on the blackboard now."
            )
            try:
                await self._session.send_client_content(
                    turns=[
                        genai_types.Content(
                            role="user",
                            parts=[genai_types.Part.from_text(text=prompt_update)],
                        )
                    ],
                    turn_complete=True,
                )
                logger.info(
                    f"[GeminiLiveAgent:{self.session_id}] Dispatched curriculum update prompt to live session via send_client_content."
                )
            except Exception as err:
                logger.warning(
                    f"[GeminiLiveAgent:{self.session_id}] Failed to send curriculum update prompt: {err}"
                )

    async def _simulation_loop(self) -> None:
        """
        Fallback simulation loop when running without Gemini Live API credentials.
        Emits status, welcome message, and demonstrates whiteboard interaction.
        """
        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Interactive simulation loop started."
        )

        await self.emit_to_frontend(
            {
                "type": "agent_status",
                "sessionId": self.session_id,
                "status": "listening",
                "message": "Rabbly AI Tutor (Simulation Mode) Ready",
            }
        )

        # Pre-load curriculum plan and restore board memory in simulation mode
        if not self.curriculum_data:
            try:
                self.curriculum_data = get_curriculum_plan_for_session(self.session_id)
                if self.curriculum_data and self.curriculum_data.get("board_state"):
                    self.mcp_client.restore_from_saved_state(self.curriculum_data["board_state"])
            except Exception as plan_err:
                logger.debug(f"[GeminiLiveAgent:{self.session_id}] Simulation curriculum fetch: {plan_err}")
        elif self.curriculum_data and self.curriculum_data.get("board_state"):
            self.mcp_client.restore_from_saved_state(self.curriculum_data["board_state"])

        completed = 0
        active_idx = 0
        topic = "STEM & Mathematics"
        if self.curriculum_data and isinstance(self.curriculum_data, dict):
            topic = self.curriculum_data.get("topic") or topic
            completed = self.curriculum_data.get("completed_modules") or self.curriculum_data.get("completedModules") or 0
            active_idx = self.curriculum_data.get("active_module_index") or self.curriculum_data.get("activeModuleIndex") or completed

        if (completed > 0 or active_idx > 0) and self.curriculum_data:
            modules = self.curriculum_data.get("modules") or []
            target_title = (
                modules[active_idx].get("title", f"Module {active_idx + 1}")
                if active_idx < len(modules) and isinstance(modules[active_idx], dict)
                else f"Module {active_idx + 1}"
            )
            sim_greeting = (
                f"Welcome back! I remember where we stopped in our lesson on {topic}. "
                f"We previously mastered {completed} module(s). Let's pick right back up at {target_title} on the blackboard!"
            )
        else:
            sim_greeting = (
                f"Hello! I am Rabbly, your AI Tutor. I can see the digital blackboard and illustrate concepts in real time. "
                f"Today we're exploring {topic}. Ask me anything or tell me what to draw!"
            )

        await self.emit_to_frontend(
            {
                "type": "transcript",
                "sessionId": self.session_id,
                "text": sim_greeting,
            }
        )

    async def _handle_simulation_text(self, text: str) -> None:
        """Handle student text in simulation mode with whiteboard demonstrations."""
        lower = text.lower()
        await self.emit_to_frontend(
            {"type": "agent_status", "sessionId": self.session_id, "status": "thinking"}
        )
        await asyncio.sleep(0.5)

        if "triangle" in lower or "trig" in lower or "pythagor" in lower:
            await self.emit_to_frontend(
                {
                    "type": "transcript",
                    "sessionId": self.session_id,
                    "text": "Let's draw a right-angled triangle on the board to visualize the Pythagorean theorem!",
                }
            )
            # 1. Draw geometry figure
            tri_result = await self.mcp_client.call_tool(
                "draw_geometry",
                {
                    "shape": "right_triangle",
                    "x": 120,
                    "y": 140,
                    "base": 300,
                    "height": 200,
                    "color": "light-blue",
                    "labels": {"hypotenuse": "c (5)", "opposite": "b (4)", "adjacent": "a (3)", "angle": "θ"},
                },
            )
            # 2. Dynamically write formula without hardcoded width/height
            await self.mcp_client.call_tool(
                "write_formula",
                {
                    "title": "Pythagorean Theorem",
                    "formula": "a² + b² = c²\n3² + 4² = 9 + 16 = 25 = 5²",
                    "style": "card",
                    "color": "yellow",
                },
            )
            # 3. Add pedagogical chalk step
            await self.mcp_client.call_tool(
                "write_formula",
                {
                    "formula": "∴ c = √(a² + b²) = √(9 + 16) = 5",
                    "style": "text",
                    "color": "green",
                },
            )
        elif "formula" in lower or "equation" in lower or "quadrat" in lower or "math" in lower:
            await self.emit_to_frontend(
                {
                    "type": "transcript",
                    "sessionId": self.session_id,
                    "text": "Great question! Let me write out the quadratic formula derivation step-by-step on the blackboard.",
                }
            )
            await self.mcp_client.call_tool(
                "write_formula",
                {
                    "title": "Quadratic Formula Derivation",
                    "formula": "ax² + bx + c = 0\nx² + (b/a)x = -c/a\n(x + b/(2a))² = (b² - 4ac)/(4a²)\nx = (-b ± √(b² - 4ac)) / (2a)",
                    "style": "card",
                    "color": "yellow",
                },
            )
            await self.mcp_client.call_tool(
                "create_sticky_note",
                {
                    "text": "Discriminant (Δ = b² - 4ac):\nΔ > 0: 2 real roots\nΔ = 0: 1 real root\nΔ < 0: 2 complex roots",
                    "color": "light-blue",
                    "x": 160,
                    "y": 180,
                },
            )
        elif "clear" in lower:
            await self.emit_to_frontend(
                {
                    "type": "transcript",
                    "sessionId": self.session_id,
                    "text": "Clearing the blackboard for our next topic. What would you like to explore next?",
                }
            )
            await self.mcp_client.call_tool("clear_board", {})
        else:
            board = self.mcp_client.get_latest_board_state()
            await self.emit_to_frontend(
                {
                    "type": "transcript",
                    "sessionId": self.session_id,
                    "text": (
                        f"I hear you! Currently, the blackboard has {board.elementCount} elements "
                        f"({board.spatialSummary}). Ask me to write a formula, draw a diagram, or explain a concept!"
                    ),
                }
            )

        await self.emit_to_frontend(
            {"type": "agent_status", "sessionId": self.session_id, "status": "listening"}
        )

    async def stop(self) -> None:
        """Cleanly close the Gemini Live session and cancel background tasks."""
        logger.info(f"[GeminiLiveAgent:{self.session_id}] Stopping agent...")
        self.is_active = False

        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self._session_context:
            try:
                await self._session_context.__aexit__(None, None, None)
            except Exception as err:
                logger.debug(
                    f"[GeminiLiveAgent:{self.session_id}] Context exit error: {err}"
                )
            self._session_context = None

        if self._session:
            try:
                await self._session.close()
            except Exception as err:
                logger.debug(
                    f"[GeminiLiveAgent:{self.session_id}] Session close error: {err}"
                )
            self._session = None

        logger.info(f"[GeminiLiveAgent:{self.session_id}] Agent stopped.")
