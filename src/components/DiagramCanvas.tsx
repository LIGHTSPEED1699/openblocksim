import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { BlockType, BlockCategory, type BlockFactory } from '../blocks/types';
import { SourceNode } from './nodes/SourceNode';
import { SinkNode } from './nodes/SinkNode';
import { MathNode } from './nodes/MathNode';
import { LinearNode } from './nodes/LinearNode';
import { NonlinearNode } from './nodes/NonlinearNode';
import { ControlNode } from './nodes/ControlNode';
import { Constant } from '../blocks/sources/Constant';
import { Step } from '../blocks/sources/Step';
import { Ramp } from '../blocks/sources/Ramp';
import { Sine } from '../blocks/sources/Sine';
import { Square } from '../blocks/sources/Square';
import { Scope } from '../blocks/sinks/Scope';
import { ToWorkspace } from '../blocks/sinks/ToWorkspace';
import { Sum } from '../blocks/math/Sum';
import { Gain } from '../blocks/math/Gain';
import { Product } from '../blocks/math/Product';
import { Integrator } from '../blocks/linear/Integrator';
import { Derivative } from '../blocks/linear/Derivative';
import { TransferFunction } from '../blocks/linear/TransferFunction';
import { StateSpace } from '../blocks/linear/StateSpace';
import { TransportDelay } from '../blocks/linear/TransportDelay';
import { Saturation } from '../blocks/nonlinear/Saturation';
import { Deadzone } from '../blocks/nonlinear/Deadzone';
import { PID } from '../blocks/control/PID';
import { Relay } from '../blocks/control/Relay';

const FACTORIES: Record<BlockType, BlockFactory> = {
  [BlockType.Constant]: Constant,
  [BlockType.Step]: Step,
  [BlockType.Ramp]: Ramp,
  [BlockType.Sine]: Sine,
  [BlockType.Square]: Square,
  [BlockType.Scope]: Scope,
  [BlockType.ToWorkspace]: ToWorkspace,
  [BlockType.Sum]: Sum,
  [BlockType.Gain]: Gain,
  [BlockType.Product]: Product,
  [BlockType.Integrator]: Integrator,
  [BlockType.Derivative]: Derivative,
  [BlockType.TransferFunction]: TransferFunction,
  [BlockType.StateSpace]: StateSpace,
  [BlockType.TransportDelay]: TransportDelay,
  [BlockType.Saturation]: Saturation,
  [BlockType.Deadzone]: Deadzone,
  [BlockType.PID]: PID,
  [BlockType.Relay]: Relay,
};

const nodeTypes = {
  Source: SourceNode,
  Sink: SinkNode,
  Math: MathNode,
  Linear: LinearNode,
  Nonlinear: NonlinearNode,
  Control: ControlNode,
};

function blockMeta(type: BlockType): { inputs: number; outputs: number; category: BlockCategory } {
  const block = FACTORIES[type].create();
  return { inputs: block.inputs, outputs: block.outputs, category: block.category };
}

export function DiagramCanvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const setNodes = useDiagramStore((s) => s.setNodes);
  const setEdges = useDiagramStore((s) => s.setEdges);
  const selectBlock = useDiagramStore((s) => s.selectBlock);
  const addNode = useDiagramStore((s) => s.addNode);
  const removeNode = useDiagramStore((s) => s.removeNode);
  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(applyNodeChanges(changes, nodes) as Node[]);
    },
    [nodes, setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges) as Edge[]);
    },
    [edges, setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(addEdge(
        { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}` },
        edges
      ) as Edge[]);
    },
    [edges, setEdges]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow') as BlockType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { inputs, outputs, category } = blockMeta(type);
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: category,
        position,
        data: { type, inputs, outputs, color: '' },
      };
      addNode(newNode, type, {});
    },
    [addNode, screenToFlowPosition]
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => removeNode(node.id));
    },
    [removeNode]
  );

  return (
    <div className="flex-1 h-full" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectBlock(node.id)}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}