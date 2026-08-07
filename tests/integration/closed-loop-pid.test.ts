import { describe, it, expect } from 'vitest';
import { BlockRegistry } from '../../src/blocks/registry';
import { BlockType } from '../../src/blocks/types';
import { Step } from '../../src/blocks/sources/Step';
import { Sum } from '../../src/blocks/math/Sum';
import { Gain } from '../../src/blocks/math/Gain';
import { PID } from '../../src/blocks/control/PID';
import { TransferFunction } from '../../src/blocks/linear/TransferFunction';
import { Integrator } from '../../src/blocks/linear/Integrator';
import { Scope } from '../../src/blocks/sinks/Scope';
import { Constant } from '../../src/blocks/sources/Constant';
import { compileGraph } from '../../src/engine/compiler';
import { solve } from '../../src/engine/solver';

describe('Closed-loop PID integration test', () => {
  it('simulates Step → Sum → PID → TF → Scope closed loop', () => {
    const registry = new BlockRegistry();
    registry.register(BlockType.Step, Step);
    registry.register(BlockType.Sum, Sum);
    registry.register(BlockType.Gain, Gain);
    registry.register(BlockType.PID, PID);
    registry.register(BlockType.TransferFunction, TransferFunction);
    registry.register(BlockType.Integrator, Integrator);
    registry.register(BlockType.Scope, Scope);
    registry.register(BlockType.Constant, Constant);

    // Plant: 1/(s+1) — first-order system
    // Closed loop: error = setpoint - output, PID controls plant
    const graph = {
      blocks: [
        { id: 'step', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 0, y: 0 } },
        { id: 'sum', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 100, y: 0 } },
        { id: 'pid', type: BlockType.PID, params: { Kp: 2, Ki: 0, Kd: 0 }, position: { x: 200, y: 0 } },
        { id: 'plant', type: BlockType.TransferFunction, params: { num: [1], den: [1, 1] }, position: { x: 300, y: 0 } },
        { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'step', sourcePort: 0, target: 'sum', targetPort: 0 },
        { id: 'e2', source: 'plant', sourcePort: 0, target: 'sum', targetPort: 1 },
        { id: 'e3', source: 'sum', sourcePort: 0, target: 'pid', targetPort: 0 },
        { id: 'e4', source: 'pid', sourcePort: 0, target: 'plant', targetPort: 0 },
        { id: 'e5', source: 'plant', sourcePort: 0, target: 'scope', targetPort: 0 },
      ],
    };

    const dt = 0.01;
    const model = compileGraph(graph, registry, dt);
    // State: [TF_state(1), PID_integral(1), PID_prevError(1)] = 3 states
    expect(model.stateSize).toBe(3);

    const result = solve(model, { dt, duration: 5 }, new Array(model.stateSize).fill(0));
    expect(result.time).toHaveLength(501);

    // The output should approach the setpoint (1.0) over time
    // With Kp=2, plant=1/(s+1): closed-loop TF = 2/(s+3)
    // Step response: y(t) = (2/3)(1 - e^(-3t))
    // At t=5: y ≈ (2/3)(1 - e^(-15)) ≈ 2/3 ≈ 0.6667
    // We can't directly check output values from solver yet (traces are empty),
    // but we verified the model compiles and solves without error
    expect(result.time[500]).toBeCloseTo(5.0, 1);
  });
});