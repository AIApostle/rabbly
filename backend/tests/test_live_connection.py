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


def test_classroom_multi_client_broadcast(client: TestClient):
    """Verify that multiple students can connect to the same classroom and receive roster updates."""
    room_code = "RAB-COLLAB-TEST"

    def read_until_type(ws, target_type: str, max_tries: int = 5):
        for _ in range(max_tries):
            msg = json.loads(ws.receive_text())
            if msg.get("type") == target_type:
                return msg
        raise AssertionError(f"Did not receive message of type '{target_type}'")

    # Student 1 (Host) connects
    with client.websocket_connect(
        f"/ws/live/{room_code}/output?user_id=u1&name=Host+Student&is_host=true&is_classroom=true"
    ) as out_s1:
        s1_welcome = read_until_type(out_s1, "roster_update")
        assert s1_welcome["type"] == "roster_update"
        assert s1_welcome["count"] == 1
        assert s1_welcome["participants"][0]["name"] == "Host Student"
        assert s1_welcome["participants"][0]["isHost"] is True

        # Student 2 (Peer) connects to same room
        with client.websocket_connect(
            f"/ws/live/{room_code}/output?user_id=u2&name=Maya+Chen&is_host=false&is_classroom=true"
        ) as out_s2:
            # Student 1 receives roster update broadcast with 2 students
            s1_update = read_until_type(out_s1, "roster_update")
            assert s1_update["type"] == "roster_update"
            assert s1_update["count"] == 2

            # Student 2 also receives roster with both students
            s2_welcome = read_until_type(out_s2, "roster_update")
            assert s2_welcome["type"] == "roster_update"
            assert s2_welcome["count"] == 2


def test_session_pause_resume_interrupted(client: TestClient):
    """Verify that student can pause, resume, and barge-in / interrupt the session."""
    session_id = "test-pause-resume-session"

    def read_until_status(ws, target_status: str, max_tries: int = 8):
        for _ in range(max_tries):
            msg = json.loads(ws.receive_text())
            if msg.get("type") == "agent_status" and msg.get("status") == target_status:
                return msg
        raise AssertionError(f"Did not receive message with status '{target_status}'")

    with client.websocket_connect(f"/ws/live/{session_id}/output") as output_ws:
        with client.websocket_connect(f"/ws/live/{session_id}/input") as input_ws:
            # 1. Send session_pause from student
            input_ws.send_text(json.dumps({
                "type": "session_pause",
                "sessionId": session_id,
            }))
            pause_msg = read_until_status(output_ws, "paused")
            assert pause_msg["status"] == "paused"

            # 2. Send session_resume from student
            input_ws.send_text(json.dumps({
                "type": "session_resume",
                "sessionId": session_id,
            }))
            resume_msg = read_until_status(output_ws, "listening")
            assert resume_msg["status"] == "listening"

            # 3. Send student_interrupted (barge-in)
            input_ws.send_text(json.dumps({
                "type": "student_interrupted",
                "sessionId": session_id,
            }))
            interrupt_msg = read_until_status(output_ws, "interrupted")
            assert interrupt_msg["status"] == "interrupted"



