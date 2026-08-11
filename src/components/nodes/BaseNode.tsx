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
};

export function BaseNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData;
  const selectedBlockId = useDiagramStore((s) => s.selectedBlockId);
  const params = useDiagramStore((s) => s.params[id]);
  const isSelected = id === selectedBlockId;

  const icon = ICONS[nodeData.type] ?? nodeData.type;
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

  return (
    <div
      className={`px-3 py-2 rounded border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-600 dark:border-slate-500'} bg-white dark:bg-slate-800 min-w-[60px] min-h-[40px] flex items-center justify-center relative`}
    >
      {/* Thin left accent stripe for category */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${nodeData.color}`} />
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 select-none">
        {isImageBlock ? (
          <img src={imgIcon} alt={nodeData.type} className="w-5 h-5 inline-block" />
        ) : (
          icon
        )}
      </span>
      {Array.from({ length: nodeData.inputs }).map((_, i) => {
        const topPct = `${((i + 1) / (nodeData.inputs + 1)) * 100}%`;
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
      {Array.from({ length: nodeData.outputs }).map((_, i) => (
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