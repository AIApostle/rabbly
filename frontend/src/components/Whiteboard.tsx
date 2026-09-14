import React, { useEffect, useRef } from 'react';
import { Tldraw, Editor, Box } from 'tldraw';
import 'tldraw/tldraw.css';
import type { WhiteboardShapeAction } from '../types';
import { whiteboardMcpServer } from '../mcp/whiteboardMcpServer';
import { liveDualSessionService } from '../services/liveDualSessionService';
import { executeAiActionOnBoard } from '../utils/tldrawAiBridge';

interface WhiteboardProps {
  onEditorReady?: (editor: Editor) => void;
  incomingAction?: WhiteboardShapeAction | null;
  onClearBoard?: () => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  onEditorReady,
  incomingAction,
}) => {
  const editorRef = useRef<Editor | null>(null);

  // Store listener cleanup ref
  const storeUnsubRef = useRef<(() => void) | null>(null);

  // Initialize and frame the board on mount
  const handleMount = (editor: Editor) => {
    editorRef.current = editor;

    // Attach to the Frontend MCP Server
    whiteboardMcpServer.attachEditor(editor);

    // Ensure read-only is FALSE so the AI agent and MCP server can create and update shapes.
    // Manual UI drawing tools are already completely hidden via hideUi={true}.
    editor.updateInstanceState({ isReadonly: false });

    // Allow smooth programmatic camera adjustments and student viewport adaptation
    editor.setCameraOptions({ isLocked: false });

    // Force crisp light whiteboard theme
    editor.user.updateUserPreferences({ colorScheme: 'light' });

    // Center and frame canonical 1280x720 blackboard area cleanly with viewport-sensitive inset
    const inset = typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 30;
    editor.zoomToBounds(new Box(0, 0, 1280, 720), { inset, force: true });

    if (onEditorReady) {
      onEditorReady(editor);
    }

    // Stream initial board state to backend agent
    liveDualSessionService.streamBoardState(true);

    // Listen to store changes (shapes added, updated, removed) and stream to agent
    if (storeUnsubRef.current) {
      storeUnsubRef.current();
    }
    storeUnsubRef.current = editor.store.listen(() => {
      liveDualSessionService.streamBoardState();
    });
  };

  // Window resize handler to maintain 1280x720 blackboard framing
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        const inset = window.innerWidth < 640 ? 12 : 30;
        editorRef.current.zoomToBounds(new Box(0, 0, 1280, 720), { inset, force: true });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Detach MCP editor and unsubscribe on unmount
  useEffect(() => {
    return () => {
      if (storeUnsubRef.current) {
        storeUnsubRef.current();
      }
      whiteboardMcpServer.detachEditor();
    };
  }, []);

  // Handle incoming actions passed via props
  useEffect(() => {
    if (!incomingAction || !editorRef.current) return;
    executeAiActionOnBoard(editorRef.current, incomingAction);
    liveDualSessionService.streamBoardState();
  }, [incomingAction]);

  return (
    <div
      className="tldraw-container absolute inset-0 w-full h-full overflow-hidden bg-white select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Embedded tldraw Editor strictly forced into white canvas light mode with UI tools removed */}
      <Tldraw
        onMount={handleMount}
        autoFocus={false}
        hideUi={true}
        colorScheme="light"
      />
    </div>
  );
};
