import React, { useEffect, useRef, useCallback } from 'react';
import { Tldraw, Editor, Box } from 'tldraw';
import 'tldraw/tldraw.css';
import { Maximize2 } from 'lucide-react';
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
      const editor = editorRef.current;
      const shapes = editor.getCurrentPageShapes();
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      // If active shapes exist on the board, frame them directly so they are readable on mobile
      if (shapes.length > 0) {
        const shapeBounds = editor.getCurrentPageBounds();
        if (shapeBounds && shapeBounds.w > 30 && shapeBounds.h > 30) {
          editor.zoomToBounds(shapeBounds, {
            inset: isMobile ? 18 : 36,
            force: true,
            animation: { duration: 300 },
          });
          return;
        }
      }

      const isMobileLandscape =
        typeof window !== 'undefined' &&
        window.innerWidth > window.innerHeight &&
        window.innerHeight < 550;
      const isMobilePortrait =
        typeof window !== 'undefined' &&
        window.innerWidth < 640 &&
        window.innerWidth <= window.innerHeight;

      const inset = isMobileLandscape ? 6 : isMobilePortrait ? 10 : 30;
      editor.zoomToBounds(new Box(0, 0, 1280, 720), {
        inset,
        force: true,
        animation: { duration: 300 },
      });
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

    // Enable touch pan and zoom so mobile students can freely zoom in on small screens
    editor.setCameraOptions({ isLocked: false, wheelBehavior: 'pan' });

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

  // Window resize & orientation change handler to maintain 1280x720 blackboard framing and notify agent
  useEffect(() => {
    const handleOrientationOrResize = () => {
      fitBoard();
      liveDualSessionService.streamBoardState(true);
    };

    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleOrientationOrResize);
    }
    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleOrientationOrResize);
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

    // On mobile, ensure camera smoothly frames the newly drawn action
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const bounds = editorRef.current.getCurrentPageBounds();
      if (bounds && bounds.w > 30 && bounds.h > 30) {
        editorRef.current.zoomToBounds(bounds, {
          inset: 20,
          force: true,
          animation: { duration: 300 },
        });
      }
    }
  }, [incomingAction]);

  return (
    <div
      className="tldraw-container absolute inset-0 w-full h-full overflow-hidden bg-white select-none touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Quick floating "Fit Board" button so students on mobile/desktop can re-center at any time */}
      <button
        type="button"
        onClick={fitBoard}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 shadow-lg backdrop-blur-md text-xs font-medium cursor-pointer transition-all active:scale-95 touch-manipulation"
        title="Fit blackboard to screen"
      >
        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden xs:inline text-[11px] font-mono">Fit Board</span>
      </button>

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
