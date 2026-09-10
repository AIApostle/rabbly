"""
MCP (Model Context Protocol) integration package for Rabbly backend.

Exposes the TldrawMcpClient, Pydantic protocol models, and helper types for communicating
with the frontend tldraw whiteboard canvas over WebSocket channels.
"""

from src.mcp.client import TldrawMcpClient
from src.mcp.types import (
    BoardBoundingBox,
    BoardElementSummary,
    BoardStatePayload,
    McpJsonRpcRequest,
    McpJsonRpcResponse,
    McpToolCallResult,
    McpToolDefinition,
)

__all__ = [
    "TldrawMcpClient",
    "BoardBoundingBox",
    "BoardElementSummary",
    "BoardStatePayload",
    "McpJsonRpcRequest",
    "McpJsonRpcResponse",
    "McpToolCallResult",
    "McpToolDefinition",
]
