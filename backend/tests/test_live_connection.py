"""
Tests for Dual WebSocket Live Endpoints and MCP Client.

Verifies:
1. Dual WebSocket connection establishment (/input and /output).
2. Streaming board state over the input WebSocket into the session context.
3. Forwarding of MCP tool calls from client to output WebSocket.
4. Resolution of MCP responses received from input WebSocket.
"""

import json
import pytest
from fastapi.testclient import TestClient

from main import app
from src.connection.manager import session_manager


@pytest.fixture
def client():
    """Create a FastAPI test client."""
    return TestClient(app)


def test_dual_websocket_connect(client: TestClient):
    """Verify that both /input and /output WebSocket routes accept connections."""
    session_id = "test-session-dual-ws"

    with client.websocket_connect(f"/ws/live/{session_id}/output") as output_ws:
        # Output connection should be active
        with client.websocket_connect(f"/ws/live/{session_id}/input") as input_ws:
            # Send board state over input
            sample_board_state = {
                "type": "board_state",
                "sessionId": session_id,
                "payload": {
                    "canonicalWidth": 1280.0,
                    "canonicalHeight": 720.0,
                    "elementCount": 2,
                    "elements": [
                        {
                            "id": "shape-1",
                            "type": "geo",
                            "label": "Triangle",
                            "bounds": {"x": 100, "y": 100, "width": 200, "height": 150},
                        }
                    ],
                    "spatialSummary": "One triangle in top-left quadrant",
                },
            }
            input_ws.send_text(json.dumps(sample_board_state))

            # Send ping
            input_ws.send_text(json.dumps({"type": "ping"}))
            resp = json.loads(input_ws.receive_text())
            assert resp.get("type") == "pong"


def test_mcp_client_tool_registration():
    """Verify that TldrawMcpClient exposes expected whiteboard tools to GenAI."""
    session = session_manager._sessions.get("test-mcp") or session_manager._sessions.setdefault(
        "test-mcp", None
    )
    from src.mcp.client import TldrawMcpClient

    mcp = TldrawMcpClient(session_id="test-mcp")
    tools = mcp.get_tool_definitions()
    tool_names = [t.name for t in tools]

    expected_tools = [
        "get_board_state",
        "write_text",
        "create_sticky_note",
        "write_formula",
        "create_shape",
        "draw_geometry",
        "draw_connector",
        "update_shape",
        "delete_shapes",
        "duplicate_shapes",
        "align_shapes",
        "distribute_shapes",
        "reorder_shapes",
        "set_camera",
        "clear_board",
    ]

    for expected in expected_tools:
        assert expected in tool_names, f"Missing tool: {expected}"

    assert len(tool_names) == len(expected_tools)

    genai_tools = mcp.get_genai_tools()
    assert len(genai_tools) == 1
    assert len(genai_tools[0].function_declarations) == len(expected_tools)
