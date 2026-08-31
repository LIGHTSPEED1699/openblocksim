import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../../store/diagramStore';

interface BaseNodeData {
  type: string;
  inputs: number;
  outputs: number;
  color: string;
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

// Build a readable G(s) string from numerator/denominator coefficients.
// e.g. [1] / [1, 1] → "1/(s+1)", [2] / [1, 0.4, 1] → "2/(s²+0.4s+1)"
function polyString(coeffs: number[]): string {
  const n = coeffs.length;
  if (n === 1) return formatCoeff(coeffs[0]);
  const terms: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = coeffs[i];
    if (c === 0) continue;
    const power = n - 1 - i;
    const coeffStr = c === 1 && power > 0 ? '' : c === -1 && power > 0 ? '-' : formatCoeff(c);
    const varStr = power === 0 ? '' : power === 1 ? 's' : `s${superscript(power)}`;
    terms.push(coeffStr + varStr);
  }
  return terms.join('+').replace('+-', '-');
}

function formatCoeff(c: number): string {
  return Number.isInteger(c) ? String(c) : c.toFixed(2).replace(/\.?0+$/, '');
}

function superscript(n: number): string {
  const map: Record<number, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(n).split('').map(d => map[+d] ?? d).join('');
}

function tfToString(num: number[], den: number[]): string {
  const numStr = polyString(num);
  const denStr = polyString(den);
  // Short form: if denominator is just a constant, show num/den directly
  if (den.length === 1) return `${numStr}/${denStr}`;
  return `${numStr}/(${denStr})`;
}

export function BaseNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData;
  const selectedBlockId = useDiagramStore((s) => s.selectedBlockId);
  const params = useDiagramStore((s) => s.params[id]);
  const isSelected = id === selectedBlockId;

  let icon = ICONS[nodeData.type] ?? nodeData.type;

  // TransferFunction: show actual formula from num/den params
  if (nodeData.type === 'TransferFunction' && params) {
    const num = params.num as number[] | undefined;
    const den = params.den as number[] | undefined;
    if (num && den) {
      icon = tfToString(num, den);
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

  const isImageBlock = nodeData.type === 'Scope' || nodeData.type === 'Step';
  const theme = useDiagramStore((s) => s.theme);
  const imgIcon = theme === 'dark'
    ? (nodeData.type === 'Scope' ? '/scope-icon-dark.png' : '/step-icon-dark.png')
    : (nodeData.type === 'Scope' ? '/scope-icon.png' : '/step-icon.png');

  // Sum block: render + / - signs on input ports based on signs parameter
  // PID block: label input ports as e and PV
  const isSum = nodeData.type === 'Sum';
  const isPid = nodeData.type === 'PID';
  // Fall back to default signs [1, 1] when params not yet populated (e.g. freshly dropped)
  const signs = isSum ? ((params?.signs as number[]) ?? [1, 1]) : null;
  const pidLabels = isPid ? ['e', 'PV'] : null;

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

  return (
    <div
      className={`px-3 py-2 rounded border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-600 dark:border-slate-500'} bg-white dark:bg-slate-800 min-w-[60px] min-h-[40px] flex items-center justify-center relative`}
    >
      {/* Thin left accent stripe for category */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${nodeData.color}`} />
      <span className={`select-none ${isComment ? 'text-[10px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words max-w-[240px] text-left leading-relaxed' : nodeData.type === 'TransferFunction' && params?.num ? 'text-[10px] font-mono' : 'text-sm font-medium'} text-slate-800 dark:text-slate-100`}>
        {isImageBlock ? (
          <img src={imgIcon} alt={nodeData.type} className="w-5 h-5 inline-block" />
        ) : (
          icon
        )}
      </span>
      {Array.from({ length: effectiveInputs }).map((_, i) => {
        const topPct = `${((i + 1) / (effectiveInputs + 1)) * 100}%`;
        const signLabel = signs ? (signs[i] ?? 1) >= 0 ? '+' : '−' : null;
        const portLabel = pidLabels ? pidLabels[i] : null;
        const isPortLabel = portLabel !== null;
        return (
          <div key={`in-${i}`}>
            {(signLabel || portLabel) && (
              <div
                className={`absolute select-none ${isPortLabel ? 'text-[6px] font-normal' : 'text-xs font-bold'} text-slate-600 dark:text-slate-300`}
                style={{ top: topPct, left: '6px', transform: 'translateY(-50%)' }}
              >
                {signLabel || portLabel}
              </div>
            )}
            <Handle
              type="target"
              position={Position.Left}
              id={`in-${i}`}
              style={{ top: topPct }}
              className="w-2 h-2 bg-slate-500 dark:bg-slate-400"
            />
          </div>
        );
      })}
      {Array.from({ length: effectiveOutputs }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: `${((i + 1) / (nodeData.outputs + 1)) * 100}%` }}
          className="w-2 h-2 bg-slate-500 dark:bg-slate-400"
        />
      ))}
    </div>
  );
}