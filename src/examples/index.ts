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

// ---- Example 6: Three-Element Drum Level Control -----------------------
//  Architecture (Bequette Module 9):
//
//    Step(SP) → Sum(+) → PID(LC) ──────────→ Sum(+) → Sum(+) → PID(FC) → TF(valve) → Sum(+) → TF(plant) → Scope
//                 ↑         ↑                  ↑                        ↑             ↑
//                 │         │                  │                        │             │
//                 │         │                  │                        │             │
//    Step(D) → TF(steam) → Gain(Kff) ──────────┘                        │             │
//                                                                        │             │
//                 └── [level feedback] ──────────────────────────────────────────────┘
//                                        [flow feedback] ────────────┘
//
//  Three-element drum level control: (1) drum level, (2) steam flow feedforward,
//  (3) feedwater flow feedback. The plant has an inverse response (RHP zero)
//  typical of boiler drum level — “swell and shrink” dynamics.
//
//  Plant: Gp(s) = Kp*(1 - β*s) / [s*(τp*s + 1)]  with Kp=0.25, β=1, τp=2
//  Valve+Flow: 1/[(τv*s+1)(τF*s+1)]  with τv=0.15, τF=0.5
//  Steam meas: 1/(τs*s+1)  with τs=0.5
//
//  Time unit = minutes (dimensionless deviation variables from nominal).
const drumLevelThreeElement: ExportedModel = {
  blocks: [
    // Level setpoint
    { id: 'sp', type: BlockType.Step, params: { stepTime: 0, stepValue: 0.1 }, position: { x: 60, y: 160 } },
    // Steam demand disturbance
    { id: 'd', type: BlockType.Step, params: { stepTime: 5, stepValue: 0.5 }, position: { x: 60, y: 340 } },
    // Level error: SP - L
    { id: 'se', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 200, y: 160 } },
    // Level controller (PI, ISA form: Kp=1, Ti=5, Td=0)
    { id: 'lc', type: BlockType.PID, params: { Kp: 1, Ti: 5, Td: 0 }, position: { x: 340, y: 160 } },
    // 3-element summation: LC output + Kff * measured steam flow
    { id: 'sf', type: BlockType.Sum, params: { signs: [1, 1] }, position: { x: 480, y: 160 } },
    // Steam flow measurement dynamics
    { id: 'tfs', type: BlockType.TransferFunction, params: { num: [1], den: [0.5, 1] }, position: { x: 200, y: 340 } },
    // Feedforward gain
    { id: 'kff', type: BlockType.Gain, params: { gain: 1.0 }, position: { x: 340, y: 340 } },
    // Flow error: flow setpoint - measured feedwater flow
    { id: 'sfw', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 600, y: 160 } },
    // Flow controller (PI, ISA form: Kp=2, Ti=0.4, Td=0)
    { id: 'fc', type: BlockType.PID, params: { Kp: 2, Ti: 0.4, Td: 0 }, position: { x: 740, y: 160 } },
    // Valve + feedwater flow measurement dynamics (combined)
    { id: 'tv', type: BlockType.TransferFunction, params: { num: [1], den: [0.075, 0.65, 1] }, position: { x: 880, y: 160 } },
    // Mass balance: feedwater flow - steam demand
    { id: 'sm', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 1020, y: 160 } },
    // Drum level process: Gp(s) = 0.25*(1-s) / [s*(2s+1)] = (0.25-0.25s) / (2s²+s)
    { id: 'tp', type: BlockType.TransferFunction, params: { num: [0.25, -0.25], den: [2, 1, 0] }, position: { x: 1160, y: 160 } },
    // Output scope
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 1300, y: 160 } },
  ],
  edges: [
    // Forward path: SP → error → LC → 3-element sum → flow error → FC → valve → mass balance → plant → scope
    { id: 'e1', source: 'sp', sourcePort: 0, target: 'se', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'se', sourcePort: 0, target: 'lc', targetPort: 0, waypoints: [] },
    { id: 'e3', source: 'lc', sourcePort: 0, target: 'sf', targetPort: 0, waypoints: [] },
    { id: 'e4', source: 'sf', sourcePort: 0, target: 'sfw', targetPort: 0, waypoints: [] },
    { id: 'e5', source: 'sfw', sourcePort: 0, target: 'fc', targetPort: 0, waypoints: [] },
    { id: 'e6', source: 'fc', sourcePort: 0, target: 'tv', targetPort: 0, waypoints: [] },
    { id: 'e7', source: 'tv', sourcePort: 0, target: 'sm', targetPort: 0, waypoints: [] },
    { id: 'e8', source: 'sm', sourcePort: 0, target: 'tp', targetPort: 0, waypoints: [] },
    { id: 'e9', source: 'tp', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
    // Feedforward: D → steam meas → Kff → 3-element sum
    { id: 'e10', source: 'd', sourcePort: 0, target: 'tfs', targetPort: 0, waypoints: [] },
    { id: 'e11', source: 'tfs', sourcePort: 0, target: 'kff', targetPort: 0, waypoints: [] },
    { id: 'e12', source: 'kff', sourcePort: 0, target: 'sf', targetPort: 1, waypoints: [{ x: 460, y: 380 }, { x: 460, y: 200 }] },
    // Disturbance also enters mass balance directly
    { id: 'e13', source: 'd', sourcePort: 0, target: 'sm', targetPort: 1, waypoints: [{ x: 120, y: 420 }, { x: 1020, y: 420 }] },
    // Feedback: plant output → level error (negative input)
    { id: 'e14', source: 'tp', sourcePort: 0, target: 'se', targetPort: 1, waypoints: [{ x: 1300, y: 280 }, { x: 1300, y: 460 }, { x: 200, y: 460 }, { x: 200, y: 200 }] },
    // Feedback: plant output → level PID PV input (ISA derivative on PV)
    { id: 'e15', source: 'tp', sourcePort: 0, target: 'lc', targetPort: 1, waypoints: [{ x: 1300, y: 260 }, { x: 1300, y: 480 }, { x: 340, y: 480 }, { x: 340, y: 200 }] },
    // Feedback: valve/flow output → flow error (negative input)
    { id: 'e16', source: 'tv', sourcePort: 0, target: 'sfw', targetPort: 1, waypoints: [{ x: 940, y: 280 }, { x: 940, y: 360 }, { x: 600, y: 360 }, { x: 600, y: 200 }] },
  ],
  simConfig: { dt: 0.02, duration: 30 },
};

// ---- Example 7: Model Reference Adaptive Control (MRAC) -----------------
//  Lyapunov-based gradient MRAC for a first-order plant with unknown parameters.
//
//  Plant:     ẏ = −a·y + b·u      (a=2, b=1 — unknown to controller)
//  Reference: ẏm = −am·ym + bm·r  (am=1, bm=1 — desired behaviour)
//  Control:   u = θ₁·r + θ₂·y     (adaptation laws below)
//  Adapt:    θ̇₁ = γ₁·e·r,  θ̇₂ = γ₂·e·y   where e = ym − y
//
//  Ideal parameters (if plant known): θ₁* = bm/b = 1, θ₂* = (a−am)/b = 1
//  The adaptive controller converges to these values as it minimises the
//  tracking error e → 0.
//
//  Block diagram:
//    Square ──→ StateSpace(ref) ──→ Sum(+) ──→ Product ──→ Gain(γ₁) ──→ Integrator ──→ Product ──→
//             ↗                    (e=ym-y)  (e·r)                                (θ₁·r)   
//    Square ─────────────────────────────────────────────────────────────────────────────────→ Sum ──→ StateSpace(plant) ──→ Scope
//                                          ┌──→ Product ──→ Gain(γ₂) ──→ Integrator ──→ Product ──┘         │
//                                          │    (e·y)                                (θ₂·y)       │
//                                          │                                                  │
//                                          └────────────── plant output y (feedback) ─────────┘
const mracLyapunov: ExportedModel = {
  blocks: [
    // Reference signal r(t) — square wave, period 10s
    { id: 'sq', type: BlockType.Square, params: { amplitude: 1, frequency: 0.1, phase: 0 }, position: { x: 60, y: 140 } },
    // Reference model: ẏm = -ym + r  (am=1, bm=1)
    { id: 'ref', type: BlockType.StateSpace, params: { A: [-1], B: [1], C: [1], D: [0] }, position: { x: 200, y: 140 } },
    // Error: e = ym - y
    { id: 'err', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 340, y: 140 } },
    // θ₁ adaptation: e·r → γ₁ → integrator
    { id: 'er', type: BlockType.Product, params: {}, position: { x: 480, y: 80 } },
    { id: 'g1', type: BlockType.Gain, params: { gain: 0.5 }, position: { x: 600, y: 80 } },
    { id: 'th1', type: BlockType.Integrator, params: {}, position: { x: 720, y: 80 } },
    // Control contribution: θ₁·r
    { id: 'th1r', type: BlockType.Product, params: {}, position: { x: 860, y: 80 } },
    // θ₂ adaptation: e·y → γ₂ → integrator
    { id: 'ey', type: BlockType.Product, params: {}, position: { x: 480, y: 320 } },
    { id: 'g2', type: BlockType.Gain, params: { gain: 0.5 }, position: { x: 600, y: 320 } },
    { id: 'th2', type: BlockType.Integrator, params: {}, position: { x: 720, y: 320 } },
    // Control contribution: θ₂·y
    { id: 'th2y', type: BlockType.Product, params: {}, position: { x: 860, y: 320 } },
    // Control law: u = θ₁·r + θ₂·y
    { id: 'us', type: BlockType.Sum, params: { signs: [1, 1] }, position: { x: 1000, y: 200 } },
    // Plant: ẏ = -2y + u  (a=2, b=1)
    { id: 'plant', type: BlockType.StateSpace, params: { A: [-2], B: [1], C: [1], D: [0] }, position: { x: 1140, y: 200 } },
    // Scopes: plant output and control signal
    { id: 'sy', type: BlockType.Scope, params: {}, position: { x: 1280, y: 140 } },
    { id: 'su', type: BlockType.Scope, params: {}, position: { x: 1280, y: 320 } },
  ],
  edges: [
    // Reference signal to multiple destinations
    { id: 'e1', source: 'sq', sourcePort: 0, target: 'ref', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'ref', sourcePort: 0, target: 'err', targetPort: 0, waypoints: [] },
    // r also feeds the adaptation (e·r) and control (θ₁·r)
    { id: 'e3', source: 'sq', sourcePort: 0, target: 'er', targetPort: 1, waypoints: [{ x: 120, y: 60 }, { x: 480, y: 60 }] },
    { id: 'e4', source: 'sq', sourcePort: 0, target: 'th1r', targetPort: 1, waypoints: [{ x: 120, y: 40 }, { x: 860, y: 40 }] },
    // Error signal feeds both adaptation paths
    { id: 'e5', source: 'err', sourcePort: 0, target: 'er', targetPort: 0, waypoints: [] },
    { id: 'e6', source: 'err', sourcePort: 0, target: 'ey', targetPort: 0, waypoints: [{ x: 360, y: 200 }, { x: 480, y: 280 }] },
    // θ₁ path: e·r → γ₁ → integrator → θ₁·r
    { id: 'e7', source: 'er', sourcePort: 0, target: 'g1', targetPort: 0, waypoints: [] },
    { id: 'e8', source: 'g1', sourcePort: 0, target: 'th1', targetPort: 0, waypoints: [] },
    { id: 'e9', source: 'th1', sourcePort: 0, target: 'th1r', targetPort: 0, waypoints: [] },
    // θ₂ path: e·y → γ₂ → integrator → θ₂·y
    { id: 'e10', source: 'ey', sourcePort: 0, target: 'g2', targetPort: 0, waypoints: [] },
    { id: 'e11', source: 'g2', sourcePort: 0, target: 'th2', targetPort: 0, waypoints: [] },
    { id: 'e12', source: 'th2', sourcePort: 0, target: 'th2y', targetPort: 0, waypoints: [] },
    // Control law: u = θ₁·r + θ₂·y
    { id: 'e13', source: 'th1r', sourcePort: 0, target: 'us', targetPort: 0, waypoints: [{ x: 960, y: 80 }, { x: 960, y: 180 }] },
    { id: 'e14', source: 'th2y', sourcePort: 0, target: 'us', targetPort: 1, waypoints: [{ x: 960, y: 320 }, { x: 960, y: 220 }] },
    // Plant input and output
    { id: 'e15', source: 'us', sourcePort: 0, target: 'plant', targetPort: 0, waypoints: [] },
    { id: 'e16', source: 'plant', sourcePort: 0, target: 'sy', targetPort: 0, waypoints: [] },
    // Control signal to scope (tap u from us output)
    { id: 'e17', source: 'us', sourcePort: 0, target: 'su', targetPort: 0, waypoints: [{ x: 1080, y: 260 }, { x: 1280, y: 260 }] },
    // Feedback: plant output → error (e = ym - y)
    { id: 'e18', source: 'plant', sourcePort: 0, target: 'err', targetPort: 1, waypoints: [{ x: 1220, y: 240 }, { x: 1220, y: 440 }, { x: 340, y: 440 }, { x: 340, y: 180 }] },
    // Feedback: plant output → e·y (for θ₂ adaptation)
    { id: 'e19', source: 'plant', sourcePort: 0, target: 'ey', targetPort: 1, waypoints: [{ x: 1220, y: 260 }, { x: 1220, y: 460 }, { x: 480, y: 460 }, { x: 480, y: 360 }] },
    // Feedback: plant output → θ₂·y (for control law)
    { id: 'e20', source: 'plant', sourcePort: 0, target: 'th2y', targetPort: 1, waypoints: [{ x: 1220, y: 280 }, { x: 1220, y: 480 }, { x: 860, y: 480 }, { x: 860, y: 360 }] },
  ],
  simConfig: { dt: 0.01, duration: 20 },
};

export const EXAMPLES: Example[] = [
  { id: 'first-order-step', name: 'First-Order Step Response', description: 'Exponential rise of a 1/(s+1) lag to a unit step.', model: firstOrderStep },
  { id: 'second-order-step', name: 'Second-Order Underdamped Step', description: 'Decaying oscillatory response of 1/(s^2 + 0.4s + 1).', model: secondOrderStep },
  { id: 'pid-closed-loop', name: 'PID Closed-Loop Control', description: 'PID controller tracking a unit step on an underdamped plant.', model: pidClosedLoop },
  { id: 'sine-saturation', name: 'Sine Through Saturation', description: 'A clipped sinusoid showing the saturation nonlinearity.', model: sineSaturation },
  { id: 'relay-bang-bang', name: 'Relay Bang-Bang Control', description: 'On/off control with hysteresis producing a limit cycle.', model: relayBangBang },
  { id: 'drum-level-3element', name: 'Three-Element Drum Level Control', description: 'Cascade PID with steam flow feedforward for a boiler drum with inverse-response dynamics.', model: drumLevelThreeElement },
  { id: 'mrac-lyapunov', name: 'Model Reference Adaptive Control', description: 'Lyapunov-based MRAC — controller adapts online to track a reference model with unknown plant parameters.', model: mracLyapunov },
];