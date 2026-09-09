/**
 * tldraw AI Bridge & Spatial State Extractor
 * Translates AI agent commands into programmatic tldraw shapes on a static canonical canvas (1280x720).
 * Extracts spatial scene graphs and feeds them back into Channel 2 (INPUT).
 */

import { Editor, createShapeId, toRichText, Box, type TLShapeId } from 'tldraw';
import type { WhiteboardShapeAction, BoardStatePayload, BoardElementSummary } from '../types';

export const CANONICAL_BOARD_WIDTH = 1280;
export const CANONICAL_BOARD_HEIGHT = 720;

/**
 * Executes a high-level WhiteboardShapeAction on the tldraw editor.
 */
export function executeAiActionOnBoard(editor: Editor, action: WhiteboardShapeAction): TLShapeId[] {
  const createdIds: TLShapeId[] = [];

  try {
    if (action.action === 'clear') {
      const allShapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (allShapeIds.length > 0) {
        editor.deleteShapes(allShapeIds);
      }
      return [];
    }

    if (action.action === 'zoom_to') {
      // Zoom to canonical board bounds (0, 0, 1280, 720)
      editor.zoomToBounds(
        new Box(0, 0, CANONICAL_BOARD_WIDTH, CANONICAL_BOARD_HEIGHT),
        { animation: { duration: 400 }, inset: 20 }
      );
      return [];
    }

    // -------------------------------------------------------------------------
    // 1. Draw Right-Angled Triangle (Trigonometry)
    // -------------------------------------------------------------------------
    if (action.action === 'draw_right_triangle') {
      const originX = action.x ?? 120;
      const originY = action.y ?? 160;
      const base = action.geometryParams?.base ?? 320;
      const height = action.geometryParams?.height ?? 220;
      const color = action.color ?? 'light-blue';

      const vertexB = { x: originX + base, y: originY + height }; // Bottom-right

      const triShapeId = createShapeId(`${action.id}-body`);

      // 1A. Draw Triangle Body
      editor.createShapes([
        {
          id: triShapeId,
          type: 'geo',
          x: originX,
          y: originY,
          props: {
            geo: 'triangle',
            w: base,
            h: height,
            color,
            fill: 'semi',
            dash: 'draw',
            size: 'm',
          },
        },
      ]);
      createdIds.push(triShapeId);

      // 1B. Right-Angle Square Marker at bottom-left corner
      if (action.geometryParams?.showRightAngleMarker !== false) {
        const markerSize = 22;
        const markerId = createShapeId(`${action.id}-rt-marker`);
        editor.createShapes([
          {
            id: markerId,
            type: 'geo',
            x: originX + 2,
            y: originY + height - markerSize - 2,
            props: {
              geo: 'rectangle',
              w: markerSize,
              h: markerSize,
              color: 'grey',
              fill: 'none',
              dash: 'solid',
              size: 's',
            },
          },
        ]);
        createdIds.push(markerId);
      }

      // 1C. Angle Theta Arc / Label at bottom-right acute angle
      if (action.geometryParams?.showAngleArc !== false) {
        const angleLabelId = createShapeId(`${action.id}-angle-theta`);
        const thetaText = action.geometryParams?.angleLabel || 'θ';
        editor.createShapes([
          {
            id: angleLabelId,
            type: 'text',
            x: vertexB.x - 55,
            y: vertexB.y - 40,
            props: {
              richText: toRichText(thetaText),
              color: 'orange',
              size: 'm',
              font: 'serif',
            },
          },
        ]);
        createdIds.push(angleLabelId);
      }

      // 1D. Side Labels: Adjacent (bottom), Opposite (vertical), Hypotenuse (slanted)
      const adjLabel = action.geometryParams?.adjacentLabel || 'Adjacent (a)';
      const oppLabel = action.geometryParams?.oppositeLabel || 'Opposite (b)';
      const hypLabel = action.geometryParams?.hypotenuseLabel || 'Hypotenuse (c)';

      const adjId = createShapeId(`${action.id}-adj-lbl`);
      const oppId = createShapeId(`${action.id}-opp-lbl`);
      const hypId = createShapeId(`${action.id}-hyp-lbl`);

      editor.createShapes([
        // Adjacent (Bottom)
        {
          id: adjId,
          type: 'text',
          x: originX + base / 2 - 40,
          y: originY + height + 12,
          props: {
            richText: toRichText(adjLabel),
            color: 'green',
            size: 's',
            font: 'sans',
          },
        },
        // Opposite (Vertical left side)
        {
          id: oppId,
          type: 'text',
          x: originX - 110,
          y: originY + height / 2 - 12,
          props: {
            richText: toRichText(oppLabel),
            color: 'red',
            size: 's',
            font: 'sans',
          },
        },
        // Hypotenuse (Slanted side)
        {
          id: hypId,
          type: 'text',
          x: originX + base / 2 + 10,
          y: originY + height / 2 - 35,
          props: {
            richText: toRichText(hypLabel),
            color: 'violet',
            size: 's',
            font: 'sans',
          },
        },
      ]);
      createdIds.push(adjId, oppId, hypId);

      return createdIds;
    }

    // -------------------------------------------------------------------------
    // 2. Draw Mathematical Formula / Equation Card
    // -------------------------------------------------------------------------
    if (action.action === 'draw_formula') {
      const formulaId = createShapeId(action.id);
      const title = action.title ? `**${action.title}**\n\n` : '';
      const formula = action.geometryParams?.formulaLatex || action.text || '';
      const fullText = `${title}${formula}`;

      editor.createShapes([
        {
          id: formulaId,
          type: 'geo',
          x: action.x ?? 540,
          y: action.y ?? 160,
          props: {
            geo: 'rectangle',
            w: action.w ?? 380,
            h: action.h ?? 160,
            color: action.color ?? 'light-violet',
            fill: 'semi',
            dash: 'solid',
            size: 'm',
            font: 'mono',
            align: 'start',
            verticalAlign: 'middle',
            richText: toRichText(fullText),
          },
        },
      ]);
      createdIds.push(formulaId);
      return createdIds;
    }

    // -------------------------------------------------------------------------
    // 3. Draw Circle (e.g. Unit Circle)
    // -------------------------------------------------------------------------
    if (action.action === 'draw_circle') {
      const circleId = createShapeId(action.id);
      const radius = action.geometryParams?.radius ?? 140;
      const size = radius * 2;

      editor.createShapes([
        {
          id: circleId,
          type: 'geo',
          x: action.x ?? 200,
          y: action.y ?? 180,
          props: {
            geo: 'ellipse',
            w: size,
            h: size,
            color: action.color ?? 'blue',
            fill: 'semi',
            dash: 'draw',
            size: 'm',
          },
        },
      ]);
      createdIds.push(circleId);

      // Add center coordinate label if provided
      if (action.title || action.label) {
        const textId = createShapeId(`${action.id}-label`);
        editor.createShapes([
          {
            id: textId,
            type: 'text',
            x: (action.x ?? 200) + radius - 40,
            y: (action.y ?? 180) + size + 8,
            props: {
              richText: toRichText(action.title || action.label || ''),
              color: 'light-violet',
              size: 's',
            },
          },
        ]);
        createdIds.push(textId);
      }
      return createdIds;
    }

    // -------------------------------------------------------------------------
    // 4. Create Card / Standard Text Box
    // -------------------------------------------------------------------------
    if (action.action === 'create_card') {
      const shapeId = createShapeId(action.id);
      if (editor.getShape(shapeId)) return [];

      const titleText = action.title ? `**${action.title}**\n\n` : '';
      const bodyText = action.text || '';
      const fullContent = `${titleText}${bodyText}`;

      editor.createShapes([
        {
          id: shapeId,
          type: 'geo',
          x: action.x ?? 100,
          y: action.y ?? 100,
          props: {
            geo: 'rectangle',
            w: action.w ?? 340,
            h: action.h ?? 180,
            color: action.color ?? 'blue',
            fill: 'semi',
            dash: 'draw',
            size: 'm',
            font: 'sans',
            align: 'start',
            verticalAlign: 'start',
            richText: toRichText(fullContent),
          },
        },
      ]);
      createdIds.push(shapeId);
      return createdIds;
    }

    // -------------------------------------------------------------------------
    // 5. Create Arrow / Connector
    // -------------------------------------------------------------------------
    if (action.action === 'create_arrow' && action.fromId && action.toId) {
      const arrowId = createShapeId(action.id);
      const fromShapeId = createShapeId(action.fromId);
      const toShapeId = createShapeId(action.toId);

      const fromShape = editor.getShape(fromShapeId);
      const toShape = editor.getShape(toShapeId);

      if (fromShape && toShape) {
        const fromBounds = editor.getShapeGeometry(fromShape).bounds;
        const toBounds = editor.getShapeGeometry(toShape).bounds;

        const startX = fromShape.x + fromBounds.width;
        const startY = fromShape.y + fromBounds.height / 2;
        const endX = toShape.x;
        const endY = toShape.y + toBounds.height / 2;

        editor.createShapes([
          {
            id: arrowId,
            type: 'arrow',
            x: startX,
            y: startY,
            props: {
              start: { x: 0, y: 0 },
              end: { x: endX - startX, y: endY - startY },
              richText: toRichText(action.label || ''),
              color: action.color ?? 'grey',
              size: 's',
              dash: 'draw',
            },
          },
        ]);
        createdIds.push(arrowId);
      }
      return createdIds;
    }
  } catch (err) {
    console.error('[tldrawAiBridge] Error executing action:', action, err);
  }

  return createdIds;
}

/**
 * Extracts a spatial scene graph of the whiteboard to stream back to the AI agent (Channel 2: INPUT).
 */
export function extractBoardState(editor: Editor): BoardStatePayload {
  const shapes = editor.getCurrentPageShapes();
  const elements: BoardElementSummary[] = [];

  const summaryParts: string[] = [];

  for (const shape of shapes) {
    try {
      const geometry = editor.getShapeGeometry(shape);
      const bounds = {
        x: Math.round(shape.x),
        y: Math.round(shape.y),
        width: Math.round(geometry.bounds.width),
        height: Math.round(geometry.bounds.height),
      };

      let textContent = '';
      const props = (shape.props as Record<string, unknown>) || {};
      if (typeof props.text === 'string') {
        textContent = props.text;
      } else if (props.richText && typeof props.richText === 'object') {
        textContent = JSON.stringify(props.richText);
      }

      const summary: BoardElementSummary = {
        id: shape.id,
        type: shape.type,
        bounds,
        text: textContent,
        color: typeof props.color === 'string' ? props.color : undefined,
      };

      elements.push(summary);

      // Construct high-level semantic summary for the LLM
      const quadrant =
        bounds.x < CANONICAL_BOARD_WIDTH / 2
          ? bounds.y < CANONICAL_BOARD_HEIGHT / 2
            ? 'Top-Left'
            : 'Bottom-Left'
          : bounds.y < CANONICAL_BOARD_HEIGHT / 2
          ? 'Top-Right'
          : 'Bottom-Right';

      if (textContent) {
        summaryParts.push(`[${quadrant}] ${shape.type}: "${textContent.slice(0, 60)}" at (${bounds.x}, ${bounds.y})`);
      } else {
        summaryParts.push(`[${quadrant}] ${shape.type} element at (${bounds.x}, ${bounds.y}, ${bounds.width}x${bounds.height})`);
      }
    } catch {
      // Ignore unmeasurable shapes
    }
  }

  const spatialSummary =
    elements.length === 0
      ? 'Whiteboard is currently blank. Full 1280x720 canvas is available.'
      : `${elements.length} element(s) on board: ${summaryParts.join(' | ')}`;

  return {
    canonicalWidth: CANONICAL_BOARD_WIDTH,
    canonicalHeight: CANONICAL_BOARD_HEIGHT,
    elementCount: elements.length,
    elements,
    spatialSummary,
  };
}
