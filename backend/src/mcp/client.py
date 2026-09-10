"""
tldraw MCP Client for Python Backend.

This module provides an asynchronous Model Context Protocol (MCP) client that bridges
the AI Agent (Gemini Live) with the frontend tldraw Whiteboard MCP Server over WebSocket channels.
It manages tool declarations for the LLM, correlates JSON-RPC 2.0 requests and responses,
and tracks real-time streamed board state so the agent is constantly spatially aware.
"""

import asyncio
import logging
import uuid
from typing import Any, Callable, Coroutine, Dict, List, Optional

from google.genai import types as genai_types

from src.mcp.types import (
    BoardStatePayload,
    McpJsonRpcRequest,
    McpJsonRpcResponse,
    McpToolCallResult,
    McpToolDefinition,
)

# Configure module-level logger
logger = logging.getLogger("rabbly.mcp.client")
logger.setLevel(logging.INFO)


class TldrawMcpClient:
    """
    Asynchronous MCP Client for controlling the frontend tldraw blackboard.

    Attributes:
        session_id: The unique classroom/tutor session identifier.
        send_rpc_fn: Coroutine function to transmit JSON-RPC payloads over the Output WebSocket.
        latest_board_state: Most recent BoardStatePayload received from the frontend canvas.
        pending_requests: Map of request ID to pending asyncio.Future awaiting frontend ACK.
    """

    def __init__(
        self,
        session_id: str,
        send_rpc_fn: Optional[Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]] = None,
    ):
        """
        Initialize the TldrawMcpClient.

        Args:
            session_id: The active session identifier.
            send_rpc_fn: Async callback to send JSON data to the frontend Output WebSocket.
        """
        self.session_id = session_id
        self.send_rpc_fn = send_rpc_fn
        self.latest_board_state: BoardStatePayload = BoardStatePayload()
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()

        logger.info(
            f"[TldrawMcpClient] Initialized for session '{self.session_id}'"
        )

    def set_send_callback(
        self, send_rpc_fn: Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]
    ) -> None:
        """
        Set or update the outbound transmission callback.

        Args:
            send_rpc_fn: Async callback to dispatch messages to the frontend Output WebSocket.
        """
        self.send_rpc_fn = send_rpc_fn
        logger.info(
            f"[TldrawMcpClient:{self.session_id}] Outbound send callback attached."
        )

    def update_board_state(self, state_dict_or_model: Any) -> None:
        """
        Update the locally cached board state streamed from the frontend canvas.

        Args:
            state_dict_or_model: Raw dict or BoardStatePayload instance.
        """
        try:
            if isinstance(state_dict_or_model, BoardStatePayload):
                self.latest_board_state = state_dict_or_model
            elif isinstance(state_dict_or_model, dict):
                self.latest_board_state = BoardStatePayload(**state_dict_or_model)
            else:
                logger.warning(
                    f"[TldrawMcpClient:{self.session_id}] Received unexpected board state type: {type(state_dict_or_model)}"
                )
                return

            logger.info(
                f"[TldrawMcpClient:{self.session_id}] Board state updated: "
                f"{self.latest_board_state.elementCount} elements on board. "
                f"Summary: '{self.latest_board_state.spatialSummary}'"
            )
        except Exception as err:
            logger.error(
                f"[TldrawMcpClient:{self.session_id}] Failed to parse incoming board state: {err}",
                exc_info=True,
            )

    def get_latest_board_state(self) -> BoardStatePayload:
        """
        Retrieve the latest spatial board state snapshot.

        Returns:
            BoardStatePayload: Current elements, dimensions, and spatial summary.
        """
        return self.latest_board_state

    def get_tool_definitions(self) -> List[McpToolDefinition]:
        """
        Return the standardized list of MCP tools exposed to the AI agent.

        Returns:
            List[McpToolDefinition]: Specifications for whiteboard manipulation tools.
        """
        return [
            McpToolDefinition(
                name="get_board_state",
                description=(
                    "Inspects the digital blackboard's current state. Returns active shapes, coordinates, "
                    "text formulas, and a spatial summary indicating available canvas areas."
                ),
                inputSchema={"type": "object", "properties": {}},
            ),
            McpToolDefinition(
                name="write_text",
                description=(
                    "Writes clear, styled typography text directly onto the blackboard. Ideal for titles, "
                    "explanations, step headers, and conceptual definitions."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "The text content to display."},
                        "x": {"type": "number", "description": "Horizontal coordinate (0-1280 canonical)."},
                        "y": {"type": "number", "description": "Vertical coordinate (0-720 canonical)."},
                        "size": {
                            "type": "string",
                            "enum": ["s", "m", "l", "xl"],
                            "description": "Font scale (s: small, m: body, l: heading, xl: hero title).",
                        },
                        "font": {
                            "type": "string",
                            "enum": ["draw", "sans", "serif", "mono"],
                            "description": "Typeface family (draw: handwritten chalk, sans: clean, serif: academic, mono: code).",
                        },
                        "color": {
                            "type": "string",
                            "enum": ["black", "grey", "light-violet", "violet", "blue", "light-blue", "yellow", "orange", "green", "light-green", "light-red", "red"],
                            "description": "Text color token.",
                        },
                        "align": {
                            "type": "string",
                            "enum": ["start", "middle", "end"],
                            "description": "Text horizontal alignment.",
                        },
                    },
                    "required": ["text"],
                },
            ),
            McpToolDefinition(
                name="create_sticky_note",
                description=(
                    "Creates a colorful sticky note card on the blackboard with automatic text wrapping. "
                    "Great for important callouts, definitions, or summary cards."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Note text content."},
                        "x": {"type": "number", "description": "Horizontal placement coordinate."},
                        "y": {"type": "number", "description": "Vertical placement coordinate."},
                        "color": {
                            "type": "string",
                            "enum": ["yellow", "light-blue", "green", "orange", "violet", "red", "grey"],
                            "description": "Sticky note paper color.",
                        },
                        "size": {
                            "type": "string",
                            "enum": ["s", "m", "l", "xl"],
                            "description": "Card size.",
                        },
                    },
                    "required": ["text"],
                },
            ),
            McpToolDefinition(
                name="write_formula",
                description=(
                    "Writes mathematical formulas, step-by-step derivations, or theorem cards with formatted equations on the board."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Title header for the formula card."},
                        "formula": {"type": "string", "description": "Mathematical formula or equations to render."},
                        "x": {"type": "number", "description": "Horizontal position (0-1280)."},
                        "y": {"type": "number", "description": "Vertical position (0-720)."},
                        "width": {"type": "number", "description": "Card width."},
                        "height": {"type": "number", "description": "Card height."},
                        "color": {
                            "type": "string",
                            "enum": ["yellow", "green", "light-blue", "orange", "violet", "red"],
                            "description": "Accent chalk highlight color.",
                        },
                    },
                    "required": ["formula"],
                },
            ),
            McpToolDefinition(
                name="create_shape",
                description=(
                    "Creates any geometric shape from tldraw's full palette (rectangle, ellipse, triangle, diamond, star, "
                    "cloud, heart, etc.) with customizable stroke, fill, and dash styles."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "geo": {
                            "type": "string",
                            "enum": [
                                "rectangle", "ellipse", "triangle", "diamond", "star",
                                "rhombus", "rhombus-2", "oval", "trapezoid", "arrow-right",
                                "arrow-left", "arrow-up", "arrow-down", "check-box", "x-box",
                                "cloud", "heart"
                            ],
                            "description": "Geometric shape archetype.",
                        },
                        "x": {"type": "number", "description": "X coordinate."},
                        "y": {"type": "number", "description": "Y coordinate."},
                        "w": {"type": "number", "description": "Width of shape in pixels."},
                        "h": {"type": "number", "description": "Height of shape in pixels."},
                        "text": {"type": "string", "description": "Optional label text inside the shape."},
                        "color": {
                            "type": "string",
                            "enum": ["black", "grey", "light-violet", "violet", "blue", "light-blue", "yellow", "orange", "green", "light-green", "light-red", "red"],
                            "description": "Stroke and text color.",
                        },
                        "fill": {
                            "type": "string",
                            "enum": ["none", "semi", "solid", "pattern"],
                            "description": "Fill style.",
                        },
                        "dash": {
                            "type": "string",
                            "enum": ["draw", "solid", "dashed", "dotted"],
                            "description": "Line pattern.",
                        },
                        "size": {
                            "type": "string",
                            "enum": ["s", "m", "l", "xl"],
                            "description": "Stroke size.",
                        },
                    },
                    "required": ["geo"],
                },
            ),
            McpToolDefinition(
                name="draw_geometry",
                description=(
                    "Constructs specialized geometric figures with math markers (right-angled triangles with 90° corner square, "
                    "angle arc θ, labeled sides a/b/c, unit circles, or rectangles)."
                ),
                inputSchema={
                    "type": "object",
                    "properties": {
                        "shape": {
                            "type": "string",
                            "enum": ["right_triangle", "circle", "rectangle"],
                            "description": "Type of geometric shape to draw.",
                        },
                        "x": {"type": "number", "description": "Horizontal position (0-1280 canonical)."},
                        "y": {"type": "number", "description": "Vertical position (0-720 canonical)."},
                        "base": {"type": "number", "description": "Base width for triangle/rectangle."},
                        "height": {"type": "number", "description": "Height for triangle/rectangle."},
                        "radius": {"type": "number", "description": "Radius for circle."},
                        "labels": {
                            "type": "object",
                            "properties": {
                                "hypotenuse": {"type": "string", "description": "Label for hypotenuse (e.g. 'c')"},
                                "opposite": {"type": "string", "description": "Label for opposite side (e.g. 'b')"},
                                "adjacent": {"type": "string", "description": "Label for adjacent side (e.g. 'a')"},
                                "angle": {"type": "string", "description": "Angle label (e.g. 'θ')"},
                            },
                        },
                        "color": {
                            "type": "string",
                            "enum": ["light-blue", "blue", "yellow", "green", "orange", "violet", "red", "grey"],
                            "description": "Chalk stroke color.",
                        },
                    },
                    "required": ["shape"],
                },
            ),
            McpToolDefinition(
                name="draw_connector",
                description="Draws an arrow or vector connecting two elements on the whiteboard with an optional label.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "from_id": {"type": "string", "description": "Source shape ID."},
                        "to_id": {"type": "string", "description": "Target shape ID."},
                        "label": {"type": "string", "description": "Descriptive text along the connector."},
                        "color": {"type": "string", "description": "Arrow color."},
                        "is_curved": {"type": "boolean", "description": "Whether the arrow curves smoothly."},
                    },
                    "required": ["from_id", "to_id"],
                },
            ),
            McpToolDefinition(
                name="update_shape",
                description="Updates properties of an existing shape on the board (e.g. change text, color, position, dimensions).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "The unique ID of the shape to update."},
                        "x": {"type": "number", "description": "New horizontal position."},
                        "y": {"type": "number", "description": "New vertical position."},
                        "text": {"type": "string", "description": "Updated text content."},
                        "color": {"type": "string", "description": "Updated color token."},
                        "w": {"type": "number", "description": "Updated width."},
                        "h": {"type": "number", "description": "Updated height."},
                    },
                    "required": ["id"],
                },
            ),
            McpToolDefinition(
                name="delete_shapes",
                description="Deletes one or more specific shapes from the blackboard by their IDs.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "shape_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of shape IDs to permanently remove.",
                        },
                    },
                    "required": ["shape_ids"],
                },
            ),
            McpToolDefinition(
                name="duplicate_shapes",
                description="Duplicates one or more shapes with an offset across the canvas.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "shape_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of shape IDs to duplicate.",
                        },
                        "offset_x": {"type": "number", "description": "Horizontal duplicate offset."},
                        "offset_y": {"type": "number", "description": "Vertical duplicate offset."},
                    },
                    "required": ["shape_ids"],
                },
            ),
            McpToolDefinition(
                name="align_shapes",
                description="Aligns multiple shapes along an axis (e.g. align left margins, center horizontally, or align top edges).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "shape_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of shape IDs to align (minimum 2).",
                        },
                        "alignment": {
                            "type": "string",
                            "enum": ["left", "right", "top", "bottom", "center-horizontal", "center-vertical"],
                            "description": "Alignment axis.",
                        },
                    },
                    "required": ["shape_ids", "alignment"],
                },
            ),
            McpToolDefinition(
                name="distribute_shapes",
                description="Evenly distributes three or more shapes horizontally or vertically across space.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "shape_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of shape IDs to distribute (minimum 3).",
                        },
                        "direction": {
                            "type": "string",
                            "enum": ["horizontal", "vertical"],
                            "description": "Direction of equal distribution.",
                        },
                    },
                    "required": ["shape_ids", "direction"],
                },
            ),
            McpToolDefinition(
                name="reorder_shapes",
                description="Controls the front-to-back Z-order of shapes on the board.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "shape_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of shape IDs to reorder.",
                        },
                        "operation": {
                            "type": "string",
                            "enum": ["bringToFront", "sendToBack", "bringForward", "sendBackward"],
                            "description": "Layering action to execute.",
                        },
                    },
                    "required": ["shape_ids", "operation"],
                },
            ),
            McpToolDefinition(
                name="set_camera",
                description="Controls the canvas camera view: zoom to fit all shapes, frame specific elements, or navigate to coordinates.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "mode": {
                            "type": "string",
                            "enum": ["zoom_to_fit", "zoom_to_shapes", "pan_to"],
                            "description": "Camera action mode.",
                        },
                        "shape_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Shape IDs to frame when mode is zoom_to_shapes.",
                        },
                        "x": {"type": "number", "description": "X target coordinate when mode is pan_to."},
                        "y": {"type": "number", "description": "Y target coordinate when mode is pan_to."},
                        "zoom": {"type": "number", "description": "Target zoom level (1.0 = 100%)."},
                    },
                    "required": ["mode"],
                },
            ),
            McpToolDefinition(
                name="clear_board",
                description="Erases all elements on the digital blackboard to start fresh.",
                inputSchema={"type": "object", "properties": {}},
            ),
        ]

    def get_genai_tools(self) -> List[genai_types.Tool]:
        """
        Convert MCP tool definitions into Google GenAI Tool declarations for Gemini Live.

        Returns:
            List[genai_types.Tool]: Formatted tool declarations consumable by google-genai SDK.
        """
        func_declarations = []
        for tool_def in self.get_tool_definitions():
            # Build parameters schema according to OpenAPI/GenAI specs
            schema = tool_def.inputSchema
            func_decl = genai_types.FunctionDeclaration(
                name=tool_def.name,
                description=tool_def.description,
                parameters=schema,
            )
            func_declarations.append(func_decl)

        logger.info(
            f"[TldrawMcpClient:{self.session_id}] Generated {len(func_declarations)} GenAI function declarations."
        )
        return [genai_types.Tool(function_declarations=func_declarations)]

    async def call_tool(
        self, tool_name: str, arguments: Dict[str, Any], timeout_seconds: float = 10.0
    ) -> Dict[str, Any]:
        """
        Invoke an MCP tool by dispatching a JSON-RPC 2.0 request to the frontend tldraw MCP server.

        Args:
            tool_name: The target tool name (e.g. 'draw_geometry').
            arguments: Dictionary of arguments supplied to the tool.
            timeout_seconds: Maximum seconds to wait for frontend ACK/response.

        Returns:
            Dict[str, Any]: Result payload returned by the frontend MCP server.

        Raises:
            RuntimeError: If outbound callback is missing or execution fails.
            asyncio.TimeoutError: If the frontend does not respond within timeout.
        """
        logger.info(
            f"[TldrawMcpClient:{self.session_id}] Invoking tool '{tool_name}' with args: {arguments}"
        )

        # Immediate shortcut for get_board_state if we already have local fresh cache
        if tool_name == "get_board_state" and self.latest_board_state.elementCount > 0:
            logger.info(
                f"[TldrawMcpClient:{self.session_id}] Serving 'get_board_state' from cached board state."
            )
            return {
                "content": [
                    {
                        "type": "text",
                        "text": self.latest_board_state.model_dump_json(indent=2),
                    }
                ]
            }

        if not self.send_rpc_fn:
            err_msg = f"[TldrawMcpClient:{self.session_id}] Cannot dispatch tool call: No outbound WS callback configured."
            logger.error(err_msg)
            return {"error": err_msg, "isError": True}

        # Generate unique correlation ID
        req_id = f"mcp-req-{uuid.uuid4().hex[:8]}"
        rpc_request = McpJsonRpcRequest(
            id=req_id,
            method="tools/call",
            params={"name": tool_name, "arguments": arguments},
        )

        loop = asyncio.get_running_loop()
        fut = loop.create_future()

        async with self._lock:
            self.pending_requests[req_id] = fut

        try:
            # Wrap in our standard Rabbly WebSocket message envelope
            envelope = {
                "type": "mcp_request",
                "sessionId": self.session_id,
                "payload": rpc_request.model_dump(),
            }

            logger.info(
                f"[TldrawMcpClient:{self.session_id}] Sending MCP request {req_id} ({tool_name}) via Output WS."
            )
            await self.send_rpc_fn(envelope)

            # Await response from frontend
            result = await asyncio.wait_for(fut, timeout=timeout_seconds)
            logger.info(
                f"[TldrawMcpClient:{self.session_id}] Received response for MCP request {req_id}: {result}"
            )
            return result
        except asyncio.TimeoutError:
            logger.error(
                f"[TldrawMcpClient:{self.session_id}] Timeout ({timeout_seconds}s) waiting for MCP request {req_id} ({tool_name})"
            )
            return {
                "error": f"Tool execution '{tool_name}' timed out after {timeout_seconds}s on frontend.",
                "isError": True,
            }
        except Exception as err:
            logger.error(
                f"[TldrawMcpClient:{self.session_id}] Error dispatching tool call {req_id}: {err}",
                exc_info=True,
            )
            return {"error": str(err), "isError": True}
        finally:
            async with self._lock:
                self.pending_requests.pop(req_id, None)

    def handle_incoming_response(self, response_data: Dict[str, Any]) -> None:
        """
        Handle a JSON-RPC response returned from the frontend over the Input WebSocket.

        Args:
            response_data: Parsed JSON-RPC response dict or envelope payload.
        """
        try:
            # Check if payload is wrapped in envelope
            payload = response_data.get("payload", response_data)
            rpc_resp = McpJsonRpcResponse(**payload)

            req_id = str(rpc_resp.id)
            logger.info(
                f"[TldrawMcpClient:{self.session_id}] Resolving response for request ID '{req_id}'"
            )

            fut = self.pending_requests.get(req_id)
            if fut and not fut.done():
                if rpc_resp.error:
                    fut.set_result({"error": rpc_resp.error, "isError": True})
                else:
                    fut.set_result(rpc_resp.result or {})
            else:
                logger.warning(
                    f"[TldrawMcpClient:{self.session_id}] No pending future for response ID '{req_id}' (may have timed out)."
                )
        except Exception as err:
            logger.error(
                f"[TldrawMcpClient:{self.session_id}] Failed to handle incoming MCP response: {err}",
                exc_info=True,
            )
