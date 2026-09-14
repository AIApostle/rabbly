import React, { useEffect, useRef, useCallback } from 'react';
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

  // Recenter canonical 1280x720 blackboard area cleanly with viewport-sensitive inset
  const fitBoard = useCallback(() => {
    if (editorRef.current) {
      const inset = typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 30;
      editorRef.current.zoomToBounds(new Box(0, 0, 1280, 720), { inset, force: true });
    }
  }, []);

  // Initialize and frame the board on mount
  const handleMount = (editor: Editor) => {
    editorRef.current = editor;

    // Attach to the Frontend MCP Server
    whiteboardMcpServer.attachEditor(editor);

    // Ensure read-only is FALSE so the AI agent and MCP server can create and update shapes.
    // Manual UI drawing tools are already completely hidden via hideUi={true}.
    editor.updateInstanceState({ isReadonly: false });

    // Lock camera for students to prevent accidental dragging / scrolling away on mobile touch screens
    editor.setCameraOptions({ isLocked: true });

    // Force crisp light whiteboard theme
    editor.user.updateUserPreferences({ colorScheme: 'light' });

    // Frame canvas cleanly
    fitBoard();

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

  // Window resize & orientation change handler to maintain 1280x720 blackboard framing
  useEffect(() => {
    window.addEventListener('resize', fitBoard);
    window.addEventListener('orientationchange', fitBoard);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitBoard);
    }
    return () => {
      window.removeEventListener('resize', fitBoard);
      window.removeEventListener('orientationchange', fitBoard);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', fitBoard);
      }
    };
  }, [fitBoard]);

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
      className="tldraw-container absolute inset-0 w-full h-full overflow-hidden bg-white select-none touch-none"
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
