import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../../store/diagramStore';
import { groupMemberIds, GROUP_BOX_MIN_WIDTH, GROUP_BOX_MIN_HEIGHT } from '../../utils/groups';

export const GROUP_NODE_TYPE = 'GroupBox';

function fillFromHex(hex: string, alphaFraction: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const a = Math.round(alphaFraction * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
  }
  return 'rgba(100,116,139,0.12)';
}

export function GroupBoxNode({ id, selected }: NodeProps) {
  const group = useDiagramStore((s) => s.groups.find((g) => g.id === id));
  const nodes = useDiagramStore((s) => s.nodes);
  const deleteGroup = useDiagramStore((s) => s.deleteGroup);
  const selectGroup = useDiagramStore((s) => s.selectGroup);
  const convertGroupToSubsystem = useDiagramStore((s) => s.convertGroupToSubsystem);

  if (!group) return null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const memberCount = groupMemberIds(group, nodes).length;
    const ok = window.confirm(
      `Delete group "${group.name}" and its ${memberCount} contained block${memberCount === 1 ? '' : 's'}?`,
    );
    if (ok) {
      selectGroup(null);
      deleteGroup(group.id);
    }
  };

  const handleConvert = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectGroup(null);
    convertGroupToSubsystem(group.id);
  };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={GROUP_BOX_MIN_WIDTH}
        minHeight={GROUP_BOX_MIN_HEIGHT}
        onResizeStart={() => useDiagramStore.getState().beginCoalesce()}
        onResizeEnd={() => useDiagramStore.getState().endCoalesce()}
      />
      <div
        data-testid="group-box"
        className="absolute inset-0 rounded-lg border-2"
        style={{
          borderColor: group.color,
          backgroundColor: fillFromHex(group.color, 0.12),
          pointerEvents: 'none',
        }}
      >
        <div
          className="absolute left-2 top-1 text-xs font-semibold select-none whitespace-nowrap"
          style={{ color: group.color, pointerEvents: 'none' }}
        >
          {group.name}
        </div>
        {selected && (
          <div className="nodrag absolute right-1 top-1 flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
            <button
              type="button"
              aria-label={`Convert ${group.name} to subsystem`}
              title="Convert to subsystem"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleConvert}
              className="w-5 h-5 rounded-full text-white text-[10px] leading-none flex items-center justify-center hover:opacity-80"
              style={{ backgroundColor: group.color }}
            >
              ⇥
            </button>
            <button
              type="button"
              aria-label={`Delete ${group.name} and contents`}
              title={`Delete ${group.name} and its contents`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleDelete}
              className="w-5 h-5 rounded-full text-white text-xs leading-none flex items-center justify-center hover:opacity-80"
              style={{ backgroundColor: group.color }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </>
  );
}
