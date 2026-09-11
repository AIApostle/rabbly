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

from src.mcp.client import TldrawMcpClient
from src.prompt import SYSTEM_TUTOR_PROMPT
from src.skills import build_skills_instruction

# Configure module-level logger
logger = logging.getLogger("rabbly.agent.gemini_live")
logger.setLevel(logging.INFO)

# Assemble system instruction prompt with modular whiteboard skills
FULL_AGENT_PROMPT = f"{SYSTEM_TUTOR_PROMPT}\n\n{build_skills_instruction()}"


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
    ):
        """
        Initialize the Gemini Live Agent.

        Args:
            session_id: Live session or room identifier.
            mcp_client: Bound TldrawMcpClient for whiteboard tool calls.
            outbound_callback: Callback to emit messages out to the client.
            model_name: Optional custom model name.
        """
        self.session_id = session_id
        self.mcp_client = mcp_client
        self.outbound_callback = outbound_callback

        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_name = (
            model_name
            or os.getenv("GEMINI_LIVE_MODEL")
            or "gemini-2.5-flash-native-audio-latest"
        )

        self.is_active = False
        self._session_context: Optional[Any] = None
        self._session: Optional[genai.live.AsyncSession] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._client: Optional[genai.Client] = None

        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Initialized with model '{self.model_name}'. "
            f"API Key present: {bool(self.api_key)}"
        )

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
        """
        Emit a typed message to the frontend via the Output WebSocket callback.

        Args:
            message: Message dictionary to transmit.
        """
        if self.outbound_callback:
            try:
                await self.outbound_callback(message)
            except Exception as err:
                logger.error(
                    f"[GeminiLiveAgent:{self.session_id}] Error emitting to frontend: {err}",
                    exc_info=True,
                )

    async def start(self) -> None:
        """
        Connect to the Gemini Live session and start background receive loop.

        If GEMINI_API_KEY is not configured, switches to simulation mode gracefully.
        """
        if not self.api_key:
            logger.warning(
                f"[GeminiLiveAgent:{self.session_id}] GEMINI_API_KEY is not set. "
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

            tools = self.mcp_client.get_genai_tools()

            config = genai_types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                speech_config=genai_types.SpeechConfig(
                    voice_config=genai_types.VoiceConfig(
                        prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                            voice_name="Aoede"
                        )
                    )
                ),
                system_instruction=genai_types.Content(
                    parts=[genai_types.Part.from_text(text=FULL_AGENT_PROMPT)]
                ),
                tools=tools,
                output_audio_transcription=genai_types.AudioTranscriptionConfig(),
            )

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

            # Proactively prompt the live teacher to greet the student and introduce the blackboard
            try:
                await self._session.send_realtime_input(
                    text=(
                        "[Session connected. Greet the student with warmth and enthusiasm as Rabbly, "
                        "introduce yourself as their live math & STEM teacher, let them know the blackboard "
                        "is ready for drawings and formulas, and ask what topic or question they want to explore!]"
                    )
                )
                logger.info(f"[GeminiLiveAgent:{self.session_id}] Dispatched initial greeting prompt to live session.")
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
        parses audio/text, and executes tool calls via the MCP client.
        """
        logger.info(f"[GeminiLiveAgent:{self.session_id}] Started receive loop.")
        try:
            assert self._session is not None
            while self.is_active and self._session:
                try:
                    async for response in self._session.receive():
                        # 1. Handle Model Content (Audio & Transcript)
                        server_content = response.server_content
                        if server_content:
                            if server_content.interrupted:
                                logger.info(
                                    f"[GeminiLiveAgent:{self.session_id}] Student interrupted the agent."
                                )
                                await self.emit_to_frontend(
                                    {
                                        "type": "agent_status",
                                        "sessionId": self.session_id,
                                        "status": "interrupted",
                                    }
                                )

                            model_turn = server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    # Audio chunk (PCM)
                                    if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                                        audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        await self.emit_to_frontend(
                                            {
                                                "type": "audio",
                                                "sessionId": self.session_id,
                                                "data": audio_b64,
                                                "mimeType": part.inline_data.mime_type,
                                            }
                                        )

                                    # Subtitle / Text transcript chunk
                                    if part.text:
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
                        if tool_call:
                            logger.info(
                                f"[GeminiLiveAgent:{self.session_id}] Received {len(tool_call.function_calls)} tool calls from Gemini."
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
                            for call in tool_call.function_calls:
                                logger.info(
                                    f"[GeminiLiveAgent:{self.session_id}] Executing MCP tool '{call.name}' (ID: {call.id})"
                                )
                                result = await self.mcp_client.call_tool(call.name, call.args or {})

                                function_responses.append(
                                    genai_types.FunctionResponse(
                                        name=call.name,
                                        id=call.id,
                                        response=result,
                                    )
                                )

                            # Return tool results to Gemini session
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
                    else:
                        logger.error(
                            f"[GeminiLiveAgent:{self.session_id}] Error in receive turn: {turn_err}",
                            exc_info=True,
                        )
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
        if not self.is_active:
            return

        if self._session:
            try:
                # Dispatch realtime audio chunk to Gemini
                await self._session.send_realtime_input(
                    media=genai_types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
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
        if not self.is_active or not self._session:
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
        Send a text message from the student to the agent.

        Args:
            text: Text message content.
        """
        logger.info(
            f"[GeminiLiveAgent:{self.session_id}] Student sent text: '{text}'"
        )

        if self.is_active and self._session:
            try:
                await self._session.send_realtime_input(text=text)
                return
            except Exception as err:
                logger.error(
                    f"[GeminiLiveAgent:{self.session_id}] Failed to send text via Live API: {err}"
                )

        # Fallback to interactive blackboard illustration so student is always answered
        await self._handle_simulation_text(text)

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

        await self.emit_to_frontend(
            {
                "type": "transcript",
                "sessionId": self.session_id,
                "text": "Hello! I am Rabbly, your AI Tutor. I can see the digital blackboard and illustrate concepts in real time. Ask me anything or tell me what to draw!",
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
