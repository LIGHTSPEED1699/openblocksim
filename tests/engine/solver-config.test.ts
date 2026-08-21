import { describe, it, expect } from 'vitest';

describe('SimConfig extended types', () => {
  it('SimConfig accepts optional solverType, rtol, atol', () => {
    // This test verifies the type compiles and defaults are correct
    const config: import('../../src/engine/types').SimConfig = {
      dt: 0.01,
      duration: 10,
    };
    expect(config.solverType).toBeUndefined();
    expect(config.rtol).toBeUndefined();
    expect(config.atol).toBeUndefined();
  });

  it('SimConfig accepts solverType adaptive with tolerances', () => {
    const config: import('../../src/engine/types').SimConfig = {
      dt: 0.01,
      duration: 10,
      solverType: 'adaptive',
      rtol: 1e-4,
      atol: 1e-6,
    };
    expect(config.solverType).toBe('adaptive');
    expect(config.rtol).toBe(1e-4);
  });

  it('SimResult accepts optional actualSteps', () => {
    const result: import('../../src/engine/types').SimResult = {
      time: [0, 0.1, 0.2],
      traces: {},
      scopes: { scope1: [0, 1, 2] },
    };
    expect(result.actualSteps).toBeUndefined();
    const result2: import('../../src/engine/types').SimResult = {
      time: [0, 0.1],
      traces: {},
      scopes: { scope1: [0, 1] },
      actualSteps: 42,
    };
    expect(result2.actualSteps).toBe(42);
  });
});