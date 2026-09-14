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
 * Formats LaTeX / ASCII math notation into clean, legible mathematical typography.
 */
export function formatMathFormula(input: string): string {
  if (!input) return '';

  let out = input;

  // 1. Convert LaTeX line breaks \\ or \newline to actual newlines
  out = out.replace(/\\\\/g, '\n').replace(/\\newline/g, '\n');

  // 2. Strip LaTeX alignment & spacing operators
  out = out.replace(/&/g, ' ');
  out = out.replace(/\\[,;!]/g, ' ');
  out = out.replace(/\\(quad|qquad|enspace|thinspace)/g, ' ');

  // 3. Strip LaTeX text and font modifiers: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}, etc.
  out = out.replace(/\\(?:text|mathrm|mathbf|mathit|mathsf|mathtt|operatorname)\{([^}]+)\}/g, '$1');

  // 4. Handle common LaTeX fractions: \frac{num}{den} -> num / den
  // Strip nested \text in fractions first if any remain
  out = out.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => {
    const cleanNum = num.trim();
    const cleanDen = den.trim();
    const numNeedsParens = /[+\-]/.test(cleanNum) && !cleanNum.startsWith('(');
    const denNeedsParens = /[+\-]/.test(cleanDen) && !cleanDen.startsWith('(');
    const n = numNeedsParens ? `(${cleanNum})` : cleanNum;
    const d = denNeedsParens ? `(${cleanDen})` : cleanDen;
    return `${n} / ${d}`;
  });

  // 5. Common mathematical functions (strip leading backslash): \sin, \cos, \tan, etc.
  out = out.replace(/\\(sin|cos|tan|arcsin|arccos|arctan|sec|csc|cot|sinh|cosh|tanh|ln|log|exp|lim|max|min|det|gcd|deg)\b/g, '$1');

  // 6. Handle square root: \sqrt{arg} or \sqrt[n]{arg}
  out = out.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  out = out.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // 7. Handle superscripts
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ',
  };
  out = out.replace(/\^{?([0-9+\-nixy])}?/g, (_, char) => superscripts[char] || `^${char}`);
  out = out.replace(/\^([0-9+\-nixy])/g, (_, char) => superscripts[char] || `^${char}`);

  // 8. Handle subscripts
  const subscripts: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'j': 'ⱼ', 'o': 'ₒ', 'x': 'ₓ',
  };
  out = out.replace(/_{?([0-9+\-aeijox])}?/g, (_, char) => subscripts[char] || `_${char}`);

  // 9. Greek letters and mathematical symbols
  const mathSymbols: Record<string, string> = {
    '\\theta': 'θ', '\\Theta': 'Θ',
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\Gamma': 'Γ',
    '\\delta': 'δ', '\\Delta': 'Δ',
    '\\pi': 'π', '\\Pi': 'Π',
    '\\lambda': 'λ', '\\Lambda': 'Λ',
    '\\sigma': 'σ', '\\Sigma': 'Σ',
    '\\omega': 'ω', '\\Omega': 'Ω',
    '\\phi': 'φ', '\\Phi': 'Φ',
    '\\psi': 'ψ', '\\Psi': 'Ψ',
    '\\mu': 'μ', '\\rho': 'ρ', '\\tau': 'τ',
    '\\eta': 'η', '\\epsilon': 'ε', '\\varepsilon': 'ε',
    '\\times': '×', '\\cdot': '·', '\\div': '÷',
    '\\approx': '≈', '\\neq': '≠', '\\leq': '≤', '\\geq': '≥',
    '\\pm': '±', '\\mp': '∓', '\\infty': '∞',
    '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\oint': '∮',
    '\\partial': '∂', '\\nabla': '∇',
    '\\rightarrow': '→', '\\Rightarrow': '⇒', '\\to': '→',
    '\\circ': '°', '\\degree': '°',
  };

  for (const [latex, unicode] of Object.entries(mathSymbols)) {
    out = out.split(latex).join(unicode);
  }

  // 10. Delimiters
  out = out.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  out = out.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  out = out.replace(/\\left\\{/g, '{').replace(/\\right\\}/g, '}');

  // 11. Normalize multi-line formatting and trim extraneous spaces
  out = out
    .split('\n')
    .map((line) => line.trim().replace(/\s{2,}/g, ' '))
    .filter(Boolean)
    .join('\n');

  return out;
}

/**
 * Calculates adaptive placement and dimensions for mathematical formula shapes,
 * avoiding collision with existing shapes and scaling proportionally to formula complexity.
 */
export function calculateAdaptiveFormulaLayout(
  editor: Editor,
  formulaText: string,
  title?: string,
  requestedX?: number,
  requestedY?: number,
  requestedW?: number,
  requestedH?: number
): { x: number; y: number; w: number; h: number } {
  const lines = formulaText.split('\n');
  const maxLineLen = Math.max(
    ...lines.map((l) => l.trim().length),
    title ? title.length : 0,
    14
  );
  const lineCount = lines.length;

  // Compute adaptive dimensions with comfortable padding to prevent text clipping
  const autoW = Math.max(50, Math.round(Math.abs(requestedW ?? Math.min(880, Math.max(320, Math.round(maxLineLen * 13.5 + 64))))));
  const autoH = Math.max(40, Math.round(Math.abs(requestedH ?? Math.max(90, Math.round(lineCount * 36 + (title ? 60 : 36))))));

  // If coordinates are explicitly given, use them
  if (typeof requestedX === 'number' && typeof requestedY === 'number') {
    return { x: requestedX, y: requestedY, w: autoW, h: autoH };
  }

  // Determine intelligent placement based on existing shapes
  const pageShapes = editor.getCurrentPageShapes();
  if (pageShapes.length === 0) {
    return {
      x: requestedX ?? 540,
      y: requestedY ?? 110,
      w: autoW,
      h: autoH,
    };
  }

  // Look for existing shapes on the right half (x >= 480)
  let maxRightY = 90;
  let maxRightX = 540;
  let hasRightShapes = false;

  for (const shape of pageShapes) {
    try {
      const bounds = editor.getShapeGeometry(shape).bounds;
      const shapeBottom = shape.y + bounds.height;
      const shapeRight = shape.x + bounds.width;
      if (shape.x >= 480) {
        hasRightShapes = true;
        if (shapeBottom > maxRightY) {
          maxRightY = shapeBottom;
        }
        if (shapeRight > maxRightX) {
          maxRightX = shapeRight;
        }
      }
    } catch {
      // Ignored for shapes without standard geometry
    }
  }

  let computedX = requestedX ?? 540;
  let computedY = requestedY;

  if (typeof computedY !== 'number') {
    if (hasRightShapes) {
      if (maxRightY + autoH <= 660) {
        computedY = maxRightY + 28;
      } else {
        // Switch to an offset column if space allows, or start below title
        if (maxRightX + autoW + 20 <= 1240) {
          computedX = Math.round(maxRightX + 24);
          computedY = 110;
        } else {
          computedX = 540;
          computedY = 110;
        }
      }
    } else {
      computedY = 110;
    }
  }

  return { x: computedX, y: computedY, w: autoW, h: autoH };
}

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
      let originX = action.x ?? 120;
      let originY = action.y ?? 160;
      let rawBase = action.geometryParams?.base ?? 320;
      let rawHeight = action.geometryParams?.height ?? 220;

      // Defensively normalize against negative Cartesian deltas
      if (rawBase < 0) {
        originX += rawBase;
        rawBase = Math.abs(rawBase);
      }
      if (rawHeight < 0) {
        originY += rawHeight;
        rawHeight = Math.abs(rawHeight);
      }
      const base = Math.max(10, Math.round(rawBase));
      const height = Math.max(10, Math.round(rawHeight));
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
            richText: toRichText(''),
          },
        },
      ]);
      createdIds.push(triShapeId);

      // 1B. Right-Angle Square Marker at bottom-left corner
      if (action.geometryParams?.showRightAngleMarker !== false) {
        const markerSize = Math.min(22, Math.floor(Math.min(base, height) / 4));
        if (markerSize >= 4) {
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
                richText: toRichText(''),
              },
            },
          ]);
          createdIds.push(markerId);
        }
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

    }

    // -------------------------------------------------------------------------
    // 2. Draw Mathematical Formula / Equation Card
    // -------------------------------------------------------------------------
    if (action.action === 'draw_formula') {
      const formulaId = createShapeId(action.id);
      const rawFormula = action.geometryParams?.formulaLatex || action.text || '';
      const formattedFormula = formatMathFormula(rawFormula);
      const title = action.title ? `**${action.title}**\n\n` : '';
      const fullText = `${title}${formattedFormula}`;

      const layout = calculateAdaptiveFormulaLayout(
        editor,
        formattedFormula,
        action.title,
        action.x,
        action.y,
        action.w,
        action.h
      );

      editor.createShapes([
        {
          id: formulaId,
          type: 'geo',
          x: layout.x,
          y: layout.y,
          props: {
            geo: 'rectangle',
            w: layout.w,
            h: layout.h,
            color: action.color ?? 'yellow',
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
      createdIds.push(formulaId);
      return createdIds;
    }

    // -------------------------------------------------------------------------
    // 3. Draw Circle (e.g. Unit Circle)
    // -------------------------------------------------------------------------
    if (action.action === 'draw_circle') {
      const circleId = createShapeId(action.id);
      const rawRadius = action.geometryParams?.radius ?? 140;
      const radius = Math.max(10, Math.round(Math.abs(rawRadius)));
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
            richText: toRichText(''),
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

      let rawX = action.x ?? 100;
      let rawY = action.y ?? 100;
      let rawW = action.w ?? 340;
      let rawH = action.h ?? 180;
      if (rawW < 0) {
        rawX += rawW;
        rawW = Math.abs(rawW);
      }
      if (rawH < 0) {
        rawY += rawH;
        rawH = Math.abs(rawH);
      }
      const w = Math.max(10, Math.round(rawW));
      const h = Math.max(10, Math.round(rawH));

      const titleText = action.title ? `**${action.title}**\n\n` : '';
      const bodyText = action.text || '';
      const fullContent = `${titleText}${bodyText}`;

      editor.createShapes([
        {
          id: shapeId,
          type: 'geo',
          x: rawX,
          y: rawY,
          props: {
            geo: 'rectangle',
            w,
            h,
            color: action.color ?? 'blue',
            fill: 'semi',
            dash: 'draw',
            size: 'm',
            font: 'sans',
            align: 'start',
            verticalAlign: 'start',
            richText: toRichText(fullContent || ''),
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

function extractPlainTextFromRichText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return String(node);
  const n = node as Record<string, unknown>;
  if (typeof n.text === 'string') return n.text;
  if (Array.isArray(n.content)) {
    return n.content.map(extractPlainTextFromRichText).filter(Boolean).join('\n');
  }
  return '';
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
      } else if (props.richText) {
        textContent = extractPlainTextFromRichText(props.richText).trim();
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
