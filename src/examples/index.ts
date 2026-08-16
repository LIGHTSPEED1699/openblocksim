import type { ExportedModel } from '../utils/exportImport';
import { BlockType } from '../blocks/types';

export interface Example {
  id: string;
  name: string;
  description: string;
  model: ExportedModel;
}

/**
 * Prebuilt example models for the OpenBlockSim example gallery.
 *
 * Each model uses the same on-disk format produced by exportModel() and
 * consumed by importModel()/loadModel(). Loading an example replaces the
 * current diagram in the editor.
 *
 * Block IDs are kept short and readable (e.g. "step", "tf", "scope") so the
 * exported JSON can double as documentation.
 */

// ---- Example 1: First-Order Step Response -------------------------------
//  Step ──▶ 1/(s+1) ──▶ Scope
//  Classic first-order lag: output rises exponentially to the step value
//  with time constant τ = 1 s.
const firstOrderStep: ExportedModel = {
  blocks: [
    { id: 'step', type: BlockType.Step, params: { stepTime: 1, stepValue: 1 }, position: { x: 80, y: 220 } },
    { id: 'tf', type: BlockType.TransferFunction, params: { num: [1], den: [1, 1] }, position: { x: 320, y: 220 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 560, y: 220 } },
  ],
  edges: [
    { id: 'e1', source: 'step', sourcePort: 0, target: 'tf', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'tf', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
  ],
  simConfig: { dt: 0.01, duration: 10 },
};

// ---- Example 2: Second-Order Underdamped Step ---------------------------
//  Step ──▶ 1/(s^2 + 0.4s + 1) ──▶ Scope
//  Underdamped second-order system: decaying oscillatory step response
//  (damping ratio ζ ≈ 0.2, natural frequency ω_n = 1 rad/s).
const secondOrderStep: ExportedModel = {
  blocks: [
    { id: 'step', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 80, y: 220 } },
    { id: 'tf', type: BlockType.TransferFunction, params: { num: [1], den: [1, 0.4, 1] }, position: { x: 320, y: 220 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 560, y: 220 } },
  ],
  edges: [
    { id: 'e1', source: 'step', sourcePort: 0, target: 'tf', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'tf', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
  ],
  simConfig: { dt: 0.01, duration: 20 },
};

// ---- Example 3: PID Closed-Loop Control ---------------------------------
//  Step ──▶ Sum(+) ──▶ PID ──▶ 1/(s^2+s+1) ──▶ Scope
//           error  ▲        ▲
//                  │        └── PV ──┐  (ISA form: derivative acts on PV, not error)
//                  └──────── feedback ┘  (PV → Sum negative input)
//  Closed-loop PID tracking a unit step. The plant is an underdamped
//  second-order system; the controller damps the response. The plant's
//  output (PV) feeds BOTH the Sum's negative input (error) and the PID's
//  PV input (in-1) — the ISA standard form derives on PV to avoid
//  derivative kick on setpoint changes. Both feedback edges are broken at
//  the dynamic plant block (one-step delay), so no algebraic loop is
//  formed; both use the same previous-step PV, keeping them consistent.
const pidClosedLoop: ExportedModel = {
  blocks: [
    { id: 'setpoint', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 60, y: 240 } },
    { id: 'sum', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 240, y: 240 } },
    { id: 'pid', type: BlockType.PID, params: { Kp: 2, Ti: 1, Td: 0.3 }, position: { x: 400, y: 240 } },
    { id: 'plant', type: BlockType.TransferFunction, params: { num: [1], den: [1, 1, 1] }, position: { x: 580, y: 240 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 820, y: 240 } },
  ],
  edges: [
    { id: 'e1', source: 'setpoint', sourcePort: 0, target: 'sum', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'sum', sourcePort: 0, target: 'pid', targetPort: 0, waypoints: [] },
    { id: 'e3', source: 'pid', sourcePort: 0, target: 'plant', targetPort: 0, waypoints: [] },
    { id: 'e4', source: 'plant', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
    // Feedback: plant output → Sum negative input (PV for the error).
    // Routed down the RIGHT side of the plant so the wire visibly taps
    // G(s)'s output rather than crossing its input side.
    { id: 'e5', source: 'plant', sourcePort: 0, target: 'sum', targetPort: 1, waypoints: [{ x: 700, y: 380 }, { x: 240, y: 380 }] },
    // PID PV input: plant output → PID in-1. ISA form derives on PV.
    { id: 'e6', source: 'plant', sourcePort: 0, target: 'pid', targetPort: 1, waypoints: [{ x: 700, y: 320 }, { x: 380, y: 320 }, { x: 380, y: 268 }] },
  ],
  simConfig: { dt: 0.01, duration: 15 },
};

// ---- Example 4: Sine Wave Through Saturation ----------------------------
//  Sine ──▶ Saturation(±1) ──▶ Scope
//  A 0.5 Hz sine of amplitude 2 clipped to ±1 by a saturation block,
//  turning a smooth sinusoid into a clipped waveform.
const sineSaturation: ExportedModel = {
  blocks: [
    { id: 'sine', type: BlockType.Sine, params: { amplitude: 2, frequency: 0.5, phase: 0 }, position: { x: 80, y: 220 } },
    { id: 'sat', type: BlockType.Saturation, params: { lowerLimit: -1, upperLimit: 1 }, position: { x: 320, y: 220 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 560, y: 220 } },
  ],
  edges: [
    { id: 'e1', source: 'sine', sourcePort: 0, target: 'sat', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'sat', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
  ],
  simConfig: { dt: 0.01, duration: 10 },
};

// ---- Example 5: Relay Bang-Bang Control ---------------------------------
//  Step ──▶ Sum(+) ──▶ Relay ──▶ 1/(s+0.5) ──▶ Scope
//                  ▲                          │
//                  └──────────────────────────┘ (feedback: plant → Sum in-1)
//  On/off (bang-bang) control with hysteresis. The relay switches the plant
//  input between +1 and −1, producing a limit cycle around the setpoint.
const relayBangBang: ExportedModel = {
  blocks: [
    { id: 'setpoint', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 60, y: 240 } },
    { id: 'sum', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 240, y: 240 } },
    { id: 'relay', type: BlockType.Relay, params: { onValue: 1, offValue: -1, switchOn: 0.1, switchOff: -0.1 }, position: { x: 400, y: 240 } },
    { id: 'plant', type: BlockType.TransferFunction, params: { num: [1], den: [1, 0.5] }, position: { x: 580, y: 240 } },
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 820, y: 240 } },
  ],
  edges: [
    { id: 'e1', source: 'setpoint', sourcePort: 0, target: 'sum', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'sum', sourcePort: 0, target: 'relay', targetPort: 0, waypoints: [] },
    { id: 'e3', source: 'relay', sourcePort: 0, target: 'plant', targetPort: 0, waypoints: [] },
    { id: 'e4', source: 'plant', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
    { id: 'e5', source: 'plant', sourcePort: 0, target: 'sum', targetPort: 1, waypoints: [{ x: 700, y: 340 }, { x: 240, y: 340 }] },
  ],
  simConfig: { dt: 0.01, duration: 20 },
};

export const EXAMPLES: Example[] = [
  { id: 'first-order-step', name: 'First-Order Step Response', description: 'Exponential rise of a 1/(s+1) lag to a unit step.', model: firstOrderStep },
  { id: 'second-order-step', name: 'Second-Order Underdamped Step', description: 'Decaying oscillatory response of 1/(s^2 + 0.4s + 1).', model: secondOrderStep },
  { id: 'pid-closed-loop', name: 'PID Closed-Loop Control', description: 'PID controller tracking a unit step on an underdamped plant.', model: pidClosedLoop },
  { id: 'sine-saturation', name: 'Sine Through Saturation', description: 'A clipped sinusoid showing the saturation nonlinearity.', model: sineSaturation },
  { id: 'relay-bang-bang', name: 'Relay Bang-Bang Control', description: 'On/off control with hysteresis producing a limit cycle.', model: relayBangBang },
];