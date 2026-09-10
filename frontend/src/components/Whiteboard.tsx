import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import type { WhiteboardShapeAction, BoardStatePayload } from '../types';
import { whiteboardMcpServer } from '../mcp/whiteboardMcpServer';
import { liveDualSessionService } from '../services/liveDualSessionService';
import { WhiteboardMcpDrawer } from './WhiteboardMcpDrawer';
import {
  executeAiActionOnBoard,
  extractBoardState,
} from '../utils/tldrawAiBridge';

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
  const [elementCount, setElementCount] = useState<number>(0);

  // Sync board state back to the MCP Server
  const syncBoardState = useCallback(() => {
    if (!editorRef.current) return;
    const state: BoardStatePayload = extractBoardState(editorRef.current);
    setElementCount(state.elementCount);
  }, []);

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

    syncBoardState();

    // Stream initial board state to backend agent
    liveDualSessionService.streamBoardState(true);

    // Listen to store changes (shapes added, updated, removed) and stream to agent
    if (storeUnsubRef.current) {
      storeUnsubRef.current();
    }
    storeUnsubRef.current = editor.store.listen(() => {
      syncBoardState();
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
    syncBoardState();
    liveDualSessionService.streamBoardState();
  }, [incomingAction, syncBoardState]);

  return (
    <div
      className="tldraw-container absolute inset-0 w-full h-full overflow-hidden bg-white select-none"
      onWheel={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Read-Only Status & MCP Server Badge */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/90 backdrop-blur-md shadow-lg text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-800 font-sans">
          Whiteboard • AI Teacher Writing (Read Only)
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold">
          MCP v1.0
        </span>
        {elementCount > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {elementCount} {elementCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {/* Embedded tldraw Editor strictly forced into white canvas light mode with UI tools removed */}
      <Tldraw
        onMount={handleMount}
        autoFocus={false}
        hideUi={true}
        colorScheme="light"
      />

      {/* Floating In-Browser MCP Server Console & Live Test Runner */}
      <WhiteboardMcpDrawer />
    </div>
  );
};
