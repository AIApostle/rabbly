"""
Model Context Protocol (MCP) JSON-RPC 2.0 Data Models and Schemas.

This module defines standard Pydantic models for JSON-RPC 2.0 requests, responses,
tool definitions, tool call arguments, and tldraw spatial board state payloads.
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class McpToolDefinition(BaseModel):
    """
    Specification for a callable tool exposed by an MCP Server.

    Attributes:
        name: Unique programmatic identifier for the tool (e.g. 'draw_geometry').
        description: Human/LLM-readable description of what the tool accomplishes.
        inputSchema: JSON Schema defining the accepted arguments.
    """

    name: str = Field(..., description="Unique tool name identifier.")
    description: str = Field(..., description="Detailed description of tool functionality.")
    inputSchema: Dict[str, Any] = Field(
        default_factory=lambda: {"type": "object", "properties": {}},
        description="JSON Schema object describing the arguments.",
    )


class McpJsonRpcRequest(BaseModel):
    """
    Standard JSON-RPC 2.0 Request message.

    Attributes:
        jsonrpc: Protocol version (strictly '2.0').
        id: Request correlation identifier (string or integer).
        method: Method name, e.g. 'tools/call' or 'tools/list'.
        params: Optional dictionary of method parameters.
    """

    jsonrpc: Literal["2.0"] = "2.0"
    id: Union[str, int] = Field(..., description="Correlation ID for matching requests to responses.")
    method: str = Field(..., description="RPC method to invoke.")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Parameters supplied to the RPC method.")


class McpToolCallResultContent(BaseModel):
    """
    Single content item returned inside an MCP tool call result.
    """

    type: Literal["text", "image", "resource"] = "text"
    text: Optional[str] = None
    data: Optional[Any] = None


class McpToolCallResult(BaseModel):
    """
    Standard payload returned by an MCP tools/call invocation.

    Attributes:
        content: List of text or media items produced by the tool.
        isError: True if the tool execution resulted in an error.
    """

    content: List[McpToolCallResultContent] = Field(default_factory=list)
    isError: bool = Field(default=False)


class McpJsonRpcResponse(BaseModel):
    """
    Standard JSON-RPC 2.0 Response message.

    Attributes:
        jsonrpc: Protocol version (strictly '2.0').
        id: Correlation identifier matching the original request.
        result: Execution result data if successful.
        error: Error details if invocation failed.
    """

    jsonrpc: Literal["2.0"] = "2.0"
    id: Union[str, int]
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None


class BoardBoundingBox(BaseModel):
    """Coordinates and dimensions of a shape bounding box on the canonical canvas."""

    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0


class BoardElementSummary(BaseModel):
    """
    High-level summary of an individual shape or element on the tldraw board.

    Attributes:
        id: tldraw TLShapeId.
        type: Shape type (e.g. 'geo', 'text', 'arrow', 'card').
        label: Optional text label or title associated with the shape.
        text: Any text content contained within the shape.
        bounds: Bounding box enclosing the shape on the canonical canvas.
        color: Visual color token used for the shape.
    """

    id: str
    type: str
    label: Optional[str] = None
    text: Optional[str] = None
    bounds: BoardBoundingBox = Field(default_factory=BoardBoundingBox)
    color: Optional[str] = None


class BoardStatePayload(BaseModel):
    """
    Full spatial snapshot of the digital whiteboard streamed from the frontend.

    Attributes:
        canonicalWidth: Standard coordinate width (e.g. 1280).
        canonicalHeight: Standard coordinate height (e.g. 720).
        elementCount: Total number of active shapes on the board.
        elements: Detailed breakdown of each element.
        spatialSummary: Natural-language summary of where elements are located.
    """

    canonicalWidth: float = 1280.0
    canonicalHeight: float = 720.0
    elementCount: int = 0
    elements: List[BoardElementSummary] = Field(default_factory=list)
    spatialSummary: str = "Empty whiteboard"
    orientation: Literal["landscape", "portrait"] = "landscape"
    viewportWidth: float = 1280.0
    viewportHeight: float = 720.0
