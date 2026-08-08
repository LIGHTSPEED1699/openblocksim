import { Handle, Position, type NodeProps } from '@xyflow/react';

interface BaseNodeData {
  type: string;
  inputs: number;
  outputs: number;
  color: string;
  [key: string]: unknown;
}

export function BaseNode({ data }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData;
  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${nodeData.color} bg-[var(--bg-secondary)] min-w-[80px] text-center`}>
      <div className="text-sm font-medium text-[var(--text-primary)]">{nodeData.type}</div>
      {Array.from({ length: nodeData.inputs }).map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: `${((i + 1) / (nodeData.inputs + 1)) * 100}%` }}
          className="w-2 h-2 bg-[var(--accent)]"
        />
      ))}
      {Array.from({ length: nodeData.outputs }).map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: `${((i + 1) / (nodeData.outputs + 1)) * 100}%` }}
          className="w-2 h-2 bg-[var(--accent)]"
        />
      ))}
    </div>
  );
}