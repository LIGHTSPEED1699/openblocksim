import { BlockType, BlockCategory } from '../types';
import type { BlockFactory } from '../types';

// mulberry32 PRNG for reproducible sequences
function mulberry32(seed: number): () => number {
  return function () {
    let z = (seed += 0x6D2B79F5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for Gaussian random
function gaussianRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
}

export const RandomNumber = {
  category: BlockCategory.Source,
  create: () => ({
    type: BlockType.RandomNumber,
    category: BlockCategory.Source,
    inputs: 0, outputs: 1, isDynamic: false, stateSize: 0,
    stateUpdateMode: 'absolute' as const,
    parameters: {
      mean: { type: 'number', default: 0, label: 'Mean' },
      stdDev: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Standard Deviation' },
      seed: { type: 'number', default: 0, label: 'Seed (0=random)' },
    },
    compute: (_dt, _inputs, _state, params) => {
      const mean = params.mean as number;
      const stdDev = params.stdDev as number;
      const seed = params.seed as number;
      // ponytail: new PRNG per compute call — fine for small step counts,
      // perf issue at 100k steps. Upgrade to persistent RNG in block state
      // if simulation shows visible correlation.
      const rng = mulberry32(seed === 0 ? Date.now() % 2147483647 : seed);
      return [[mean + stdDev * gaussianRandom(rng)], []];
    },
  }),
} satisfies BlockFactory;