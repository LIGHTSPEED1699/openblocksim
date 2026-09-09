import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeTypes,
  type XYPosition,
} from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { nodeFromSerializedBlock } from '../utils/exportImport';
import type { SerializedGraph, SerializedEdge } from '../engine/types';
import { BlockType } from '../blocks/types';
import { SourceNode } from './nodes/SourceNode';
import { SinkNode } from './nodes/SinkNode';
import { MathNode } from './nodes/MathNode';
import { LinearNode } from './nodes/LinearNode';
import { NonlinearNode } from './nodes/NonlinearNode';
import { ControlNode } from './nodes/ControlNode';
import { RoutingNode } from './nodes/RoutingNode';
import { DiscreteNode } from './nodes/DiscreteNode';
import { CommentNode } from './nodes/CommentNode';
import { PortNode } from './nodes/PortNode';
import { StraightEdge } from './edges/StraightEdge';
import { ParameterPanel } from './ParameterPanel';
import type { Params } from '../blocks/types';

const NODE_TYPES: NodeTypes = {
  Source: SourceNode, Sink: SinkNode, Math: MathNode, Linear: LinearNode,
  Nonlinear: NonlinearNode, Control: ControlNode, Routing: RoutingNode,
  Discrete: DiscreteNode, Annotation: CommentNode, Port: PortNode,
};
const EDGE_TYPES = { straight: StraightEdge };

function parsePort(handle: string | null | undefined): number {
  if (!handle) return 0;
  const parts = handle.split('-');
  const n = parseInt(parts[parts.length - 1], 10);
  return isNaN(n) ? 0 : n;
}

interface Draft {
  nodes: Node[];
  edges: Edge[];
  params: Record<string, Params>;
}

function loadDraft(json: string): Draft {
  const inner = JSON.parse(json) as SerializedGraph;
  return {
    nodes: inner.blocks.map(nodeFromSerializedBlock),
    edges: inner.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: `out-${e.sourcePort}`,
      targetHandle: `in-${e.targetPort}`,
      type: 'straight' as const,
      data: { waypoints: [] },
    })),
    params: Object.fromEntries(inner.blocks.map((b) => [b.id, b.params])),
  };
}

function serializeDraft(d: Draft): SerializedGraph {
  return {
    blocks: d.nodes.map((n) => ({
      id: n.id,
      type: n.data?.type as BlockType,
      params: d.params[n.id] ?? {},
      position: n.position,
    })),
    edges: d.edges.map((e): SerializedEdge => ({
      id: e.id,
      source: e.source,
      sourcePort: parsePort(e.sourceHandle),
      target: e.target,
      targetPort: parsePort(e.targetHandle),
    })),
  };
}

function MiniCanvas({ draft, onDropBlock, onPatch, setSelectedId, theme }: {
  draft: Draft;
  onDropBlock: (type: BlockType, position: XYPosition) => void;
  onPatch: (p: Partial<Draft>) => void;
  setSelectedId: (id: string | null) => void;
  theme: 'dark' | 'light';
}) {
  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, draft.nodes) as Node[];
      const removed = new Set(
        changes.filter((c) => c.type === 'remove').map((c) => c.id),
      );
      onPatch({
        nodes: next,
        params: Object.fromEntries(Object.entries(draft.params).filter(([k]) => !removed.has(k))),
      });
    },
    [draft.nodes, draft.params, onPatch],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => onPatch({ edges: applyEdgeChanges(changes, draft.edges) as Edge[] }),
    [draft.edges, onPatch],
  );
  const onConnect = useCallback(
    (conn: Connection) =>
      onPatch({
        edges: addEdge(
          { ...conn, id: `draft-${Date.now()}`, type: 'straight', data: { waypoints: [] } },
          draft.edges,
        ) as Edge[],
      }),
    [draft.edges, onPatch],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow') as BlockType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropBlock(type, position);
    },
    [screenToFlowPosition, onDropBlock],
  );

  return (
    <div className="flex-1 relative" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={draft.nodes}
        edges={draft.edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedId(node.id)}
        fitView
        colorMode={theme}
        defaultEdgeOptions={{ type: 'straight' }}
        deleteKeyCode={['Backspace', 'Delete']}
        zoomOnDoubleClick={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function SubsystemEditor({ subsystemId, onClose }: { subsystemId: string; onClose: () => void }) {
  const params = useDiagramStore((s) => s.params[subsystemId]);
  const updateParams = useDiagramStore((s) => s.updateParams);
  const theme = useDiagramStore((s) => s.theme);

  const [draft, setDraft] = useState<Draft>(() => {
    const raw = params?.subsystem;
    return typeof raw === 'string' && raw.length > 0
      ? loadDraft(raw)
      : { nodes: [], edges: [], params: {} };
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const inportCount = useMemo(() => draft.nodes.filter((n) => n.data?.type === 'Inport').length, [draft.nodes]);
  const outportCount = useMemo(() => draft.nodes.filter((n) => n.data?.type === 'Outport').length, [draft.nodes]);

  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);

  const addPort = useCallback(
    (kind: 'Inport' | 'Outport') => {
      const isIn = kind === 'Inport';
      const port = isIn ? inportCount : outportCount;
      const id = `${kind}-${Date.now()}`;
      patch({
        nodes: [
          ...draft.nodes,
          {
            id,
            type: 'Port',
            position: { x: isIn ? -240 : 240, y: -160 + port * 80 },
            data: { type: kind, inputs: isIn ? 0 : 1, outputs: isIn ? 1 : 0, color: '' },
          },
        ],
        params: { ...draft.params, [id]: { port } },
      });
    },
    [draft.nodes, draft.params, inportCount, outportCount, patch],
  );

  const dropBlock = useCallback(
    (type: BlockType, position: XYPosition) => {
      if (type === BlockType.Subsystem) {
        window.alert('Nested subsystems are not editable yet — engine supports them, the editor does not (v1).');
        return;
      }
      const id = `${type}-${Date.now()}`;
      const node = nodeFromSerializedBlock({
        id,
        type,
        params: {},
        position,
      });
      patch({
        nodes: [...draft.nodes, node],
        params: { ...draft.params, [id]: {} },
      });
    },
    [draft.nodes, draft.params, patch],
  );

  const handleSave = () => {
    updateParams(subsystemId, { subsystem: JSON.stringify(serializeDraft(draft)) });
    onClose();
  };

  const selectedType = selectedId
    ? (draft.nodes.find((n) => n.id === selectedId)?.data?.type as BlockType | undefined) ?? null
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" data-testid="subsystem-editor">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-2xl flex flex-col w-[80vw] h-[80vh]">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Subsystem Editor</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => addPort('Inport')} className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm">Add Input</button>
            <button type="button" onClick={() => addPort('Outport')} className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm">Add Output</button>
            <button type="button" onClick={handleSave} className="px-2 py-1 bg-[var(--accent)] text-white rounded text-sm">Save</button>
            <button type="button" onClick={onClose} className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm">Cancel</button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <ReactFlowProvider>
            <MiniCanvas
              draft={draft}
              onDropBlock={dropBlock}
              onPatch={patch}
              setSelectedId={setSelectedId}
              theme={theme}
            />
          </ReactFlowProvider>
          <ParameterPanel
            selectedBlockId={selectedId}
            blockType={selectedType}
            params={selectedId ? draft.params[selectedId] ?? {} : {}}
            onUpdate={(id, p) => patch({ params: { ...draft.params, [id]: { ...draft.params[id], ...p } } })}
          />
        </div>
      </div>
    </div>
  );
}
