import React, { useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
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

  // Initialize and lock the board on mount
  const handleMount = (editor: Editor) => {
    editorRef.current = editor;

    // Attach to the Frontend MCP Server
    whiteboardMcpServer.attachEditor(editor);

    // Strict Read-Only Mode: Ensure ONLY the AI agent can write to the board
    editor.updateInstanceState({ isReadonly: true });

    // Lock camera so student cannot scroll or pan the board
    editor.setCameraOptions({ isLocked: true });

    // Force crisp light whiteboard theme
    editor.user.updateUserPreferences({ colorScheme: 'light' });

    // Set initial centered camera position
    editor.setCamera({ x: 0, y: 0, z: 1 });

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
      onWheel={(e) => e.preventDefault()}
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
