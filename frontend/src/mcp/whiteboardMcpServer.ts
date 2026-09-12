/**
 * In-Browser / Frontend Model Context Protocol (MCP) Server for Rabbly Whiteboard.
 * Compliant with the Model Context Protocol specification for Tools and Resources.
 * Exposes the full suite of digital whiteboard actions to AI agents via JSON-RPC 2.0.
 */

import { Editor, createShapeId, toRichText, Box, type TLShapeId } from 'tldraw';
import {
  executeAiActionOnBoard,
  extractBoardState,
  formatMathFormula,
  calculateAdaptiveFormulaLayout,
} from '../utils/tldrawAiBridge';
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
  public readonly serverVersion = '2.0.0';

  private editor: Editor | null = null;
  private logs: Array<{ timestamp: string; method: string; payload: unknown; status: 'ok' | 'error' }> = [];
  private listeners: Array<() => void> = [];

  constructor() {
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
   * Comprehensive MCP Tool Definitions (tools/list)
   */
  public listTools(): McpToolDefinition[] {
    return [
      // 1. Board Inspection
      {
        name: 'get_board_state',
        description:
          'Retrieves the current spatial state of the digital blackboard. Returns all active shapes, coordinates, dimensions, text, formulas, and a semantic spatial layout summary.',
        inputSchema: { type: 'object', properties: {} },
      },

      // 2. Direct Typography & Writing
      {
        name: 'write_text',
        description:
          'Writes clear, styled typography text directly onto the blackboard. Ideal for titles, explanations, step headers, and conceptual definitions.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The text content to display.' },
            x: { type: 'number', description: 'Horizontal coordinate (0-1280 canonical).' },
            y: { type: 'number', description: 'Vertical coordinate (0-720 canonical).' },
            size: {
              type: 'string',
              enum: ['s', 'm', 'l', 'xl'],
              description: 'Font scale (s: small, m: body, l: heading, xl: hero title).',
            },
            font: {
              type: 'string',
              enum: ['draw', 'sans', 'serif', 'mono'],
              description: 'Typeface family (draw: handwritten chalk, sans: modern clean, serif: academic, mono: code/math).',
            },
            color: {
              type: 'string',
              enum: ['black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 'yellow', 'orange', 'green', 'light-green', 'light-red', 'red'],
              description: 'Text color.',
            },
            align: {
              type: 'string',
              enum: ['start', 'middle', 'end'],
              description: 'Text alignment.',
            },
          },
          required: ['text'],
        },
      },

      // 3. Sticky Notes
      {
        name: 'create_sticky_note',
        description:
          'Creates a colorful sticky note card on the blackboard with automatic text wrapping. Great for important callouts, definitions, or summary cards.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Note text content.' },
            x: { type: 'number', description: 'Horizontal placement.' },
            y: { type: 'number', description: 'Vertical placement.' },
            color: {
              type: 'string',
              enum: ['yellow', 'light-blue', 'green', 'orange', 'violet', 'red', 'grey'],
              description: 'Sticky note paper color.',
            },
            size: {
              type: 'string',
              enum: ['s', 'm', 'l', 'xl'],
              description: 'Card size.',
            },
          },
          required: ['text'],
        },
      },

      // 4. Mathematical Formula Cards
      {
        name: 'write_formula',
        description:
          'Writes mathematical formulas, step-by-step derivations, or theorem cards with formatted equations on the board.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title or concept name (e.g. "Pythagorean Theorem")' },
            formula: { type: 'string', description: 'Mathematical equation or derivation steps.' },
            style: {
              type: 'string',
              enum: ['card', 'text'],
              description: 'Rendering style: "card" for an accented box, or "text" for standalone clean chalkboard typography.',
            },
            x: { type: 'number', description: 'Horizontal coordinate (0-1280). If omitted, placed dynamically.' },
            y: { type: 'number', description: 'Vertical coordinate (0-720). If omitted, placed dynamically.' },
            width: { type: 'number', description: 'Custom width in pixels. If omitted, calculated dynamically.' },
            height: { type: 'number', description: 'Custom height in pixels. If omitted, calculated dynamically.' },
            color: {
              type: 'string',
              enum: ['yellow', 'green', 'light-blue', 'orange', 'violet', 'red', 'grey'],
              description: 'Accent border and highlight color.',
            },
          },
          required: ['formula'],
        },
      },

      // 5. Generic Shape Creation (Full Shape Palette)
      {
        name: 'create_shape',
        description:
          'Creates any geometric shape from tldraw full palette (rectangle, ellipse, triangle, diamond, star, cloud, heart, etc.) with customizable stroke, fill, and dash styles.',
        inputSchema: {
          type: 'object',
          properties: {
            geo: {
              type: 'string',
              enum: [
                'rectangle',
                'ellipse',
                'triangle',
                'diamond',
                'star',
                'rhombus',
                'rhombus-2',
                'oval',
                'trapezoid',
                'arrow-right',
                'arrow-left',
                'arrow-up',
                'arrow-down',
                'check-box',
                'x-box',
                'cloud',
                'heart',
              ],
              description: 'Geometric shape archetype.',
            },
            x: { type: 'number', description: 'X coordinate.' },
            y: { type: 'number', description: 'Y coordinate.' },
            w: { type: 'number', description: 'Width of shape in pixels.' },
            h: { type: 'number', description: 'Height of shape in pixels.' },
            text: { type: 'string', description: 'Optional label text inside the shape.' },
            color: {
              type: 'string',
              enum: ['black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 'yellow', 'orange', 'green', 'light-green', 'light-red', 'red'],
              description: 'Stroke and text color.',
            },
            fill: {
              type: 'string',
              enum: ['none', 'semi', 'solid', 'pattern'],
              description: 'Fill styling.',
            },
            dash: {
              type: 'string',
              enum: ['draw', 'solid', 'dashed', 'dotted'],
              description: 'Stroke line pattern.',
            },
            size: {
              type: 'string',
              enum: ['s', 'm', 'l', 'xl'],
              description: 'Stroke thickness.',
            },
          },
          required: ['geo'],
        },
      },

      // 6. Specialized Mathematical Geometry
      {
        name: 'draw_geometry',
        description:
          'Constructs specialized geometric figures with math markers (right-angled triangles with 90° corner square, angle arc θ, labeled sides a/b/c, unit circles, or rectangles).',
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
                hypotenuse: { type: 'string', description: 'Label for hypotenuse (e.g. "c")' },
                opposite: { type: 'string', description: 'Label for opposite leg (e.g. "b")' },
                adjacent: { type: 'string', description: 'Label for adjacent leg (e.g. "a")' },
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

      // 7. Arrow Connectors & Concept Flow
      {
        name: 'draw_connector',
        description:
          'Draws a directional arrow or vector linking two elements on the board with an optional descriptive label.',
        inputSchema: {
          type: 'object',
          properties: {
            from_id: { type: 'string', description: 'Source shape ID.' },
            to_id: { type: 'string', description: 'Target shape ID.' },
            label: { type: 'string', description: 'Descriptive text along the arrow (e.g. "implies", "differentiate").' },
            color: {
              type: 'string',
              enum: ['black', 'grey', 'blue', 'light-blue', 'yellow', 'green', 'orange', 'violet', 'red'],
              description: 'Arrow color.',
            },
            is_curved: { type: 'boolean', description: 'Whether the arrow curves smoothly.' },
          },
          required: ['from_id', 'to_id'],
        },
      },

      // 8. Shape Mutation / Property Update
      {
        name: 'update_shape',
        description:
          'Updates properties of an existing shape on the board (e.g. change text, color, position, dimensions, or fill).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The unique ID of the shape to update.' },
            x: { type: 'number', description: 'New horizontal position.' },
            y: { type: 'number', description: 'New vertical position.' },
            text: { type: 'string', description: 'Updated text content.' },
            color: { type: 'string', description: 'Updated color token.' },
            w: { type: 'number', description: 'Updated width.' },
            h: { type: 'number', description: 'Updated height.' },
          },
          required: ['id'],
        },
      },

      // 9. Deleting Elements
      {
        name: 'delete_shapes',
        description: 'Deletes one or more specific shapes from the blackboard by their IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            shape_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of shape IDs to permanently remove.',
            },
          },
          required: ['shape_ids'],
        },
      },

      // 10. Duplicating Elements
      {
        name: 'duplicate_shapes',
        description: 'Duplicates one or more shapes with an offset across the canvas.',
        inputSchema: {
          type: 'object',
          properties: {
            shape_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of shape IDs to duplicate.',
            },
            offset_x: { type: 'number', description: 'Horizontal duplicate offset (default: 30).' },
            offset_y: { type: 'number', description: 'Vertical duplicate offset (default: 30).' },
          },
          required: ['shape_ids'],
        },
      },

      // 11. Spatial Alignment
      {
        name: 'align_shapes',
        description:
          'Aligns multiple shapes along an axis (e.g. align left margins, center horizontally, or align top edges).',
        inputSchema: {
          type: 'object',
          properties: {
            shape_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of shape IDs to align (minimum 2).',
            },
            alignment: {
              type: 'string',
              enum: ['left', 'right', 'top', 'bottom', 'center-horizontal', 'center-vertical'],
              description: 'Alignment axis.',
            },
          },
          required: ['shape_ids', 'alignment'],
        },
      },

      // 12. Spatial Distribution
      {
        name: 'distribute_shapes',
        description: 'Evenly distributes three or more shapes horizontally or vertically across space.',
        inputSchema: {
          type: 'object',
          properties: {
            shape_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of shape IDs to distribute (minimum 3).',
            },
            direction: {
              type: 'string',
              enum: ['horizontal', 'vertical'],
              description: 'Direction of equal distribution.',
            },
          },
          required: ['shape_ids', 'direction'],
        },
      },

      // 13. Z-Index Layering
      {
        name: 'reorder_shapes',
        description: 'Controls the front-to-back Z-order of shapes on the board.',
        inputSchema: {
          type: 'object',
          properties: {
            shape_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of shape IDs to reorder.',
            },
            operation: {
              type: 'string',
              enum: ['bringToFront', 'sendToBack', 'bringForward', 'sendBackward'],
              description: 'Layering action to execute.',
            },
          },
          required: ['shape_ids', 'operation'],
        },
      },

      // 14. Camera Navigation & Framing
      {
        name: 'set_camera',
        description:
          'Controls the canvas camera view: zoom to fit all shapes, frame specific elements, or navigate to coordinates.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['zoom_to_fit', 'zoom_to_shapes', 'pan_to'],
              description: 'Camera action mode.',
            },
            shape_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Shape IDs to frame when mode is zoom_to_shapes.',
            },
            x: { type: 'number', description: 'X target coordinate when mode is pan_to.' },
            y: { type: 'number', description: 'Y target coordinate when mode is pan_to.' },
            zoom: { type: 'number', description: 'Target zoom level (1.0 = 100%).' },
          },
          required: ['mode'],
        },
      },

      // 15. Canvas Reset
      {
        name: 'clear_board',
        description: 'Erases all elements on the digital blackboard to start fresh.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  /**
   * Executes an MCP Tool Call (tools/call)
   */
  public async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolCallResult> {
    // If editor has not yet attached (e.g. during initial React mount), wait briefly
    if (!this.editor) {
      const waitStart = Date.now();
      while (!this.editor && Date.now() - waitStart < 2500) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    if (!this.editor) {
      this.log(`tools/call:${name}`, { error: 'Editor not attached' }, 'error');
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: Whiteboard editor is not attached or canvas not mounted.' }],
      };
    }

    // Ensure the editor mutation engine is unlocked so createShapes/deleteShapes succeed
    if (this.editor.getIsReadonly()) {
      this.editor.updateInstanceState({ isReadonly: false });
    }

    try {
      // 1. get_board_state
      if (name === 'get_board_state') {
        const state: BoardStatePayload = extractBoardState(this.editor);
        this.log('tools/call:get_board_state', state, 'ok');
        return {
          content: [{ type: 'text', text: JSON.stringify(state, null, 2) }],
        };
      }

      // 2. write_text
      if (name === 'write_text') {
        const shapeId = createShapeId(`text-${Date.now()}`);
        const textContent = String(args.text || '');
        const x = typeof args.x === 'number' ? args.x : 100;
        const y = typeof args.y === 'number' ? args.y : 100;
        const size = (args.size as 's' | 'm' | 'l' | 'xl') || 'm';
        const font = (args.font as 'draw' | 'sans' | 'serif' | 'mono') || 'draw';
        const color = (args.color as any) || 'black';
        const align = (args.align as 'start' | 'middle' | 'end') || 'start';

        this.editor.createShapes([
          {
            id: shapeId,
            type: 'text',
            x,
            y,
            props: {
              richText: toRichText(textContent),
              size,
              font,
              color,
              textAlign: align,
            },
          },
        ]);

        this.log('tools/call:write_text', { shapeId, text: textContent }, 'ok');
        return {
          content: [{ type: 'text', text: `Created text block (ID: ${shapeId}) at (${x}, ${y}): "${textContent.slice(0, 50)}"` }],
        };
      }

      // 3. create_sticky_note
      if (name === 'create_sticky_note') {
        const noteId = createShapeId(`note-${Date.now()}`);
        const text = String(args.text || '');
        const x = typeof args.x === 'number' ? args.x : 200;
        const y = typeof args.y === 'number' ? args.y : 200;
        const color = (args.color as any) || 'yellow';
        const size = (args.size as 's' | 'm' | 'l' | 'xl') || 'm';

        this.editor.createShapes([
          {
            id: noteId,
            type: 'note',
            x,
            y,
            props: {
              richText: toRichText(text),
              color,
              size,
            },
          },
        ]);

        this.log('tools/call:create_sticky_note', { noteId, text }, 'ok');
        return {
          content: [{ type: 'text', text: `Created sticky note (ID: ${noteId}) with color '${color}'.` }],
        };
      }

      // 4. write_formula
      if (name === 'write_formula') {
        const formulaId = createShapeId(`formula-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`);
        const rawFormula = String(args.formula || '');
        const title = typeof args.title === 'string' ? args.title : undefined;
        const style = String(args.style || 'card');
        const color = (args.color as any) || 'yellow';

        const formattedFormula = formatMathFormula(rawFormula);
        const layout = calculateAdaptiveFormulaLayout(
          this.editor,
          formattedFormula,
          title,
          typeof args.x === 'number' ? args.x : undefined,
          typeof args.y === 'number' ? args.y : undefined,
          typeof args.width === 'number' ? args.width : undefined,
          typeof args.height === 'number' ? args.height : undefined
        );

        if (style === 'text') {
          // Pure standalone chalk formula typography
          const displayText = title ? `**${title}**\n${formattedFormula}` : formattedFormula;
          this.editor.createShapes([
            {
              id: formulaId,
              type: 'text',
              x: layout.x,
              y: layout.y,
              props: {
                richText: toRichText(displayText),
                size: 'm',
                font: 'mono',
                color,
                textAlign: 'start',
              },
            },
          ]);
        } else {
          // Beautifully accented equation card
          const fullText = title ? `**${title}**\n\n${formattedFormula}` : formattedFormula;
          this.editor.createShapes([
            {
              id: formulaId,
              type: 'geo',
              x: layout.x,
              y: layout.y,
              props: {
                geo: 'rectangle',
                w: layout.w,
                h: layout.h,
                color,
                fill: 'semi',
                dash: 'solid',
                size: 'm',
                font: 'mono',
                align: 'start',
                verticalAlign: 'start',
                richText: toRichText(fullText),
              },
            },
          ]);
        }

        this.log('tools/call:write_formula', { formulaId, layout, style, title }, 'ok');
        return {
          content: [
            {
              type: 'text',
              text: `Successfully wrote mathematical formula on board (ID: ${formulaId}) at (${layout.x}, ${layout.y}) with dimensions ${layout.w}x${layout.h}.\nFormulas:\n${formattedFormula}`,
            },
          ],
        };
      }

      // 5. create_shape (full tldraw geo suite)
      if (name === 'create_shape') {
        const shapeId = createShapeId(`shape-${Date.now()}`);
        const geo = String(args.geo || 'rectangle');
        let x = typeof args.x === 'number' ? args.x : 150;
        let y = typeof args.y === 'number' ? args.y : 150;
        let w = typeof args.w === 'number' ? args.w : 220;
        let h = typeof args.h === 'number' ? args.h : 140;

        // Defensively normalize negative dimensions from Cartesian coordinates
        if (w < 0) {
          x += w;
          w = Math.abs(w);
        }
        if (h < 0) {
          y += h;
          h = Math.abs(h);
        }
        w = Math.max(10, Math.round(w));
        h = Math.max(10, Math.round(h));

        const text = typeof args.text === 'string' ? args.text : '';
        const color = (args.color as any) || 'blue';
        const fill = (args.fill as any) || 'none';
        const dash = (args.dash as any) || 'draw';
        const size = (args.size as any) || 'm';

        this.editor.createShapes([
          {
            id: shapeId,
            type: 'geo',
            x,
            y,
            props: {
              geo: geo as any,
              w,
              h,
              richText: toRichText(text || ''),
              color,
              fill,
              dash,
              size,
            },
          },
        ]);

        this.log('tools/call:create_shape', { shapeId, geo, x, y }, 'ok');
        return {
          content: [{ type: 'text', text: `Created ${geo} shape (ID: ${shapeId}) at (${x}, ${y}, ${w}x${h}).` }],
        };
      }

      // 6. draw_geometry (specialized math right triangle / unit circle)
      if (name === 'draw_geometry') {
        const shapeType = String(args.shape || 'right_triangle');
        const shapeId = `geom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const labels = (args.labels as Record<string, string>) || {};

        let rawBase = typeof args.base === 'number' ? args.base : 320;
        let rawHeight = typeof args.height === 'number' ? args.height : 220;
        let x = typeof args.x === 'number' ? args.x : undefined;
        let y = typeof args.y === 'number' ? args.y : undefined;

        let action: WhiteboardShapeAction;

        if (shapeType === 'right_triangle') {
          if (rawBase < 0) {
            if (typeof x === 'number') x += rawBase;
            rawBase = Math.abs(rawBase);
          }
          if (rawHeight < 0) {
            if (typeof y === 'number') y += rawHeight;
            rawHeight = Math.abs(rawHeight);
          }
          action = {
            action: 'draw_right_triangle',
            id: shapeId,
            x,
            y,
            color: (args.color as WhiteboardColor) || 'light-blue',
            geometryParams: {
              base: Math.max(10, Math.round(rawBase)),
              height: Math.max(10, Math.round(rawHeight)),
              showRightAngleMarker: true,
              showAngleArc: true,
              angleLabel: labels.angle || 'θ',
              hypotenuseLabel: labels.hypotenuse || 'Hypotenuse (c)',
              oppositeLabel: labels.opposite || 'Opposite (b)',
              adjacentLabel: labels.adjacent || 'Adjacent (a)',
            },
          };
        } else if (shapeType === 'circle') {
          const rawRadius = typeof args.radius === 'number' ? args.radius : 140;
          action = {
            action: 'draw_circle',
            id: shapeId,
            x,
            y,
            color: (args.color as WhiteboardColor) || 'blue',
            geometryParams: {
              radius: Math.max(10, Math.round(Math.abs(rawRadius))),
            },
          };
        } else {
          action = {
            action: 'create_card',
            id: shapeId,
            x: x ?? 100,
            y: y ?? 100,
            w: Math.max(10, Math.round(Math.abs(rawBase))),
            h: Math.max(10, Math.round(Math.abs(rawHeight))),
            color: (args.color as WhiteboardColor) || 'blue',
          };
        }

        const created = executeAiActionOnBoard(this.editor, action);
        this.log('tools/call:draw_geometry', { shapeType, count: created.length }, 'ok');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully drew ${shapeType} on blackboard. Created ${created.length} elements (ID: ${shapeId}).`,
            },
          ],
        };
      }

      // 7. draw_connector
      if (name === 'draw_connector') {
        const fromShape = this.editor.getShape(args.from_id as TLShapeId);
        const toShape = this.editor.getShape(args.to_id as TLShapeId);

        if (!fromShape || !toShape) {
          throw new Error(`Cannot connect shapes: ${args.from_id} or ${args.to_id} does not exist on canvas.`);
        }

        const arrowId = createShapeId(`arrow-${Date.now()}`);
        const fromBounds = this.editor.getShapeGeometry(fromShape).bounds;
        const toBounds = this.editor.getShapeGeometry(toShape).bounds;

        const startX = fromShape.x + fromBounds.width / 2;
        const startY = fromShape.y + fromBounds.height / 2;
        const endX = toShape.x + toBounds.width / 2;
        const endY = toShape.y + toBounds.height / 2;

        const label = typeof args.label === 'string' ? args.label : '';
        const color = (args.color as any) || 'grey';

        this.editor.createShapes([
          {
            id: arrowId,
            type: 'arrow',
            x: startX,
            y: startY,
            props: {
              start: { x: 0, y: 0 },
              end: { x: endX - startX, y: endY - startY },
              richText: toRichText(label || ''),
              color,
              size: 'm',
              arrowheadEnd: 'arrow',
            },
          },
        ]);

        this.log('tools/call:draw_connector', { arrowId, from: args.from_id, to: args.to_id }, 'ok');
        return {
          content: [{ type: 'text', text: `Connected ${args.from_id} -> ${args.to_id} with arrow (ID: ${arrowId}).` }],
        };
      }

      // 8. update_shape
      if (name === 'update_shape') {
        const targetId = args.id as TLShapeId;
        const existing = this.editor.getShape(targetId);
        if (!existing) {
          throw new Error(`Shape ID '${args.id}' not found on canvas.`);
        }

        const updates: Record<string, unknown> = { id: targetId, type: existing.type };
        if (typeof args.x === 'number') updates.x = args.x;
        if (typeof args.y === 'number') updates.y = args.y;

        const newProps: Record<string, unknown> = { ...(existing.props as Record<string, unknown>) };
        if (typeof args.text === 'string') newProps.richText = toRichText(args.text);
        if (typeof args.color === 'string') newProps.color = args.color;
        if (typeof args.w === 'number') newProps.w = Math.max(10, Math.round(Math.abs(args.w)));
        if (typeof args.h === 'number') newProps.h = Math.max(10, Math.round(Math.abs(args.h)));

        updates.props = newProps;
        this.editor.updateShapes([updates as any]);

        this.log('tools/call:update_shape', { id: targetId }, 'ok');
        return {
          content: [{ type: 'text', text: `Updated shape '${targetId}'.` }],
        };
      }

      // 9. delete_shapes
      if (name === 'delete_shapes') {
        const ids = ((args.shape_ids as string[]) || []).map((id) => id as TLShapeId);
        if (ids.length === 0) {
          return { content: [{ type: 'text', text: 'No shape IDs provided.' }] };
        }
        this.editor.deleteShapes(ids);
        this.log('tools/call:delete_shapes', { count: ids.length }, 'ok');
        return {
          content: [{ type: 'text', text: `Deleted ${ids.length} shape(s) from the board.` }],
        };
      }

      // 10. duplicate_shapes
      if (name === 'duplicate_shapes') {
        const ids = ((args.shape_ids as string[]) || []).map((id) => id as TLShapeId);
        const offsetX = typeof args.offset_x === 'number' ? args.offset_x : 30;
        const offsetY = typeof args.offset_y === 'number' ? args.offset_y : 30;

        const shapesToDuplicate = ids.map((id) => this.editor!.getShape(id)).filter(Boolean);
        const newShapes = shapesToDuplicate.map((s) => ({
          ...s!,
          id: createShapeId(),
          x: s!.x + offsetX,
          y: s!.y + offsetY,
        }));

        this.editor.createShapes(newShapes as any);
        this.log('tools/call:duplicate_shapes', { count: newShapes.length }, 'ok');
        return {
          content: [{ type: 'text', text: `Duplicated ${newShapes.length} shape(s) with offset (${offsetX}, ${offsetY}).` }],
        };
      }

      // 11. align_shapes
      if (name === 'align_shapes') {
        const ids = ((args.shape_ids as string[]) || []).map((id) => id as TLShapeId);
        const alignment = args.alignment as 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical';
        if (ids.length < 2) {
          throw new Error('At least 2 shape IDs are required to align.');
        }

        this.editor.alignShapes(ids, alignment);
        this.log('tools/call:align_shapes', { count: ids.length, alignment }, 'ok');
        return {
          content: [{ type: 'text', text: `Aligned ${ids.length} shapes to '${alignment}'.` }],
        };
      }

      // 12. distribute_shapes
      if (name === 'distribute_shapes') {
        const ids = ((args.shape_ids as string[]) || []).map((id) => id as TLShapeId);
        const direction = args.direction as 'horizontal' | 'vertical';
        if (ids.length < 3) {
          throw new Error('At least 3 shape IDs are required to distribute.');
        }

        this.editor.distributeShapes(ids, direction);
        this.log('tools/call:distribute_shapes', { count: ids.length, direction }, 'ok');
        return {
          content: [{ type: 'text', text: `Distributed ${ids.length} shapes '${direction}'.` }],
        };
      }

      // 13. reorder_shapes
      if (name === 'reorder_shapes') {
        const ids = ((args.shape_ids as string[]) || []).map((id) => id as TLShapeId);
        const operation = String(args.operation || 'bringToFront');

        if (operation === 'bringToFront') this.editor.bringToFront(ids);
        else if (operation === 'sendToBack') this.editor.sendToBack(ids);
        else if (operation === 'bringForward') this.editor.bringForward(ids);
        else if (operation === 'sendBackward') this.editor.sendBackward(ids);
        else throw new Error(`Unknown reorder operation: ${operation}`);

        this.log('tools/call:reorder_shapes', { count: ids.length, operation }, 'ok');
        return {
          content: [{ type: 'text', text: `Executed '${operation}' on ${ids.length} shapes.` }],
        };
      }

      // 14. set_camera
      if (name === 'set_camera') {
        const mode = String(args.mode || 'zoom_to_fit');

        if (mode === 'zoom_to_fit') {
          this.editor.zoomToFit({ animation: { duration: 350 }, force: true } as any);
          this.log('tools/call:set_camera', { mode }, 'ok');
          return { content: [{ type: 'text', text: 'Camera adjusted to fit all elements.' }] };
        }

        if (mode === 'zoom_to_shapes') {
          const ids = ((args.shape_ids as string[]) || []).map((id) => id as TLShapeId);
          const shapes = ids.map((id) => this.editor!.getShape(id)).filter(Boolean);
          if (shapes.length > 0) {
            this.editor.zoomToSelection({ force: true } as any);
          }
          this.log('tools/call:set_camera', { mode, count: ids.length }, 'ok');
          return { content: [{ type: 'text', text: `Zoomed camera to focus on ${ids.length} shapes.` }] };
        }

        if (mode === 'pan_to') {
          const x = typeof args.x === 'number' ? args.x : 0;
          const y = typeof args.y === 'number' ? args.y : 0;
          const z = typeof args.zoom === 'number' ? args.zoom : 1;
          this.editor.setCamera({ x, y, z }, { force: true } as any);
          this.log('tools/call:set_camera', { mode, x, y, z }, 'ok');
          return { content: [{ type: 'text', text: `Camera set to (${x}, ${y}) at zoom ${z}x.` }] };
        }

        throw new Error(`Unknown camera mode: ${mode}`);
      }

      // 15. clear_board
      if (name === 'clear_board') {
        executeAiActionOnBoard(this.editor, { action: 'clear', id: 'clear-all' });
        this.editor.zoomToBounds(new Box(0, 0, 1280, 720), { inset: 30, force: true });
        this.log('tools/call:clear_board', { cleared: true }, 'ok');
        return {
          content: [{ type: 'text', text: 'Blackboard cleared completely.' }],
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
          capabilities: { tools: {}, resources: {} },
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
