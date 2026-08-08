import { BlockType } from '../blocks/types';
import { useDiagramStore } from '../store/diagramStore';

const ICONS: Record<BlockType, string> = {
  [BlockType.Constant]: '1',
  [BlockType.Step]: '⌐',
  [BlockType.Ramp]: '╱',
  [BlockType.Sine]: '∿',
  [BlockType.Square]: '⊓',
  [BlockType.Scope]: '⊘',
  [BlockType.ToWorkspace]: 'W',
  [BlockType.Sum]: 'Σ',
  [BlockType.Gain]: '×',
  [BlockType.Product]: '⊗',
  [BlockType.Integrator]: '∫',
  [BlockType.Derivative]: 'd/dt',
  [BlockType.TransferFunction]: 'G(s)',
  [BlockType.StateSpace]: 'SS',
  [BlockType.TransportDelay]: 'τ',
  [BlockType.Saturation]: '⊥',
  [BlockType.Deadzone]: '⊣',
  [BlockType.PID]: 'PID',
  [BlockType.Relay]: '⇌',
};

const BLOCK_GROUPS: { label: string; accent: string; blocks: BlockType[] }[] = [
  { label: 'Sources', accent: 'border-l-green-500', blocks: [BlockType.Constant, BlockType.Step, BlockType.Ramp, BlockType.Sine, BlockType.Square] },
  { label: 'Sinks', accent: 'border-l-blue-500', blocks: [BlockType.Scope, BlockType.ToWorkspace] },
  { label: 'Math', accent: 'border-l-orange-500', blocks: [BlockType.Sum, BlockType.Gain, BlockType.Product] },
  { label: 'Linear', accent: 'border-l-purple-500', blocks: [BlockType.TransferFunction, BlockType.StateSpace, BlockType.Integrator, BlockType.Derivative, BlockType.TransportDelay] },
  { label: 'Nonlinear', accent: 'border-l-red-500', blocks: [BlockType.Saturation, BlockType.Deadzone] },
  { label: 'Control', accent: 'border-l-teal-500', blocks: [BlockType.PID, BlockType.Relay] },
];

interface Props {
  onDragStart: (type: BlockType) => void;
}

export function BlockLibrary({ onDragStart }: Props) {
  const theme = useDiagramStore((s) => s.theme);
  const scopeIcon = theme === 'dark' ? '/scope-icon-dark.png' : '/scope-icon.png';
  const stepIcon = theme === 'dark' ? '/step-icon-dark.png' : '/step-icon.png';
  const isImageIcon = (type: BlockType) => type === BlockType.Scope || type === BlockType.Step;
  const iconFor = (type: BlockType) => {
    if (type === BlockType.Scope) return scopeIcon;
    if (type === BlockType.Step) return stepIcon;
    return '';
  };

  return (
    <div className="w-44 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] overflow-y-auto p-2">
      {BLOCK_GROUPS.map(({ label, accent, blocks }) => (
        <div key={label} className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">{label}</h3>
          {blocks.map((type) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', type);
                onDragStart(type);
              }}
              className={`flex items-center gap-2 ${accent} border-l-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-r px-2 py-1 mb-1 cursor-grab hover:opacity-80 transition-opacity select-none`}
            >
              {isImageIcon(type) ? (
                <img src={iconFor(type)} alt={type} className="w-5 h-5" />
              ) : (
                <span className="font-mono text-base">{ICONS[type]}</span>
              )}
              {!isImageIcon(type) && (
                <span className="text-xs text-[var(--text-secondary)]">{type}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}