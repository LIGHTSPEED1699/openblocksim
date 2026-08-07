import { describe, it, expect } from 'vitest';
import type { SerializedGraph, SimResult, WorkerMessage, CompiledModel, SerializedBlock, SerializedEdge, SimConfig } from '../../src/engine/types';

describe('Engine types', () => {
  it('SerializedBlock shape is correct', () => {
    const block: SerializedBlock = {
      id: 'b1',
      type: 'Constant' as any,
      params: { value: 1 },
      position: { x: 0, y: 0 },
    };
    expect(block.id).toBe('b1');
    expect(block.type).toBe('Constant');
    expect(block.params.value).toBe(1);
    expect(block.position.x).toBe(0);
    expect(block.position.y).toBe(0);
  });

  it('SerializedEdge shape is correct', () => {
    const edge: SerializedEdge = {
      id: 'e1',
      source: 'b1',
      sourcePort: 0,
      target: 'b2',
      targetPort: 0,
    };
    expect(edge.id).toBe('e1');
    expect(edge.source).toBe('b1');
    expect(edge.sourcePort).toBe(0);
    expect(edge.target).toBe('b2');
    expect(edge.targetPort).toBe(0);
  });

  it('SerializedGraph shape is correct', () => {
    const graph: SerializedGraph = {
      blocks: [{ id: 'b1', type: 'Constant' as any, params: { value: 1 }, position: { x: 0, y: 0 } }],
      edges: [],
    };
    expect(graph.blocks).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it('SimConfig shape is correct', () => {
    const config: SimConfig = { dt: 0.01, duration: 10 };
    expect(config.dt).toBe(0.01);
    expect(config.duration).toBe(10);
  });

  it('SimResult shape is correct', () => {
    const result: SimResult = { time: [0, 0.01], traces: {}, scopes: { s1: [0, 1] } };
    expect(result.time).toHaveLength(2);
    expect(result.scopes.s1).toHaveLength(2);
  });

  it('CompiledModel shape is correct', () => {
    const model: CompiledModel = {
      stateSize: 2,
      f: (_t: number, state: number[]) => [state[0] * 2, state[1] * 3],
      outputMap: new Map([['b1', [0, 1]]]),
      scopeBlockIds: ['scope1'],
      workspaceBlockIds: ['ws1'],
      blockOrder: ['b1', 'b2'],
      getOutputs: (_t: number, _state: number[]) => new Map([['b1', [1.0]]]),
      absoluteBlockIds: new Set(['b1']),
      applyAbsoluteState: (_t: number, _state: number[]) => {},
    };
    expect(model.stateSize).toBe(2);
    expect(typeof model.f).toBe('function');
    expect(model.f(0, [1, 1])).toEqual([2, 3]);
    expect(model.outputMap.get('b1')).toEqual([0, 1]);
    expect(model.scopeBlockIds).toEqual(['scope1']);
    expect(model.workspaceBlockIds).toEqual(['ws1']);
    expect(model.blockOrder).toEqual(['b1', 'b2']);
    expect(model.absoluteBlockIds.has('b1')).toBe(true);
    expect(model.getOutputs(0, [1]).get('b1')).toEqual([1.0]);
  });

  it('WorkerMessage run type', () => {
    const msg: WorkerMessage = { type: 'run', graph: { blocks: [], edges: [] }, dt: 0.01, duration: 10 };
    expect(msg.type).toBe('run');
  });

  it('WorkerMessage cancel type', () => {
    const msg: WorkerMessage = { type: 'cancel' };
    expect(msg.type).toBe('cancel');
  });

  it('WorkerMessage progress type', () => {
    const msg: WorkerMessage = { type: 'progress', percent: 50 };
    expect(msg.type).toBe('progress');
    expect(msg.percent).toBe(50);
  });

  it('WorkerMessage done type', () => {
    const msg: WorkerMessage = { type: 'done', results: { time: [], traces: {}, scopes: {} } };
    expect(msg.type).toBe('done');
    expect(msg.results.time).toHaveLength(0);
  });

  it('WorkerMessage error type', () => {
    const msg: WorkerMessage = { type: 'error', message: 'overflow', blockId: 'b1', time: 3.5 };
    expect(msg.type).toBe('error');
    expect(msg.message).toBe('overflow');
    expect(msg.blockId).toBe('b1');
    expect(msg.time).toBe(3.5);
  });

  it('WorkerMessage error type without optional fields', () => {
    const msg: WorkerMessage = { type: 'error', message: 'unknown error' };
    expect(msg.type).toBe('error');
    expect(msg.message).toBe('unknown error');
  });
});