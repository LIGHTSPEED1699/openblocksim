import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { BlockType, BlockCategory, type BlockFactory, type Params } from '../blocks/types';
import { GroupBoxNode, GROUP_NODE_TYPE } from './nodes/GroupBoxNode';
import { partitionNodeChanges } from '../utils/groupNodeChanges';
import { StraightEdge } from './edges/StraightEdge';
import { ConnectionPreview } from './ConnectionPreview';
import { WireOverlay } from './WireOverlay';
import { wireGesture } from './edges/wireGesture';
import { completeConnection } from './edges/completeConnection';
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
import { Comment } from '../blocks/annotation/Comment';
import { Abs } from '../blocks/math/Abs';
import { Sign } from '../blocks/math/Sign';
import { Bias } from '../blocks/math/Bias';
import { UnaryMinus } from '../blocks/math/UnaryMinus';
import { Divide } from '../blocks/math/Divide';
import { MinMax } from '../blocks/math/MinMax';
import { RoundingFunction } from '../blocks/math/RoundingFunction';
import { MathFunction } from '../blocks/math/MathFunction';
import { TrigFunction } from '../blocks/math/TrigFunction';
import { Interpolate } from '../blocks/math/Interpolate';
import { Pow } from '../blocks/math/Pow';
import { Clip } from '../blocks/math/Clip';
import { Switch } from '../blocks/routing/Switch';
import { Mux } from '../blocks/routing/Mux';
import { Demux } from '../blocks/routing/Demux';
import { UnitDelay } from '../blocks/discrete/UnitDelay';
import { DiscreteIntegrator } from '../blocks/discrete/DiscreteIntegrator';
import { DiscreteTransferFcn } from '../blocks/discrete/DiscreteTransferFcn';
import { Memory } from '../blocks/discrete/Memory';
import { RateLimiter } from '../blocks/nonlinear/RateLimiter';
import { Quantizer } from '../blocks/nonlinear/Quantizer';
import { Backlash } from '../blocks/nonlinear/Backlash';
import { PulseGenerator } from '../blocks/sources/PulseGenerator';
import { Clock } from '../blocks/sources/Clock';
import { ChirpSignal } from '../blocks/sources/ChirpSignal';
import { RepeatingSequence } from '../blocks/sources/RepeatingSequence';
import { RandomNumber } from '../blocks/sources/RandomNumber';
import { Terminator } from '../blocks/sinks/Terminator';
import { Display } from '../blocks/sinks/Display';
import { StopSimulation } from '../blocks/sinks/StopSimulation';
import { CommentNode } from './nodes/CommentNode';
import { RoutingNode } from './nodes/RoutingNode';
import { DiscreteNode } from './nodes/DiscreteNode';

const FACTORIES: Record<BlockType, BlockFactory> = {
  [BlockType.Comment]: Comment,
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
  [BlockType.Abs]: Abs,
  [BlockType.Sign]: Sign,
  [BlockType.Bias]: Bias,
  [BlockType.UnaryMinus]: UnaryMinus,
  [BlockType.Divide]: Divide,
  [BlockType.MinMax]: MinMax,
  [BlockType.RoundingFunction]: RoundingFunction,
  [BlockType.MathFunction]: MathFunction,
  [BlockType.TrigFunction]: TrigFunction,
  [BlockType.Interpolate]: Interpolate,
  [BlockType.Pow]: Pow,
  [BlockType.Clip]: Clip,
  [BlockType.Switch]: Switch,
  [BlockType.Mux]: Mux,
  [BlockType.Demux]: Demux,
  [BlockType.UnitDelay]: UnitDelay,
  [BlockType.DiscreteIntegrator]: DiscreteIntegrator,
  [BlockType.DiscreteTransferFcn]: DiscreteTransferFcn,
  [BlockType.Memory]: Memory,
  [BlockType.RateLimiter]: RateLimiter,
  [BlockType.Quantizer]: Quantizer,
  [BlockType.Backlash]: Backlash,
  [BlockType.PulseGenerator]: PulseGenerator,
  [BlockType.Clock]: Clock,
  [BlockType.ChirpSignal]: ChirpSignal,
  [BlockType.RepeatingSequence]: RepeatingSequence,
  [BlockType.RandomNumber]: RandomNumber,
  [BlockType.Terminator]: Terminator,
  [BlockType.Display]: Display,
  [BlockType.StopSimulation]: StopSimulation,
};

const nodeTypes = {
  Source: SourceNode,
  Sink: SinkNode,
  Math: MathNode,
  Linear: LinearNode,
  Nonlinear: NonlinearNode,
  Control: ControlNode,
  Routing: RoutingNode,
  Discrete: DiscreteNode,
  Annotation: CommentNode,
  [GROUP_NODE_TYPE]: GroupBoxNode,
};

const edgeTypes = {
  straight: StraightEdge,
};

function blockMeta(type: BlockType, existingParams?: Params): { inputs: number; outputs: number; category: BlockCategory } {
  const block = FACTORIES[type].create(existingParams);
  return { inputs: block.inputs, outputs: block.outputs, category: block.category };
}

export function DiagramCanvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const setNodes = useDiagramStore((s) => s.setNodes);
  const setEdges = useDiagramStore((s) => s.setEdges);
  const selectBlock = useDiagramStore((s) => s.selectBlock);
  const addNode = useDiagramStore((s) => s.addNode);
  const theme = useDiagramStore((s) => s.theme);
  const groups = useDiagramStore((s) => s.groups);
  const selectedGroupId = useDiagramStore((s) => s.selectedGroupId);
  const moveGroupTo = useDiagramStore((s) => s.moveGroupTo);
  const resizeGroup = useDiagramStore((s) => s.resizeGroup);
  const selectGroup = useDiagramStore((s) => s.selectGroup);
  const { screenToFlowPosition, getNode } = useReactFlow();
  const [wireActive, setWireActive] = useState(false);

  // Derived array handed to ReactFlow: user nodes + one GroupBox node per group.
  const displayNodes = useMemo<Node[]>(() => {
    const groupNodes: Node[] = groups.map((g) => ({
      id: g.id,
      type: GROUP_NODE_TYPE,
      position: { x: g.x, y: g.y },
      width: g.width,
      height: g.height,
      // Keep the box below every ordinary node even when selected: RF 'basic'
      // zIndex mode adds +1000 to selected nodes (elevateNodesOnSelect), so
      // -1001 selected = -1 < 0 (verified: system/dist/esm/index.mjs:1547,1716-1721).
      zIndex: -1001,
      selected: selectedGroupId === g.id,
      selectable: true,
      deletable: false,
      draggable: true,
      data: { groupId: g.id },
    }));
    return [...nodes, ...groupNodes];
  }, [nodes, groups, selectedGroupId]);

  const onConnectStart = useCallback(
    (_event: any, params: { nodeId: string | null; handleId: string | null }) => {
      if (!params.handleId || !params.nodeId) return;
      wireGesture.set({ active: true, source: { nodeId: params.nodeId, handleId: params.handleId }, planted: [], cursor: null });
      setWireActive(true);
    },
    [],
  );

  const onConnectEnd = useCallback(() => {
    // Safety net: if the gesture is still active (no completion happened via
    // onConnect or WireOverlay), clean up. This handles the case where the
    // user dragged from a handle and released on empty canvas.
    if (wireGesture.get().active) {
      wireGesture.reset();
      setWireActive(false);
    }
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const gesture = wireGesture.get();
      if (!gesture.active || !gesture.source) {
        // Fallback: no overlay gesture (e.g. overlay not mounted). Use old path.
        setEdges(addEdge(
          { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, type: 'straight', data: { waypoints: [] } },
          edges
        ) as Edge[]);
        return;
      }
      if (gesture.source.nodeId === connection.source && gesture.source.handleId === connection.sourceHandle) {
        const created = completeConnection(connection, getNode);
        if (created) setWireActive(false);
      }
    },
    [edges, setEdges, getNode],
  );

  const handleWireComplete = useCallback(() => setWireActive(false), []);
  const handleWireCancel = useCallback(() => setWireActive(false), []);

  const handleDragBegin = useCallback(() => {
    useDiagramStore.getState().beginCoalesce();
  }, []);

  const handleDragEnd = useCallback(() => {
    useDiagramStore.getState().endCoalesce();
  }, []);

  const groupIds = useMemo(() => new Set(groups.map((g) => g.id)), [groups]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const { nodeChanges, groupChanges } = partitionNodeChanges(changes, (id) => groupIds.has(id));
      if (nodeChanges.length > 0) {
        setNodes(applyNodeChanges(nodeChanges, nodes) as Node[]);
      }
      for (const gc of groupChanges) {
        if (gc.kind === 'move') moveGroupTo(gc.id, gc.x, gc.y);
        else if (gc.kind === 'resize') resizeGroup(gc.id, gc);
        else if (gc.kind === 'select') selectGroup(gc.selected ? gc.id : null);
      }
      // A drag ends with one final position change carrying dragging:false —
      // this fires even for aborted drags, so close the coalesce window here.
      const dragStopped = changes.some(
        (c) => c.type === 'position' && c.dragging === false,
      );
      if (dragStopped) useDiagramStore.getState().endCoalesce();
    },
    [nodes, setNodes, groupIds, moveGroupTo, resizeGroup, selectGroup]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges) as Edge[]);
    },
    [edges, setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const currentEdges = useDiagramStore.getState().edges;
      setEdges(reconnectEdge(oldEdge, newConnection, currentEdges) as Edge[]);
    },
    [setEdges],
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
      if (deletedNodes.length === 0) return;
      const store = useDiagramStore.getState();
      store.beginCoalesce();
      deletedNodes.forEach((node) => store.removeNode(node.id));
      store.endCoalesce();
    },
    []
  );

  return (
    <div className="flex-1 h-full" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onReconnect={onReconnect}
        onNodeClick={(_, node) => {
          if (node.type === GROUP_NODE_TYPE) return;
          selectBlock(node.id);
        }}
        onNodesDelete={onNodesDelete}
        onNodeDragStart={handleDragBegin}
        onNodeDragStop={handleDragEnd}
        onSelectionDragStart={handleDragBegin}
        onSelectionDragStop={handleDragEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        colorMode={theme}
        edgesFocusable
        edgesReconnectable
        nodesDraggable
        defaultEdgeOptions={{ type: 'straight' }}
        connectionLineComponent={ConnectionPreview}
        connectionLineStyle={{ stroke: theme === 'dark' ? '#94a3b8' : '#1e293b', strokeWidth: 1.5 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {wireActive && <WireOverlay onComplete={handleWireComplete} onCancel={handleWireCancel} />}
    </div>
  );
}