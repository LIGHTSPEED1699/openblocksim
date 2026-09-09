import { describe, it, expect } from 'vitest';
import { resolvePortLabels } from '../../src/components/nodes/portLabels';

describe('resolvePortLabels', () => {
  it('defaults single input to u and single output to y', () => {
    expect(resolvePortLabels(1, 1)).toEqual({ inputs: ['u'], outputs: ['y'] });
  });

  it('defaults multiple inputs to in1..inN', () => {
    expect(resolvePortLabels(2, 1).inputs).toEqual(['in1', 'in2']);
  });

  it('defaults multiple outputs to y1..yN', () => {
    expect(resolvePortLabels(1, 3).outputs).toEqual(['y1', 'y2', 'y3']);
  });

  it('uses explicit portLabels (input overrides), falls back per index', () => {
    expect(resolvePortLabels(3, 1, ['e', 'PV']).inputs).toEqual(['e', 'PV', 'in3']);
  });

  it('returns empty arrays for port-less blocks (Comment: 0 in / 0 out)', () => {
    expect(resolvePortLabels(0, 0)).toEqual({ inputs: [], outputs: [] });
  });

  it('an empty explicit list behaves like none (falls back to defaults)', () => {
    expect(resolvePortLabels(1, 1, []).inputs).toEqual(['u']);
  });
});
