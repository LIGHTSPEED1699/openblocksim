import { BlockType, type Params } from '../blocks/types';
import type { ExportedModel } from './exportImport';
import { unzipSync, strFromU8 } from 'fflate';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImportSummary {
  supportedBlocks: number;
  unsupportedBlocks: number;
  unsupportedTypes: string[];
  totalLines: number;
  warnings: string[];
}

export interface ImportResult {
  model: ExportedModel;
  summary: ImportSummary;
}

interface ParsedBlock {
  simType: string;
  name: string;
  sid?: string;
  position: { x: number; y: number };
  params: Record<string, string>;
}

interface ParsedLine {
  srcSid?: string;
  srcPort: number;
  dstSid?: string;
  dstPort: number;
  srcBlock?: string;
  dstBlock?: string;
}

interface ParsedModel {
  blocks: ParsedBlock[];
  lines: ParsedLine[];
}

// ─── Block type mapping ───────────────────────────────────────────────────────

const BLOCK_TYPE_MAP: Record<string, BlockType> = {
  Constant: BlockType.Constant,
  Step: BlockType.Step,
  Ramp: BlockType.Ramp,
  SineWave: BlockType.Sine,
  PulseGenerator: BlockType.PulseGenerator,
  Gain: BlockType.Gain,
  Sum: BlockType.Sum,
  Product: BlockType.Product,
  Integrator: BlockType.Integrator,
  Derivative: BlockType.Derivative,
  TransferFcn: BlockType.TransferFunction,
  StateSpace: BlockType.StateSpace,
  TransportDelay: BlockType.TransportDelay,
  Saturation: BlockType.Saturation,
  DeadZone: BlockType.Deadzone,
  Relay: BlockType.Relay,
  PIDController: BlockType.PID,
  Scope: BlockType.Scope,
  ToWorkspace: BlockType.ToWorkspace,
  Clock: BlockType.Clock,
  Abs: BlockType.Abs,
  Sign: BlockType.Sign,
  Bias: BlockType.Bias,
  UnaryMinus: BlockType.UnaryMinus,
  Divide: BlockType.Divide,
  MinMax: BlockType.MinMax,
  Quantizer: BlockType.Quantizer,
  RateLimiter: BlockType.RateLimiter,
  Backlash: BlockType.Backlash,
  Rounding: BlockType.RoundingFunction,
  UnitDelay: BlockType.UnitDelay,
  DiscreteIntegrator: BlockType.DiscreteIntegrator,
  DiscreteTransferFcn: BlockType.DiscreteTransferFcn,
  Memory: BlockType.Memory,
  Switch: BlockType.Switch,
};

export function mapBlockType(simType: string): BlockType {
  return BLOCK_TYPE_MAP[simType] ?? BlockType.Comment;
}

// ─── Parameter mapping ────────────────────────────────────────────────────────

function parseNumArray(str: string): number[] {
  return str.replace(/[\[\]]/g, '').split(/[\s,]+/).filter(s => s.length > 0).map(Number);
}

export function mapParams(simType: string, raw: Record<string, string>): Params {
  const p: Params = {};
  switch (simType) {
    case 'Constant':
      p.value = parseFloat(raw.value ?? raw.Value ?? '1');
      break;
    case 'Step':
      p.stepTime = parseFloat(raw.time ?? raw.Time ?? '1');
      p.stepValue = parseFloat(raw.amplitude ?? raw.After ?? raw.InitialOutput ?? '1');
      break;
    case 'Ramp':
      p.slope = parseFloat(raw.slope ?? '1');
      p.startTime = parseFloat(raw.startTime ?? '0');
      break;
    case 'SineWave':
      p.amplitude = parseFloat(raw.amplitude ?? '1');
      const freqRad = parseFloat(raw.frequency ?? '1');
      p.frequency = freqRad / (2 * Math.PI);  // rad/s → Hz
      p.phase = parseFloat(raw.phase ?? '0');
      p.bias = parseFloat(raw.bias ?? '0');
      break;
    case 'PulseGenerator':
      p.amplitude = parseFloat(raw.amplitude ?? '1');
      p.period = parseFloat(raw.period ?? '1');
      p.dutyCycle = parseFloat(raw.dutyCycle ?? '50');
      p.phaseDelay = parseFloat(raw.phaseDelay ?? '0');
      break;
    case 'Gain':
      p.gain = parseFloat(raw.gain ?? '1');
      break;
    case 'Sum':
      // Simulink uses string like "++" or "+-" or "|+-"
      const signsStr = (raw.inputs ?? raw.Inputs ?? '++').replace(/[|]/g, '');
      p.signs = signsStr.split('').map(c => c === '-' ? -1 : 1);
      p.inputCount = signsStr.length;
      break;
    case 'Product':
      // Simulink uses string like "**" or "*/"
      const prodStr = (raw.inputs ?? raw.Inputs ?? '**').replace(/[|]/g, '');
      p.operators = prodStr;
      p.inputCount = prodStr.length;
      break;
    case 'Integrator':
      p.initialValue = parseFloat(raw.initialCondition ?? raw.InitialCondition ?? '0');
      break;
    case 'Derivative':
      p.initialValue = parseFloat(raw.initialCondition ?? '0');
      break;
    case 'TransferFcn':
      p.num = parseNumArray(raw.numerator ?? '[1]');
      p.den = parseNumArray(raw.denominator ?? '[1 1]');
      break;
    case 'StateSpace':
      p.A = parseNumArray(raw.A ?? '[0 1; -1 -2]');
      p.B = parseNumArray(raw.B ?? '[0 1]');
      p.C = parseNumArray(raw.C ?? '[1 0]');
      p.D = parseNumArray(raw.D ?? '[0]');
      break;
    case 'TransportDelay':
      p.delayTime = parseFloat(raw.delayTime ?? '1');
      break;
    case 'Saturation':
      p.upperLimit = parseFloat(raw.upper ?? '1');
      p.lowerLimit = parseFloat(raw.lower ?? '-1');
      break;
    case 'DeadZone':
      p.start = parseFloat(raw.start ?? '-0.5');
      p.end = parseFloat(raw.end ?? '0.5');
      break;
    case 'Relay':
      p.onValue = parseFloat(raw.onValue ?? '1');
      p.offValue = parseFloat(raw.offValue ?? '-1');
      p.switchOn = parseFloat(raw.switchOn ?? '0.5');
      p.switchOff = parseFloat(raw.switchOff ?? '-0.5');
      break;
    case 'PIDController':
      p.Kp = parseFloat(raw.Kp ?? raw.P ?? '1');
      p.Ti = parseFloat(raw.Ti ?? raw.I ?? '0');
      p.Td = parseFloat(raw.Td ?? raw.D ?? '0');
      break;
    case 'Clock':
      break;  // no params
    case 'Quantizer':
      p.quantum = parseFloat(raw.quantization ?? '0.5');
      break;
    case 'RateLimiter':
      p.risingSlew = parseFloat(raw.risingSlew ?? '1');
      p.fallingSlew = parseFloat(raw.fallingSlew ?? '-1');
      break;
    case 'Backlash':
      p.deadbandWidth = parseFloat(raw.deadbandWidth ?? '1');
      break;
    case 'UnitDelay':
      p.initialValue = parseFloat(raw.initialCondition ?? '0');
      break;
    case 'DiscreteIntegrator':
      p.initialValue = parseFloat(raw.initialCondition ?? '0');
      p.method = 'forward-euler';
      break;
    case 'DiscreteTransferFcn':
      p.num = parseNumArray(raw.numerator ?? '[1]');
      p.den = parseNumArray(raw.denominator ?? '[1 -0.5]');
      break;
    case 'Memory':
      p.initialValue = parseFloat(raw.initialCondition ?? '0');
      break;
    case 'Switch':
      p.threshold = parseFloat(raw.threshold ?? '0');
      break;
    default:
      // Unsupported block — store type name as comment text
      p.text = `[Unsupported: ${simType}]`;
      break;
  }
  return p;
}

// ─── MDL parser (text format) ─────────────────────────────────────────────────

export function parseMDL(text: string): ParsedModel {
  const blocks: ParsedBlock[] = [];
  const lines: ParsedLine[] = [];

  // Simple line-by-line parser for MDL format
  // MDL uses nested { } blocks with key-value pairs
  const linesArr = text.split('\n');
  let i = 0;

  while (i < linesArr.length) {
    const line = linesArr[i].trim();

    // Find Block blocks
    if (line.startsWith('Block {') || line === 'Block {') {
      const block = parseMDLBlock(linesArr, i);
      if (block) {
        blocks.push(block.parsed);
        i = block.nextIndex;
        continue;
      }
    }

    // Find Line blocks
    if (line.startsWith('Line {') || line === 'Line {') {
      const lineData = parseMDLLine(linesArr, i);
      if (lineData) {
        lines.push(lineData.parsed);
        i = lineData.nextIndex;
        continue;
      }
    }

    i++;
  }

  return { blocks, lines };
}

function parseMDLBlock(lines: string[], start: number): { parsed: ParsedBlock; nextIndex: number } | null {
  let depth = 1;
  let i = start + 1;
  const block: ParsedBlock = {
    simType: '',
    name: '',
    position: { x: 0, y: 0 },
    params: {},
  };

  while (i < lines.length && depth > 0) {
    const line = lines[i].trim();
    if (line.includes('{')) depth++;
    if (line.includes('}')) depth--;
    if (depth === 0) break;

    // BlockType
    if (line.startsWith('BlockType ')) {
      block.simType = line.replace('BlockType ', '').replace(/["]/g, '').trim();
    }
    // Name
    if (line.startsWith('Name ')) {
      block.name = line.replace('Name ', '').replace(/["]/g, '').trim();
    }
    // Position [x, y, w, h]
    if (line.startsWith('Position ')) {
      const posStr = line.replace('Position ', '').replace(/[\[\]]/g, '').trim();
      const posParts = posStr.split(/[\s,]+/).map(Number);
      if (posParts.length >= 2) {
        block.position = { x: posParts[0], y: posParts[1] };
      }
    }
    // Other parameters (key value)
    const match = line.match(/^(\w+)\s+(.+)$/);
    if (match && !match[1].startsWith('BlockType') && !match[1].startsWith('Name') && !match[1].startsWith('Position')) {
      const key = match[1];
      const val = match[2].replace(/["]/g, '').trim();
      // Skip structural keywords
      if (!['Block', 'Line', 'System', 'Model', 'Branch'].includes(key)) {
        block.params[key] = val;
      }
    }

    i++;
  }

  if (!block.simType) return null;
  return { parsed: block, nextIndex: i + 1 };
}

function parseMDLLine(lines: string[], start: number): { parsed: ParsedLine; nextIndex: number } | null {
  let depth = 1;
  let i = start + 1;
  const line: ParsedLine = { srcPort: 0, dstPort: 0 };

  while (i < lines.length && depth > 0) {
    const l = lines[i].trim();
    if (l.includes('{')) depth++;
    if (l.includes('}')) depth--;
    if (depth === 0) break;

    if (l.startsWith('SrcBlock ')) line.srcBlock = l.replace('SrcBlock ', '').replace(/["]/g, '').trim();
    if (l.startsWith('DstBlock ')) line.dstBlock = l.replace('DstBlock ', '').replace(/["]/g, '').trim();
    if (l.startsWith('SrcPort ')) line.srcPort = parseInt(l.replace('SrcPort ', '').trim(), 10) - 1; // 1-based → 0-based
    if (l.startsWith('DstPort ')) line.dstPort = parseInt(l.replace('DstPort ', '').trim(), 10) - 1;

    i++;
  }

  return { parsed: line, nextIndex: i + 1 };
}

// ─── SLX XML parser ───────────────────────────────────────────────────────────

export function parseSLXXml(xml: string): ParsedModel {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const system = doc.querySelector('System') ?? doc.documentElement;

  const blocks: ParsedBlock[] = [];
  const lines: ParsedLine[] = [];

  // Parse blocks
  const blockElements = system.querySelectorAll(':scope > Block');
  blockElements.forEach((el) => {
    const simType = el.getAttribute('BlockType') ?? '';
    const name = el.getAttribute('Name') ?? '';
    const sid = el.getAttribute('SID') ?? '';
    const params: Record<string, string> = {};
    let position = { x: 0, y: 0 };

    el.querySelectorAll(':scope > P').forEach((p) => {
      const pName = p.getAttribute('Name') ?? '';
      const pText = p.textContent ?? '';
      if (pName === 'Position') {
        const posStr = pText.replace(/[\[\]]/g, '').trim();
        const posParts = posStr.split(/[\s,]+/).map(Number);
        if (posParts.length >= 2) {
          position = { x: posParts[0], y: posParts[1] };
        }
      } else {
        params[pName] = pText;
      }
    });

    blocks.push({ simType, name, sid, position, params });
  });

  // Parse lines
  const lineElements = system.querySelectorAll(':scope > Line');
  lineElements.forEach((el) => {
    let srcSid: string | undefined;
    let dstSid: string | undefined;
    let srcPort = 0;
    let dstPort = 0;

    el.querySelectorAll(':scope > P').forEach((p) => {
      const pName = p.getAttribute('Name') ?? '';
      const pText = p.textContent ?? '';
      if (pName === 'Src') {
        // Format: "SID#out:port"
        const m = pText.match(/^(\d+)#out:(\d+)/);
        if (m) { srcSid = m[1]; srcPort = parseInt(m[2], 10) - 1; }
      } else if (pName === 'Dst') {
        const m = pText.match(/^(\d+)#in:(\d+)/);
        if (m) { dstSid = m[1]; dstPort = parseInt(m[2], 10) - 1; }
      }
    });

    lines.push({ srcSid, srcPort, dstSid, dstPort });
  });

  return { blocks, lines };
}

// ─── SLX binary parser (ZIP → XML → blocks + lines) ──────────────────────────

export function parseSLXBuffer(buffer: ArrayBuffer): ParsedModel {
  const files = unzipSync(new Uint8Array(buffer));
  // Newer SLX: blocks in simulink/systems/system_root.xml
  // Older SLX: blocks in simulink/blockdiagram.xml
  let xml = '';
  const systemKey = Object.keys(files).find(k => k.includes('systems/system_root.xml'));
  if (systemKey) {
    xml = strFromU8(files[systemKey]);
  } else {
    const bdKey = Object.keys(files).find(k => k.includes('blockdiagram.xml'));
    if (bdKey) xml = strFromU8(files[bdKey]);
  }
  if (!xml) throw new Error('No blockdiagram.xml or system_root.xml found in .slx file');
  return parseSLXXml(xml);
}

// ─── Full import pipeline ─────────────────────────────────────────────────────

export function importSimulinkModel(input: string | ArrayBuffer, format: 'slx' | 'mdl'): ImportResult {
  const parsed = format === 'mdl' ? parseMDL(input as string) : parseSLXBuffer(input as ArrayBuffer);

  const warnings: string[] = [];
  const unsupportedTypes = new Set<string>();
  let supportedCount = 0;
  let unsupportedCount = 0;

  // Map blocks
  const sidToBlockId = new Map<string, string>();
  const nameToBlockId = new Map<string, string>();
  const modelBlocks: ExportedModel['blocks'] = [];

  parsed.blocks.forEach((b, idx) => {
    const blockId = `${b.name || `block-${idx}`}-${Date.now()}-${idx}`;
    if (b.sid) sidToBlockId.set(b.sid, blockId);
    nameToBlockId.set(b.name, blockId);

    const obsType = mapBlockType(b.simType);
    const params = mapParams(b.simType, b.params);

    if (obsType === BlockType.Comment && b.simType !== 'Comment' && !BLOCK_TYPE_MAP[b.simType]) {
      unsupportedCount++;
      unsupportedTypes.add(b.simType);
      warnings.push(`Block "${b.name}" (type: ${b.simType}) is not supported, imported as placeholder.`);
    } else {
      supportedCount++;
    }

    modelBlocks.push({
      id: blockId,
      type: obsType,
      params,
      position: b.position,
    });
  });

  // Map lines/connections
  const modelEdges: ExportedModel['edges'] = [];
  parsed.lines.forEach((line, idx) => {
    // SLX uses SID, MDL uses block names
    let sourceId: string | undefined;
    let targetId: string | undefined;

    if (line.srcSid && sidToBlockId.has(line.srcSid)) {
      sourceId = sidToBlockId.get(line.srcSid);
    } else if (line.srcBlock && nameToBlockId.has(line.srcBlock)) {
      sourceId = nameToBlockId.get(line.srcBlock);
    }

    if (line.dstSid && sidToBlockId.has(line.dstSid)) {
      targetId = sidToBlockId.get(line.dstSid);
    } else if (line.dstBlock && nameToBlockId.has(line.dstBlock)) {
      targetId = nameToBlockId.get(line.dstBlock);
    }

    if (sourceId && targetId) {
      modelEdges.push({
        id: `e-${idx}`,
        source: sourceId,
        sourcePort: line.srcPort,
        target: targetId,
        targetPort: line.dstPort,
      });
    } else {
      warnings.push(`Connection from ${line.srcBlock ?? line.srcSid} to ${line.dstBlock ?? line.dstSid} could not be resolved.`);
    }
  });

  const model: ExportedModel = {
    blocks: modelBlocks,
    edges: modelEdges,
    simConfig: { dt: 0.01, duration: 10 },
  };

  return {
    model,
    summary: {
      supportedBlocks: supportedCount,
      unsupportedBlocks: unsupportedCount,
      unsupportedTypes: [...unsupportedTypes],
      totalLines: parsed.lines.length,
      warnings,
    },
  };
}