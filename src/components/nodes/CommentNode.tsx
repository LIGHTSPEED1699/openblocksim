import { type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../../store/diagramStore';

interface CommentData {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export function CommentNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as CommentData;
  const selectedBlockId = useDiagramStore((s) => s.selectedBlockId);
  const params = useDiagramStore((s) => s.params[id]);
  const isSelected = id === selectedBlockId;

  const text = (params?.text as string) ?? (nodeData.text as string) ?? 'Comment';

  return (
    <div
      className={`px-3 py-2 rounded border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-dashed border-slate-400 dark:border-slate-500'} bg-yellow-50 dark:bg-slate-800/60 min-w-[80px] max-w-[280px]`}
      style={{ pointerEvents: 'all' }}
    >
      <div className="text-xs text-slate-700 dark:text-slate-200 select-none whitespace-pre-wrap break-words leading-relaxed">
        {text}
      </div>
    </div>
  );
}