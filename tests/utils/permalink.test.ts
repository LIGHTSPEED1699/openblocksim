import { describe, it, expect, vi } from 'vitest';
import { encodeModel, decodeModel, parsePermalinkHash, buildShareUrl, copyText } from '../../src/utils/permalink';
import type { ExportedModel } from '../../src/utils/exportImport';

// A realistic model incl. Unicode comment text, arrays, and waypoints —
// exercises UTF-8 handling that plain btoa(JSON) would corrupt.
const MODEL: ExportedModel = {
  blocks: [
    { id: 'step', type: 'Step', params: { stepTime: 1, stepValue: 2 }, position: { x: 80, y: 220 } },
    { id: 'tf', type: 'TransferFunction', params: { num: [1], den: [1, 1] }, position: { x: 320, y: 220 } },
    { id: 'note', type: 'Comment', params: { text: '单位阶跃 → 1/(s+1) ✓' }, position: { x: 40, y: 40 } },
  ],
  edges: [
    { id: 'e1', source: 'step', sourcePort: 0, target: 'tf', targetPort: 0, waypoints: [{ x: 300, y: 180 }, { x: 320, y: 180 }] },
  ],
  simConfig: { dt: 0.01, duration: 10 },
};

describe('permalink codec', () => {
  it('round-trips a model through encodeModel/decodeModel exactly', () => {
    const payload = encodeModel(MODEL);
    expect(decodeModel(payload)).toEqual(MODEL);
  });

  it('produces a compact, URL-safe payload (no +, /, = ; only [A-Za-z0-9_-])', () => {
    const payload = encodeModel(MODEL);
    expect(payload.length).toBeLessThan(JSON.stringify(MODEL).length); // compressed
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('round-trips an empty model (no blocks)', () => {
    const empty: ExportedModel = { blocks: [], edges: [], simConfig: { dt: 0.01, duration: 1 } };
    expect(decodeModel(encodeModel(empty))).toEqual(empty);
  });

  it('throws a descriptive error on a corrupt payload', () => {
    expect(() => decodeModel('!!!not-base64!!!')).toThrow(/Invalid model link/);
    expect(() => decodeModel('')).toThrow(/Invalid model link/);
  });
});

describe('parsePermalinkHash', () => {
  it('returns null for an empty or unrelated hash', () => {
    expect(parsePermalinkHash('')).toBeNull();
    expect(parsePermalinkHash('#some-other-tool-state')).toBeNull();
  });

  it('decodes a prefixed payload', () => {
    const hash = `#m=${encodeModel(MODEL)}`;
    expect(parsePermalinkHash(hash)).toEqual(MODEL);
  });

  it('throws on a prefixed but corrupt payload', () => {
    expect(() => parsePermalinkHash('#m=corrupt!!')).toThrow(/Invalid model link/);
  });
});

describe('buildShareUrl + copyText', () => {
  it('builds a share URL ending in #m=<payload> on the current origin/path', () => {
    const url = buildShareUrl(MODEL);
    expect(url.startsWith(location.origin)).toBe(true);
    expect(url.endsWith(`#m=${encodeModel(MODEL)}`)).toBe(true);
  });

  it('copyText delegates to navigator.clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    try {
      await copyText('hello');
      expect(writeText).toHaveBeenCalledWith('hello');
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
    }
  });

  it('copyText throws when clipboard is unavailable', async () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    try {
      await expect(copyText('hello')).rejects.toThrow('Clipboard unavailable');
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
    }
  });
});
