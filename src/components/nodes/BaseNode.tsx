import { Handle, Position, type NodeProps } from '@xyflow/react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { useDiagramStore } from '../../store/diagramStore';
import { BlockType } from '../../blocks/types';
import { getBlockMeta } from '../../blocks/meta';
import { resolvePortLabels } from './portLabels';

interface BaseNodeData {
  type: string;
  inputs: number;
  outputs: number;
  color: string;
  flipped?: boolean; // horizontal mirror; renders in Task T4
  [key: string]: unknown;
}

const ICONS: Record<string, string> = {
  // Sources
  Constant: '1',
  Step: '⌐',
  Ramp: '╱',
  Sine: '∿',
  Square: '⊓',
  // Math
  Sum: 'Σ',
  Gain: 'K',
  Product: '⊗',
  // Linear
  Integrator: '∫',
  Derivative: 'd/dt',
  TransferFunction: 'G(s)',
  StateSpace: 'SS',
  TransportDelay: 'τ',
  // Nonlinear
  Saturation: '⊥',
  Deadzone: '⊣',
  // Control
  PID: 'PID',
  Relay: '⇌',
  // Sinks
  Scope: '⊘',
  ToWorkspace: 'W',
  // Annotation
  Comment: '📝',
};

// Build a LaTeX polynomial from descending-degree coefficients, e.g.
// [1] / [1, 1] in s → "1 / (s+1)". Used for KaTeX math faces.
function polyTex(coeffs: number[], variable: 's' | 'z'): string {
  const n = coeffs.length;
  const terms: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = coeffs[i];
    if (c === 0) continue;
    const power = n - 1 - i;
    const abs = Math.abs(c);
    const coeffStr = abs === 1 && power > 0 ? '' : formatCoeff(abs);
    const varStr = power === 0 ? '' : power === 1 ? variable : `${variable}^{${power}}`;
    terms.push(`${c < 0 ? '-' : '+'}${coeffStr}${varStr}`);
  }
  let s = terms.join('');
  if (s.startsWith('+')) s = s.slice(1);
  return s || '0';
}

function formatCoeff(c: number): string {
  return Number.isInteger(c) ? String(c) : String(parseFloat(c.toFixed(3)));
}

export function BaseNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData;
  const selectedBlockId = useDiagramStore((s) => s.selectedBlockId);
  const params = useDiagramStore((s) => s.params[id]);
  const isSelected = id === selectedBlockId;

  let icon = ICONS[nodeData.type] ?? nodeData.type;

  // Math faces: render these block types with KaTeX; all others keep Unicode glyphs.
  let mathTex: string | null = null;
  if (nodeData.type === 'Integrator') {
    mathTex = '\\frac{1}{s}';
  } else if (nodeData.type === 'Derivative') {
    mathTex = 's';
  } else if (nodeData.type === 'StateSpace') {
    mathTex = '\\dot{x}=Ax+Bu';
  } else if (nodeData.type === 'TransferFunction' || nodeData.type === 'DiscreteTransferFcn') {
    const variable = nodeData.type === 'TransferFunction' ? 's' : 'z';
    const denFallback = nodeData.type === 'TransferFunction' ? [1, 1] : [1, -0.5];
    const num = (params?.num as number[] | undefined) ?? [1];
    const den = (params?.den as number[] | undefined) ?? denFallback;
    if (num && den) {
      mathTex = `\\frac{${polyTex(num, variable)}}{${polyTex(den, variable)}}`;
    }
  }

  // Comment: show actual text content instead of icon (like TF shows its formula)
  const isComment = nodeData.type === 'Comment';
  if (isComment && params) {
    const text = params.text as string | undefined;
    if (text) {
      icon = text;
    }
  }

  // Constant: show actual value instead of "1" icon
  if (nodeData.type === 'Constant' && params) {
    const val = params.value as number | undefined;
    if (val !== undefined) {
      icon = String(val);
    }
  }

  const isImageBlock = nodeData.type === 'Scope' || nodeData.type === 'Step';
  const theme = useDiagramStore((s) => s.theme);
  const imgIcon = theme === 'dark'
    ? (nodeData.type === 'Scope' ? '/scope-icon-dark.png' : '/step-icon-dark.png')
    : (nodeData.type === 'Scope' ? '/scope-icon.png' : '/step-icon.png');

  // Variable-input blocks: override nodeData.inputs with param-driven count
  const variableInputTypes = ['Sum', 'Product'];
  let effectiveInputs = nodeData.inputs;
  if (variableInputTypes.includes(nodeData.type) && params?.inputCount) {
    effectiveInputs = Math.max(2, Math.min(nodeData.type === 'Sum' ? 8 : 4, params.inputCount as number));
  }

  // Comment: no connection handles (annotation-only, not a signal node)
  if (isComment) {
    effectiveInputs = 0;
  }
  const effectiveOutputs = isComment ? 0 : nodeData.outputs;

  // ── Port labels (Feature H, R-H1) ──
  // Sum shows its live +/− sign per input (from params.signs) — a static
  // BlockMeta list cannot express signs, so Sum is excluded from the generic
  // resolver and its (removed) meta portLabels no longer double-labels.
  // Every other block: explicit meta portLabels override u/inN defaults.
  const isSum = nodeData.type === 'Sum';
  const signs = isSum ? ((params?.signs as number[] | undefined) ?? [1, 1]) : null;
  const metaEntry = getBlockMeta(nodeData.type as BlockType);
  const labels = resolvePortLabels(effectiveInputs, effectiveOutputs, metaEntry?.portLabels);
  const inputLabelText = (i: number): string | null => {
    // Sum keeps its existing sign semantics: every input port shows its sign,
    // defaulting to '+' beyond the length of the stored signs array.
    if (isSum) return (signs![i] ?? 1) >= 0 ? '+' : '−';
    return labels.inputs[i] ?? null;
  };
  const outputLabelText = (i: number): string | null => labels.outputs[i] ?? null;

  // Port sides. Normal layout: inputs left, outputs right. A flipped node
  // (node.data.flipped === true, toggled by the store's flipNode) mirrors
  // horizontally: inputs move to the right edge, outputs to the left edge.
  // Node content stays upright — only handle + label sides swap.
  const flipped = nodeData.flipped === true;
  const inSide = flipped ? 'right' : 'left';
  const outSide = flipped ? 'left' : 'right';

  return (
    <div
      className={`px-3 py-2 rounded border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-600 dark:border-slate-500'} bg-white dark:bg-slate-800 min-w-[60px] min-h-[40px] flex items-center justify-center relative`}
    >
      {/* Thin left accent stripe for category */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${nodeData.color}`} />
      <span className={`select-none ${
        isComment
          ? 'text-[10px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words max-w-[240px] text-left leading-relaxed'
          : mathTex
            ? (nodeData.type === 'TransferFunction' || nodeData.type === 'DiscreteTransferFcn') ? 'text-[10px]' : 'text-base leading-none'
            : 'text-sm font-medium'
      } text-slate-800 dark:text-slate-100`}>
        {isImageBlock ? (
          <img src={imgIcon} alt={nodeData.type} className="w-5 h-5 inline-block" />
        ) : mathTex ? (
          <InlineMath math={mathTex} />
        ) : (
          icon
        )}
      </span>
      {Array.from({ length: effectiveInputs }).map((_, i) => {
        const topPct = `${((i + 1) / (effectiveInputs + 1)) * 100}%`;
        const label = inputLabelText(i);
        return (
          <div key={`in-${i}`}>
            {label !== null && (
              <div
                className={`absolute select-none pointer-events-none ${isSum ? 'text-xs font-bold' : 'text-[8px] font-normal'} text-slate-600 dark:text-slate-300`}
                data-testid={`port-in-${i}`}
                data-side={inSide}
                style={inSide === 'right'
                  ? { top: topPct, right: 6, transform: 'translateY(-50%)' }
                  : { top: topPct, left: 6, transform: 'translateY(-50%)' }}
              >
                {label}
              </div>
            )}
            <Handle
              type="target"
              position={inSide === 'right' ? Position.Right : Position.Left}
              id={`in-${i}`}
              style={{ top: topPct }}
              className="w-2 h-2 bg-slate-500 dark:bg-slate-400"
            />
          </div>
        );
      })}
      {Array.from({ length: effectiveOutputs }).map((_, i) => {
        const topPct = `${((i + 1) / (effectiveOutputs + 1)) * 100}%`;
        const label = outputLabelText(i);
        return (
          <div key={`out-${i}`}>
            {label !== null && (
              <div
                className="absolute select-none pointer-events-none text-[8px] font-normal text-slate-600 dark:text-slate-300"
                data-testid={`port-out-${i}`}
                data-side={outSide}
                style={outSide === 'left'
                  ? { top: topPct, left: 6, transform: 'translateY(-50%)' }
                  : { top: topPct, right: 6, transform: 'translateY(-50%)' }}
              >
                {label}
              </div>
            )}
            <Handle
              type="source"
              position={outSide === 'left' ? Position.Left : Position.Right}
              id={`out-${i}`}
              style={{ top: topPct }}
              className="w-2 h-2 bg-slate-500 dark:bg-slate-400"
            />
          </div>
        );
      })}
    </div>
  );
}