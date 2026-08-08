import { BlockType } from '../blocks/types';

const BLOCK_GROUPS: { label: string; color: string; blocks: BlockType[] }[] = [
  { label: 'Sources', color: 'bg-block-source', blocks: [BlockType.Constant, BlockType.Step, BlockType.Ramp, BlockType.Sine, BlockType.Square] },
  { label: 'Sinks', color: 'bg-block-sink', blocks: [BlockType.Scope, BlockType.ToWorkspace] },
  { label: 'Math', color: 'bg-block-math', blocks: [BlockType.Sum, BlockType.Gain, BlockType.Product] },
  { label: 'Linear', color: 'bg-block-linear', blocks: [BlockType.TransferFunction, BlockType.StateSpace, BlockType.Integrator, BlockType.Derivative, BlockType.TransportDelay] },
  { label: 'Nonlinear', color: 'bg-block-nonlinear', blocks: [BlockType.Saturation, BlockType.Deadzone] },
  { label: 'Control', color: 'bg-block-control', blocks: [BlockType.PID, BlockType.Relay] },
];

interface Props {
  onDragStart: (type: BlockType) => void;
}

export function BlockLibrary({ onDragStart }: Props) {
  return (
    <div className="w-48 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] overflow-y-auto p-2">
      {BLOCK_GROUPS.map(({ label, color, blocks }) => (
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
              className={`${color} text-white text-sm rounded-md px-2 py-1 mb-1 cursor-grab hover:opacity-80 transition-opacity`}
            >
              {type}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}