import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { ExportedModel } from './exportImport';

export const PERMALINK_HASH_PREFIX = '#m=';

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP: Record<string, number> = Object.fromEntries(
  [...B64_ALPHABET].map((ch, i) => [ch, i]),
);

function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 !== undefined ? b1 >> 4 : 0)];
    out += b1 !== undefined ? B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 !== undefined ? b2 >> 6 : 0)] : '=';
    out += b2 !== undefined ? B64_ALPHABET[b2 & 0x3f] : '=';
  }
  return out.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); // RFC 4648 URL-safe, unpadded
}

function fromBase64Url(text: string): Uint8Array {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(normalized)) {
    throw new Error('Invalid model link: payload is not valid base64url');
  }
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 4) {
    const chunk = normalized.slice(i, i + 4);
    const a = B64_LOOKUP[chunk[0]];
    const b = chunk[1] !== undefined ? B64_LOOKUP[chunk[1]] : 0;
    const c = chunk[2] !== undefined ? B64_LOOKUP[chunk[2]] : 0;
    const d = chunk[3] !== undefined ? B64_LOOKUP[chunk[3]] : 0;
    bytes.push((a << 2) | (b >> 4));
    if (chunk[2] !== undefined) bytes.push(((b & 0x0f) << 4) | (c >> 2));
    if (chunk[3] !== undefined) bytes.push(((c & 0x03) << 6) | d);
  }
  return new Uint8Array(bytes);
}

export function encodeModel(model: ExportedModel): string {
  const json = JSON.stringify(model);
  const compressed = deflateSync(strToU8(json), { level: 6 });
  return toBase64Url(compressed);
}

export function decodeModel(payload: string): ExportedModel {
  let json: string;
  try {
    const compressed = fromBase64Url(payload);
    json = strFromU8(inflateSync(compressed));
  } catch (err) {
    throw new Error(`Invalid model link: ${err instanceof Error ? err.message : String(err)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Invalid model link: not valid JSON (${err instanceof Error ? err.message : String(err)})`);
  }
  const model = parsed as ExportedModel;
  if (!Array.isArray(model.blocks) || !Array.isArray(model.edges) || !model.simConfig) {
    throw new Error('Invalid model link: missing blocks, edges, or simConfig');
  }
  return model;
}

export function parsePermalinkHash(hash: string): ExportedModel | null {
  if (!hash.startsWith(PERMALINK_HASH_PREFIX)) return null;
  return decodeModel(hash.slice(PERMALINK_HASH_PREFIX.length));
}
