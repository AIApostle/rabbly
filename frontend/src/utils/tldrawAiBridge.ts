/**
 * tldraw AI Bridge & Spatial State Extractor
 * Translates AI agent commands into programmatic tldraw shapes on a static canonical canvas (1280x720).
 * Extracts spatial scene graphs and feeds them back into Channel 2 (INPUT).
 */

import { Editor, createShapeId, toRichText, Box, type TLShapeId } from 'tldraw';
import type { WhiteboardShapeAction, BoardStatePayload, BoardElementSummary } from '../types';

export const CANONICAL_BOARD_WIDTH = 1280;
export const CANONICAL_BOARD_HEIGHT = 720;

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ',
  'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
  'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ',
  'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'z': 'ᶻ',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ',
  's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ', 'y': 'ᵧ',
};

/**
 * Formats LaTeX / ASCII math notation into clean, legible mathematical typography.
 * Supports matrices, vulgar fractions (e.g. 1/5 -> ¹⁄₅), geometry angles, trig powers, and Greek symbols.
 */
export function formatMathFormula(input: string): string {
  if (!input) return '';

  let out = input;

  // 1. Matrices: \begin{pmatrix} ... \end{pmatrix}, \begin{bmatrix} ... \end{bmatrix}, etc.
  out = out.replace(
    /\\begin\{(matrix|pmatrix|bmatrix|vmatrix|Bmatrix|Vmatrix)\}([\s\S]*?)\\end\{\1\}/g,
    (_, type, inner) => {
      const rows = inner
        .trim()
        .split(/\\\\|\\cr|\r?\n/)
        .map((r: string) => r.trim())
        .filter(Boolean);
      const matrix = rows.map((r: string) =>
        r.split('&').map((c: string) => formatMathFormula(c.trim()))
      );
      const colCount = Math.max(...matrix.map((r: string[]) => r.length), 1);
      const colWidths = Array(colCount).fill(0);

      for (const row of matrix) {
        row.forEach((cell: string, idx: number) => {
          colWidths[idx] = Math.max(colWidths[idx] || 0, cell.length);
        });
      }

      const paddedRows = matrix.map((row: string[]) => {
        return row
          .map((cell: string, idx: number) => {
            const w = colWidths[idx] || 0;
            return cell.padStart(w);
          })
          .join('   ');
      });

      const rowCount = paddedRows.length;
      if (rowCount === 1) {
        return type === 'pmatrix' || type === 'matrix'
          ? `( ${paddedRows[0]} )`
          : `[ ${paddedRows[0]} ]`;
      }

      return paddedRows
        .map((rowStr: string, i: number) => {
          let left = '│';
          let right = '│';
          if (type === 'pmatrix' || type === 'matrix') {
            if (i === 0) {
              left = '⎛';
              right = '⎞';
            } else if (i === rowCount - 1) {
              left = '⎝';
              right = '⎠';
            } else {
              left = '⎜';
              right = '⎟';
            }
          } else if (type === 'bmatrix' || type === 'Bmatrix') {
            if (i === 0) {
              left = '⎡';
              right = '⎤';
            } else if (i === rowCount - 1) {
              left = '⎣';
              right = '⎦';
            } else {
              left = '⎢';
              right = '⎥';
            }
          } else if (type === 'vmatrix' || type === 'Vmatrix') {
            left = '│';
            right = '│';
          }
          return `${left} ${rowStr} ${right}`;
        })
        .join('\n');
    }
  );

  // 2. Line breaks
  out = out.replace(/\\\\/g, '\n').replace(/\\newline/g, '\n');

  // 3. Strip text and font modifiers: \text{...}, \mathrm{...}
  out = out.replace(
    /\\(?:text|mathrm|mathbf|mathit|mathsf|mathtt|operatorname)\{([^}]+)\}/g,
    '$1'
  );

  // 4. Fractions: \frac{num}{den} -> vulgar fraction or clean quotient
  out = out.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => {
    const cleanNum = num.trim();
    const cleanDen = den.trim();
    const canSup = cleanNum.split('').every((c: string) => SUPERSCRIPTS[c]);
    const canSub = cleanDen.split('').every((c: string) => SUBSCRIPTS[c]);
    if (canSup && canSub) {
      const sup = cleanNum.split('').map((c: string) => SUPERSCRIPTS[c]).join('');
      const sub = cleanDen.split('').map((c: string) => SUBSCRIPTS[c]).join('');
      return `${sup}⁄${sub}`;
    }
    const numNeedsParens = /[+\-]/.test(cleanNum) && !cleanNum.startsWith('(');
    const denNeedsParens = /[+\-]/.test(cleanDen) && !cleanDen.startsWith('(');
    const n = numNeedsParens ? `(${cleanNum})` : cleanNum;
    const d = denNeedsParens ? `(${cleanDen})` : cleanDen;
    return `${n} / ${d}`;
  });

  // 5. Standalone numeric fractions: e.g. " 1/5 " -> " ¹⁄₅ "
  out = out.replace(/(?<=\b|\s)(\d+)\/(\d+)(?=\b|\s)/g, (_, num, den) => {
    const canSup = num.split('').every((c: string) => SUPERSCRIPTS[c]);
    const canSub = den.split('').every((c: string) => SUBSCRIPTS[c]);
    if (canSup && canSub) {
      return (
        num.split('').map((c: string) => SUPERSCRIPTS[c]).join('') +
        '⁄' +
        den.split('').map((c: string) => SUBSCRIPTS[c]).join('')
      );
    }
    return `${num}/${den}`;
  });

  // 6. Angles and Geometry symbols
  out = out.replace(/\\angle(?![a-zA-Z])/g, '∠');
  out = out.replace(/\\measuredangle(?![a-zA-Z])/g, '∡');
  out = out.replace(/\\triangle(?![a-zA-Z])/g, '△');
  out = out.replace(/\\perp(?![a-zA-Z])/g, '⟂');
  out = out.replace(/\\parallel(?![a-zA-Z])/g, '∥');
  out = out.replace(/\\cong(?![a-zA-Z])/g, '≅');
  out = out.replace(/\\sim(?![a-zA-Z])/g, '∼');
  out = out.replace(/\\vec\{([^}]+)\}/g, '$1⃗');
  out = out.replace(/\\overline\{([^}]+)\}/g, '$1̅');

  // Degrees
  out = out.replace(/\^\{?\\circ\}?/g, '°');
  out = out.replace(/\\degree(?![a-zA-Z])/g, '°');
  out = out.replace(/\\deg(?![a-zA-Z])/g, '°');

  // 7. Trigonometric functions (with powers: \sin^2 -> sin²)
  out = out.replace(
    /\\(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)\^([0-9nixy])/g,
    (_, f, p) => f + (SUPERSCRIPTS[p] || `^${p}`)
  );
  out = out.replace(
    /\\(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)\^\{([0-9+\-nixy]+)\}/g,
    (_, f, p) => {
      const sup = p.split('').map((c: string) => SUPERSCRIPTS[c] || c).join('');
      return f + sup;
    }
  );
  out = out.replace(
    /\\(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|arcsin|arccos|arctan|ln|log|exp|lim|max|min|det|gcd)(?![a-zA-Z])/g,
    '$1'
  );

  // 8. Square roots
  out = out.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  out = out.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // 9. Exponents and Superscripts
  out = out.replace(/\^\{([0-9+\-nixyabcdeghijklmoprstuvwz]+)\}/g, (_, p) =>
    p.split('').map((c: string) => SUPERSCRIPTS[c] || `^${c}`).join('')
  );
  out = out.replace(
    /\^([0-9+\-nixyabcdeghijklmoprstuvwz])/g,
    (_, p) => SUPERSCRIPTS[p] || `^${p}`
  );

  // 10. Subscripts
  out = out.replace(/_\{([0-9+\-aehijklmnoprstuvxy]+)\}/g, (_, p) =>
    p.split('').map((c: string) => SUBSCRIPTS[c] || `_${c}`).join('')
  );
  out = out.replace(
    /_([0-9+\-aehijklmnoprstuvxy])/g,
    (_, p) => SUBSCRIPTS[p] || `_${p}`
  );

  // 11. Greek letters
  const greekLetters: [RegExp, string][] = [
    [/\\theta(?![a-zA-Z])/g, 'θ'],
    [/\\Theta(?![a-zA-Z])/g, 'Θ'],
    [/\\alpha(?![a-zA-Z])/g, 'α'],
    [/\\beta(?![a-zA-Z])/g, 'β'],
    [/\\gamma(?![a-zA-Z])/g, 'γ'],
    [/\\Gamma(?![a-zA-Z])/g, 'Γ'],
    [/\\delta(?![a-zA-Z])/g, 'δ'],
    [/\\Delta(?![a-zA-Z])/g, 'Δ'],
    [/\\lambda(?![a-zA-Z])/g, 'λ'],
    [/\\Lambda(?![a-zA-Z])/g, 'Λ'],
    [/\\sigma(?![a-zA-Z])/g, 'σ'],
    [/\\Sigma(?![a-zA-Z])/g, 'Σ'],
    [/\\omega(?![a-zA-Z])/g, 'ω'],
    [/\\Omega(?![a-zA-Z])/g, 'Ω'],
    [/\\phi(?![a-zA-Z])/g, 'φ'],
    [/\\Phi(?![a-zA-Z])/g, 'Φ'],
    [/\\varphi(?![a-zA-Z])/g, 'ϕ'],
    [/\\psi(?![a-zA-Z])/g, 'ψ'],
    [/\\Psi(?![a-zA-Z])/g, 'Ψ'],
    [/\\pi(?![a-zA-Z])/g, 'π'],
    [/\\Pi(?![a-zA-Z])/g, 'Π'],
    [/\\mu(?![a-zA-Z])/g, 'μ'],
    [/\\rho(?![a-zA-Z])/g, 'ρ'],
    [/\\tau(?![a-zA-Z])/g, 'τ'],
    [/\\eta(?![a-zA-Z])/g, 'η'],
    [/\\epsilon(?![a-zA-Z])/g, 'ε'],
    [/\\varepsilon(?![a-zA-Z])/g, 'ε'],
  ];
  for (const [pattern, unicode] of greekLetters) {
    out = out.replace(pattern, unicode);
  }

  // 12. Relations and Math Operators
  const mathSymbols: [RegExp, string][] = [
    [/\\times(?![a-zA-Z])/g, '×'],
    [/\\cdot(?![a-zA-Z])/g, '·'],
    [/\\div(?![a-zA-Z])/g, '÷'],
    [/\\approx(?![a-zA-Z])/g, '≈'],
    [/\\neq(?![a-zA-Z])/g, '≠'],
    [/\\leq(?![a-zA-Z])/g, '≤'],
    [/\\le(?![a-zA-Z])/g, '≤'],
    [/\\geq(?![a-zA-Z])/g, '≥'],
    [/\\ge(?![a-zA-Z])/g, '≥'],
    [/\\pm(?![a-zA-Z])/g, '±'],
    [/\\mp(?![a-zA-Z])/g, '∓'],
    [/\\infty(?![a-zA-Z])/g, '∞'],
    [/\\sum(?![a-zA-Z])/g, '∑'],
    [/\\prod(?![a-zA-Z])/g, '∏'],
    [/\\int(?![a-zA-Z])/g, '∫'],
    [/\\oint(?![a-zA-Z])/g, '∮'],
    [/\\partial(?![a-zA-Z])/g, '∂'],
    [/\\nabla(?![a-zA-Z])/g, '∇'],
    [/\\rightarrow(?![a-zA-Z])/g, '→'],
    [/\\to(?![a-zA-Z])/g, '→'],
    [/\\Rightarrow(?![a-zA-Z])/g, '⇒'],
    [/\\implies(?![a-zA-Z])/g, '⇒'],
    [/\\Leftrightarrow(?![a-zA-Z])/g, '⇔'],
    [/\\iff(?![a-zA-Z])/g, '⇔'],
    [/\\in(?![a-zA-Z])/g, '∈'],
    [/\\notin(?![a-zA-Z])/g, '∉'],
    [/\\subset(?![a-zA-Z])/g, '⊂'],
    [/\\subseteq(?![a-zA-Z])/g, '⊆'],
    [/\\cup(?![a-zA-Z])/g, '∪'],
    [/\\cap(?![a-zA-Z])/g, '∩'],
    [/\\emptyset(?![a-zA-Z])/g, '∅'],
    [/\\forall(?![a-zA-Z])/g, '∀'],
    [/\\exists(?![a-zA-Z])/g, '∃'],
    [/\\therefore(?![a-zA-Z])/g, '∴'],
    [/\\because(?![a-zA-Z])/g, '∵'],
  ];
  for (const [pattern, unicode] of mathSymbols) {
    out = out.replace(pattern, unicode);
  }

  // 13. Delimiters & Spacing
  out = out.replace(/&/g, ' ');
  out = out.replace(/\\[,;!]/g, ' ');
  out = out.replace(/\\(quad|qquad|enspace|thinspace)/g, ' ');
  out = out.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  out = out.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  out = out.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');

  // 14. Normalize multi-line formatting and trim extraneous spaces
  out = out
    .split('\n')
    .map((line) => line.trim().replace(/\s{2,}/g, ' '))
    .filter(Boolean)
    .join('\n');

  return out;
}

export interface TextShapeOptions {
  color?: string;
  size?: 's' | 'm' | 'l' | 'xl';
  font?: 'draw' | 'sans' | 'serif' | 'mono';
  textAlign?: 'start' | 'middle' | 'end';
  w?: number;
}

export function buildTextShape(
  id: TLShapeId,
  x: number,
  y: number,
  text: string,
  options?: TextShapeOptions
) {
  const lineLens = text.split('\n').map((l) => l.trim().length);
  const maxLine = Math.max(...lineLens, 1);
  const charWidth =
    options?.size === 's' ? 9 : options?.size === 'l' ? 17 : options?.size === 'xl' ? 24 : 13;
  const estimatedW = Math.max(30, Math.round(maxLine * charWidth + 24));
  const w = typeof options?.w === 'number' && options.w > 0 ? options.w : estimatedW;

  return {
    id,
    type: 'text' as const,
    x: Math.round(x),
    y: Math.round(y),
    props: {
      richText: toRichText(text),
      size: options?.size || 'm',
      font: options?.font || 'draw',
      color: options?.color || 'black',
      textAlign: options?.textAlign || 'start',
      w,
      autoSize: true,
      scale: 1,
    } as any,
  } as any;
}

export interface GeoShapeOptions {
  geo?: string;
  color?: string;
  fill?: 'none' | 'semi' | 'solid' | 'pattern';
  dash?: 'draw' | 'solid' | 'dashed' | 'dotted';
  size?: 's' | 'm' | 'l' | 'xl';
  font?: 'draw' | 'sans' | 'serif' | 'mono';
  align?: 'start' | 'middle' | 'end';
  verticalAlign?: 'start' | 'middle' | 'end';
  richText?: any;
}

export function buildGeoShape(
  id: TLShapeId,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: GeoShapeOptions
) {
  const color = options?.color || 'black';
  return {
    id,
    type: 'geo' as const,
    x: Math.round(x),
    y: Math.round(y),
    props: {
      geo: (options?.geo || 'rectangle') as any,
      w: Math.max(10, Math.round(w)),
      h: Math.max(10, Math.round(h)),
      growY: 0,
      url: '',
      scale: 1,
      flipX: false,
      flipY: false,
      color,
      labelColor: color,
      fill: options?.fill || 'none',
      dash: options?.dash || 'solid',
      size: options?.size || 'm',
      font: options?.font || 'draw',
      align: options?.align || 'middle',
      verticalAlign: options?.verticalAlign || 'middle',
      richText: options?.richText || toRichText(''),
    } as any,
  } as any;
}

export function buildNoteShape(
  id: TLShapeId,
  x: number,
  y: number,
  text: string,
  options?: { color?: string; size?: 's' | 'm' | 'l' | 'xl'; font?: 'draw' | 'sans' | 'serif' | 'mono' }
) {
  return {
    id,
    type: 'note' as const,
    x: Math.round(x),
    y: Math.round(y),
    props: {
      color: options?.color || 'yellow',
      labelColor: 'black',
      size: options?.size || 'm',
      font: options?.font || 'draw',
      fontSizeAdjustment: 0,
      align: 'middle',
      verticalAlign: 'middle',
      growY: 0,
      url: '',
      richText: toRichText(text),
      scale: 1,
      textLastEditedBy: null,
    } as any,
  } as any;
}

export function buildArrowShape(
  id: TLShapeId,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  label?: string,
  options?: { color?: string; size?: 's' | 'm' | 'l' | 'xl'; dash?: 'draw' | 'solid' | 'dashed' | 'dotted' }
) {
  return {
    id,
    type: 'arrow' as const,
    x: Math.round(startX),
    y: Math.round(startY),
    props: {
      kind: 'arc',
      labelColor: 'black',
      color: options?.color || 'grey',
      fill: 'none',
      dash: options?.dash || 'draw',
      size: options?.size || 's',
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
      font: 'draw',
      start: { x: 0, y: 0 },
      end: { x: Math.round(endX - startX), y: Math.round(endY - startY) },
      bend: 0,
      richText: toRichText(label || ''),
      labelPosition: 0.5,
      scale: 1,
      elbowMidPoint: 0.5,
    } as any,
  } as any;
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
        buildGeoShape(triShapeId, originX, originY, base, height, {
          geo: 'triangle',
          color,
          fill: 'semi',
          dash: 'draw',
          size: 'm',
        }),
      ]);
      createdIds.push(triShapeId);

      // 1B. Right-Angle Square Marker at bottom-left corner
      if (action.geometryParams?.showRightAngleMarker !== false) {
        const markerSize = Math.min(22, Math.floor(Math.min(base, height) / 4));
        if (markerSize >= 4) {
          const markerId = createShapeId(`${action.id}-rt-marker`);
          editor.createShapes([
            buildGeoShape(
              markerId,
              originX + 2,
              originY + height - markerSize - 2,
              markerSize,
              markerSize,
              {
                geo: 'rectangle',
                color: 'grey',
                fill: 'none',
                dash: 'solid',
                size: 's',
              }
            ),
          ]);
          createdIds.push(markerId);
        }
      }

      // 1C. Angle Theta Arc / Label at bottom-right acute angle
      if (action.geometryParams?.showAngleArc !== false) {
        const angleLabelId = createShapeId(`${action.id}-angle-theta`);
        const thetaText = action.geometryParams?.angleLabel || 'θ';
        editor.createShapes([
          buildTextShape(angleLabelId, vertexB.x - 55, vertexB.y - 40, thetaText, {
            color: 'orange',
            size: 'm',
            font: 'serif',
          }),
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
        buildTextShape(adjId, originX + base / 2 - 40, originY + height + 12, adjLabel, {
          color: 'green',
          size: 's',
          font: 'sans',
        }),
        buildTextShape(oppId, originX - 110, originY + height / 2 - 12, oppLabel, {
          color: 'red',
          size: 's',
          font: 'sans',
        }),
        buildTextShape(hypId, originX + base / 2 + 10, originY + height / 2 - 35, hypLabel, {
          color: 'violet',
          size: 's',
          font: 'sans',
        }),
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

      const style = action.style || 'text';

      if (style === 'card') {
        editor.createShapes([
          buildGeoShape(formulaId, layout.x, layout.y, layout.w, layout.h, {
            geo: 'rectangle',
            color: action.color ?? 'yellow',
            fill: 'semi',
            dash: 'solid',
            size: 'm',
            font: 'mono',
            align: 'start',
            verticalAlign: 'start',
            richText: toRichText(fullText),
          }),
        ]);
      } else {
        editor.createShapes([
          buildTextShape(formulaId, layout.x, layout.y, fullText, {
            size: 'm',
            font: 'mono',
            color: action.color ?? 'black',
            textAlign: 'start',
            w: layout.w,
          }),
        ]);
      }
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
        buildGeoShape(
          circleId,
          (action.x ?? 200) - radius,
          (action.y ?? 180) - radius,
          size,
          size,
          {
            geo: 'ellipse',
            color: action.color ?? 'blue',
            fill: 'semi',
            dash: 'draw',
            size: 'm',
          }
        ),
      ]);
      createdIds.push(circleId);

      // Add center coordinate label if provided
      if (action.title || action.label) {
        const textId = createShapeId(`${action.id}-label`);
        editor.createShapes([
          buildTextShape(
            textId,
            (action.x ?? 200) + radius - 40,
            (action.y ?? 180) + size + 8,
            action.title || action.label || '',
            {
              color: 'light-violet',
              size: 's',
            }
          ),
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
        buildGeoShape(shapeId, rawX, rawY, w, h, {
          geo: 'rectangle',
          color: action.color ?? 'blue',
          fill: 'semi',
          dash: 'draw',
          size: 'm',
          font: 'sans',
          align: 'start',
          verticalAlign: 'start',
          richText: toRichText(fullContent || ''),
        }),
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
          buildArrowShape(arrowId, startX, startY, endX, endY, action.label, {
            color: action.color ?? 'grey',
            size: 's',
            dash: 'draw',
          }),
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
 * Includes device orientation (landscape vs portrait) and viewport dimensions.
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

  const isLandscape = typeof window !== 'undefined' ? window.innerWidth >= window.innerHeight : true;
  const orientation: 'landscape' | 'portrait' = isLandscape ? 'landscape' : 'portrait';
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;

  const baseSummary =
    elements.length === 0
      ? 'Whiteboard is currently blank. Full 1280x720 canvas is available.'
      : `${elements.length} element(s) on board: ${summaryParts.join(' | ')}`;

  const spatialSummary = `[Orientation: ${orientation.toUpperCase()} (${viewportWidth}x${viewportHeight})] ${baseSummary}`;

  return {
    canonicalWidth: CANONICAL_BOARD_WIDTH,
    canonicalHeight: CANONICAL_BOARD_HEIGHT,
    elementCount: elements.length,
    elements,
    spatialSummary,
    orientation,
    viewportWidth,
    viewportHeight,
  };
}
