import { useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../../store/diagramStore';
import { parseInnerGraph, subsystemPortCounts } from '../../engine/subsystems';
import type { Params } from '../../blocks/types';

export function SubsystemNode({ id, selected }: NodeProps) {
  const params = useDiagramStore((s) => s.params[id]);
  const { inputs, outputs } = useMemo(() => {
    const raw = params?.subsystem;
    if (typeof raw !== 'string' || raw.length === 0) return { inputs: 0, outputs: 0 };
    try {
      return subsystemPortCounts(parseInnerGraph(params as Params));
    } catch {
      return { inputs: 0, outputs: 0 };
    }
  }, [params]);

  return (
    <div
      className={`px-3 py-2 rounded border ${
        selected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-slate-600 dark:border-slate-500'
      } bg-white dark:bg-slate-800 min-w-[80px] min-h-[40px] relative`}
    >
      <span className="text-xs font-medium text-slate-800 dark:text-slate-100 select-none">Subsystem</span>
      {Array.from({ length: inputs }).map((_, i) => (
        <Handle key={`in-${i}`} type="target" position={Position.Left} id={`in-${i}`}
          style={{ top: `${((i + 1) / (inputs + 1)) * 100}%` }}
          className="w-2 h-2 bg-slate-500 dark:bg-slate-400" />
      ))}
      {Array.from({ length: outputs }).map((_, i) => (
        <Handle key={`out-${i}`} type="source" position={Position.Right} id={`out-${i}`}
          style={{ top: `${((i + 1) / (outputs + 1)) * 100}%` }}
          className="w-2 h-2 bg-slate-500 dark:bg-slate-400" />
      ))}
    </div>
  );
}
