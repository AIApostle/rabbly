/**
 * In-Browser / Frontend Model Context Protocol (MCP) Server for Rabbly Whiteboard
 * Compliant with the Model Context Protocol specification for Tools and Resources.
 * Exposes the digital board directly to AI agents via standard JSON-RPC 2.0 tools.
 */

import type { Editor } from 'tldraw';
import { executeAiActionOnBoard, extractBoardState } from '../utils/tldrawAiBridge';
import type { WhiteboardShapeAction, BoardStatePayload, WhiteboardColor } from '../types';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class WhiteboardMcpServer {
  public readonly serverName = 'rabbly-whiteboard-mcp';
  public readonly serverVersion = '1.0.0';

  private editor: Editor | null = null;
  private logs: Array<{ timestamp: string; method: string; payload: unknown; status: 'ok' | 'error' }> = [];
  private listeners: Array<() => void> = [];

  constructor() {
    // Expose globally for any in-browser AI agent, extension, or dev console
    if (typeof window !== 'undefined') {
      (window as unknown as { __WHITEBOARD_MCP__: WhiteboardMcpServer }).__WHITEBOARD_MCP__ = this;
    }
  }

  /**
   * Mounts the active tldraw editor instance.
   */
  public attachEditor(editor: Editor) {
    this.editor = editor;
    this.log('attachEditor', { status: 'attached' }, 'ok');
  }

  public detachEditor() {
    this.editor = null;
    this.log('detachEditor', { status: 'detached' }, 'ok');
  }

  /**
   * Retrieves the current snapshot of all shapes, coordinates, and spatial summary
   * for streaming over the Input WebSocket to the backend agent.
   */
  public getBoardStateSnapshot(): BoardStatePayload | null {
    if (!this.editor) return null;
    return extractBoardState(this.editor);
  }

  /**
   * MCP Tool Definitions (tools/list)
   */
  public listTools(): McpToolDefinition[] {
    return [
      {
        name: 'get_board_state',
        description:
          'Retrieves the current spatial state of the digital blackboard. Returns all active shapes, coordinates, dimensions, text, formulas, and a semantic spatial layout summary.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'draw_geometry',
        description:
          'Draws mathematical and geometric shapes on the board (e.g. right-angled triangles with 90° corner square, labeled sides a/b/c, angle θ, unit circles, or rectangles).',
        inputSchema: {
          type: 'object',
          properties: {
            shape: {
              type: 'string',
              enum: ['right_triangle', 'circle', 'rectangle'],
              description: 'Type of geometric shape to construct.',
            },
            x: { type: 'number', description: 'Horizontal origin coordinate.' },
            y: { type: 'number', description: 'Vertical origin coordinate.' },
            base: { type: 'number', description: 'Base width of the triangle or shape.' },
            height: { type: 'number', description: 'Height of the triangle or shape.' },
            radius: { type: 'number', description: 'Radius if drawing a circle.' },
            labels: {
              type: 'object',
              properties: {
                hypotenuse: { type: 'string', description: 'Label for hypotenuse (e.g. "c (Hypotenuse)")' },
                opposite: { type: 'string', description: 'Label for opposite leg (e.g. "b (Opposite)")' },
                adjacent: { type: 'string', description: 'Label for adjacent leg (e.g. "a (Adjacent)")' },
                angle: { type: 'string', description: 'Label for angle arc (e.g. "θ")' },
              },
            },
            color: {
              type: 'string',
              enum: ['light-blue', 'blue', 'yellow', 'green', 'orange', 'violet', 'red', 'grey'],
              description: 'Chalk stroke color.',
            },
          },
          required: ['shape'],
        },
      },
      {
        name: 'write_formula',
        description:
          'Writes mathematical formulas, step-by-step derivations, or theorem cards with formatted equations on the board.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title or concept name (e.g. "Trigonometric Ratios")' },
            formula: { type: 'string', description: 'Mathematical equation or derivation steps.' },
            x: { type: 'number', description: 'Horizontal coordinate placement.' },
            y: { type: 'number', description: 'Vertical coordinate placement.' },
            width: { type: 'number', description: 'Width of the formula card.' },
            height: { type: 'number', description: 'Height of the formula card.' },
            color: {
              type: 'string',
              enum: ['yellow', 'green', 'light-blue', 'orange', 'violet', 'red'],
              description: 'Accent border and highlight color.',
            },
          },
          required: ['formula'],
        },
      },
      {
        name: 'draw_connector',
        description: 'Draws an arrow or vector between two elements on the board with an optional label.',
        inputSchema: {
          type: 'object',
          properties: {
            from_id: { type: 'string', description: 'Source shape ID.' },
            to_id: { type: 'string', description: 'Target shape ID.' },
            label: { type: 'string', description: 'Descriptive text along the arrow.' },
            color: { type: 'string', description: 'Arrow color.' },
          },
          required: ['from_id', 'to_id'],
        },
      },
      {
        name: 'clear_board',
        description: 'Erases all elements on the digital blackboard to start fresh.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'zoom_to_fit',
        description: 'Smoothly fits all currently drawn shapes into the student screen view.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * Executes an MCP Tool Call (tools/call)
   */
  public async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolCallResult> {
    if (!this.editor) {
      this.log(`tools/call:${name}`, { error: 'Editor not attached' }, 'error');
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: Whiteboard editor is not attached or canvas not mounted.' }],
      };
    }

    try {
      if (name === 'get_board_state') {
        const state: BoardStatePayload = extractBoardState(this.editor);
        this.log('tools/call:get_board_state', state, 'ok');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(state, null, 2),
            },
          ],
        };
      }

      if (name === 'draw_geometry') {
        const shapeType = String(args.shape || 'right_triangle');
        const shapeId = `geom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const labels = (args.labels as Record<string, string>) || {};

        let action: WhiteboardShapeAction;

        if (shapeType === 'right_triangle') {
          action = {
            action: 'draw_right_triangle',
            id: shapeId,
            x: typeof args.x === 'number' ? args.x : undefined,
            y: typeof args.y === 'number' ? args.y : undefined,
            color: (args.color as WhiteboardColor) || 'light-blue',
            geometryParams: {
              base: typeof args.base === 'number' ? args.base : 320,
              height: typeof args.height === 'number' ? args.height : 220,
              showRightAngleMarker: true,
              showAngleArc: true,
              angleLabel: labels.angle || 'θ',
              hypotenuseLabel: labels.hypotenuse || 'Hypotenuse (c)',
              oppositeLabel: labels.opposite || 'Opposite (b)',
              adjacentLabel: labels.adjacent || 'Adjacent (a)',
            },
          };
        } else if (shapeType === 'circle') {
          action = {
            action: 'draw_circle',
            id: shapeId,
            x: typeof args.x === 'number' ? args.x : undefined,
            y: typeof args.y === 'number' ? args.y : undefined,
            color: (args.color as WhiteboardColor) || 'blue',
            geometryParams: {
              radius: typeof args.radius === 'number' ? args.radius : 140,
            },
          };
        } else {
          action = {
            action: 'create_card',
            id: shapeId,
            x: typeof args.x === 'number' ? args.x : 100,
            y: typeof args.y === 'number' ? args.y : 100,
            w: typeof args.base === 'number' ? args.base : 300,
            h: typeof args.height === 'number' ? args.height : 180,
            color: (args.color as WhiteboardColor) || 'blue',
          };
        }

        const created = executeAiActionOnBoard(this.editor, action);
        this.log(`tools/call:draw_geometry`, { shapeType, createdCount: created.length }, 'ok');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully drew ${shapeType} on the blackboard. Created ${created.length} elements (ID: ${shapeId}).`,
            },
          ],
        };
      }

      if (name === 'write_formula') {
        const formulaId = `formula-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const action: WhiteboardShapeAction = {
          action: 'draw_formula',
          id: formulaId,
          title: typeof args.title === 'string' ? args.title : undefined,
          x: typeof args.x === 'number' ? args.x : undefined,
          y: typeof args.y === 'number' ? args.y : undefined,
          w: typeof args.width === 'number' ? args.width : undefined,
          h: typeof args.height === 'number' ? args.height : undefined,
          color: (args.color as WhiteboardColor) || 'yellow',
          geometryParams: {
            formulaLatex: String(args.formula || ''),
          },
        };

        executeAiActionOnBoard(this.editor, action);
        this.log(`tools/call:write_formula`, { formulaId, title: args.title }, 'ok');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully wrote formula on board (ID: ${formulaId}).`,
            },
          ],
        };
      }

      if (name === 'draw_connector') {
        const arrowId = `arrow-${Date.now()}`;
        const action: WhiteboardShapeAction = {
          action: 'create_arrow',
          id: arrowId,
          fromId: String(args.from_id),
          toId: String(args.to_id),
          label: typeof args.label === 'string' ? args.label : undefined,
          color: (args.color as WhiteboardColor) || 'grey',
        };

        executeAiActionOnBoard(this.editor, action);
        this.log(`tools/call:draw_connector`, { arrowId }, 'ok');

        return {
          content: [
            {
              type: 'text',
              text: `Connected elements ${args.from_id} -> ${args.to_id} with arrow (ID: ${arrowId}).`,
            },
          ],
        };
      }

      if (name === 'clear_board') {
        executeAiActionOnBoard(this.editor, { action: 'clear', id: 'clear-all' });
        this.log('tools/call:clear_board', { cleared: true }, 'ok');
        return {
          content: [{ type: 'text', text: 'Blackboard cleared.' }],
        };
      }

      if (name === 'zoom_to_fit') {
        executeAiActionOnBoard(this.editor, { action: 'zoom_to', id: 'zoom-all' });
        this.log('tools/call:zoom_to_fit', { fitted: true }, 'ok');
        return {
          content: [{ type: 'text', text: 'Camera adjusted to fit all elements on screen.' }],
        };
      }

      throw new Error(`Unknown MCP tool: ${name}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log(`tools/call:${name}`, { error: errorMessage }, 'error');
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool execution failed: ${errorMessage}` }],
      };
    }
  }

  /**
   * JSON-RPC 2.0 Handler for Standard MCP Protocol Clients
   */
  public async handleJsonRpcRequest(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    const { id, method, params } = request;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: this.serverName,
            version: this.serverVersion,
          },
        },
      };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: this.listTools(),
        },
      };
    }

    if (method === 'tools/call') {
      const toolName = String(params?.name || '');
      const toolArgs = (params?.arguments as Record<string, unknown>) || {};
      const result = await this.callTool(toolName, toolArgs);
      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method '${method}' not found`,
      },
    };
  }

  public getLogs() {
    return [...this.logs];
  }

  public subscribeLogs(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private log(method: string, payload: unknown, status: 'ok' | 'error') {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift({ timestamp: time, method, payload, status });
    if (this.logs.length > 50) this.logs.pop();
    this.listeners.forEach((l) => l());
  }
}

// Global Singleton Instance
export const whiteboardMcpServer = new WhiteboardMcpServer();
