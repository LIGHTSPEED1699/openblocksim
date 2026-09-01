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
//    Step(SP) → Sum(+) → PID(LC) ──────────→ Sum(+) → Sum(+) → PID(FC) → TF(valve) → Sum(+) → [plant] → Scope
//                 ↑                                                ↑             ↑                    ↑
//                 │                                                │             │                    │
//    Step(D) → TF(steam) → Gain(Kff) ──────────────→ Sum(+)        │             │                    │
//                                                      │             │                    │
//                 └── [level feedback via tap] ──────────────────────────────────────────────────────┘
//                                                      [flow feedback] ───────────┘
//
//  Three-element drum level control: (1) drum level, (2) steam flow feedforward,
//  (3) feedwater flow feedback. The plant has an inverse response (RHP zero)
//  typical of boiler drum level — "swell and shrink" dynamics.
//
//  The Bequette plant Gp(s) = Kp*(1-βs)/[s*(τp*s+1)] has a pole at the origin
//  (integrator). A single TF block with den=[...,0] diverges under RK4 with
//  feedback delay, so the plant is decomposed into two paths matching the
//  tool page's implementation:
//    Path 1 (integrator+lag):  x' = Kp·u;  y1' = (x − y1)/τp
//    Path 2 (RHP zero):        y2' = (−Kp·β·u − y2)/τp
//    Output: L = y1 + y2
//  A Gain(1.0) tap after the plant output ensures only one feedback edge
//  is broken by the compiler (plant→tap), not two (level error + PID PV).
//
//  Plant: Kp=0.25, β=1, τp=2  (Bequette Module 9)
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
    { id: 'sm', type: BlockType.Sum, params: { signs: [1, -1] }, position: { x: 1000, y: 160 } },
    // --- Plant decomposition (two-path, matches tool page) ---
    // Path 1: Integrator — x = ∫ Kp·u dt  (TF: Kp/s)
    { id: 'p1i', type: BlockType.TransferFunction, params: { num: [0.25], den: [1, 0] }, position: { x: 1140, y: 100 } },
    // Path 1 lag: y1 = 1/(τp·s+1) · x  (first-order filter on integrator output)
    { id: 'p1l', type: BlockType.TransferFunction, params: { num: [1], den: [2, 1] }, position: { x: 1260, y: 100 } },
    // Path 2: RHP zero — y2 = −Kp·β/(τp·s+1) · u  (first-order lag with negative gain)
    { id: 'p2', type: BlockType.TransferFunction, params: { num: [-0.25], den: [2, 1] }, position: { x: 1140, y: 240 } },
    // Sum both paths: L = y1 + y2
    { id: 'pl', type: BlockType.Sum, params: { signs: [1, 1] }, position: { x: 1380, y: 170 } },
    // Gain(1.0) tap — non-dynamic passthrough so only one feedback edge is broken
    { id: 'tap', type: BlockType.Gain, params: { gain: 1.0 }, position: { x: 1380, y: 280 } },
    // Output scope
    { id: 'scope', type: BlockType.Scope, params: {}, position: { x: 1520, y: 170 } },
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
    // Mass balance → both plant paths
    { id: 'e8', source: 'sm', sourcePort: 0, target: 'p1i', targetPort: 0, waypoints: [{ x: 1060, y: 120 }, { x: 1140, y: 120 }] },
    { id: 'e9', source: 'sm', sourcePort: 0, target: 'p2', targetPort: 0, waypoints: [{ x: 1060, y: 260 }, { x: 1140, y: 260 }] },
    // Path 1: integrator → lag → plant sum
    { id: 'e10', source: 'p1i', sourcePort: 0, target: 'p1l', targetPort: 0, waypoints: [] },
    { id: 'e11', source: 'p1l', sourcePort: 0, target: 'pl', targetPort: 0, waypoints: [{ x: 1340, y: 120 }, { x: 1380, y: 150 }] },
    // Path 2: RHP zero → plant sum
    { id: 'e12', source: 'p2', sourcePort: 0, target: 'pl', targetPort: 1, waypoints: [{ x: 1340, y: 260 }, { x: 1380, y: 200 }] },
    // Plant output → tap (non-dynamic) → scope
    { id: 'e13', source: 'pl', sourcePort: 0, target: 'tap', targetPort: 0, waypoints: [] },
    { id: 'e14', source: 'pl', sourcePort: 0, target: 'scope', targetPort: 0, waypoints: [] },
    // Feedforward: D → steam meas → Kff → 3-element sum
    { id: 'e15', source: 'd', sourcePort: 0, target: 'tfs', targetPort: 0, waypoints: [] },
    { id: 'e16', source: 'tfs', sourcePort: 0, target: 'kff', targetPort: 0, waypoints: [] },
    { id: 'e17', source: 'kff', sourcePort: 0, target: 'sf', targetPort: 1, waypoints: [{ x: 460, y: 380 }, { x: 460, y: 200 }] },
    // Disturbance also enters mass balance directly
    { id: 'e18', source: 'd', sourcePort: 0, target: 'sm', targetPort: 1, waypoints: [{ x: 120, y: 420 }, { x: 1000, y: 420 }] },
    // Feedback: tap → level error (negative input) — only plant→tap edge is broken
    { id: 'e19', source: 'tap', sourcePort: 0, target: 'se', targetPort: 1, waypoints: [{ x: 1440, y: 320 }, { x: 1440, y: 460 }, { x: 200, y: 460 }, { x: 200, y: 200 }] },
    // Feedback: tap → level PID PV input (ISA derivative on PV)
    { id: 'e20', source: 'tap', sourcePort: 0, target: 'lc', targetPort: 1, waypoints: [{ x: 1440, y: 300 }, { x: 1440, y: 480 }, { x: 340, y: 480 }, { x: 340, y: 200 }] },
    // Feedback: valve/flow output → flow error (negative input)
    { id: 'e21', source: 'tv', sourcePort: 0, target: 'sfw', targetPort: 1, waypoints: [{ x: 940, y: 280 }, { x: 940, y: 360 }, { x: 600, y: 360 }, { x: 600, y: 200 }] },
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
//  A Gain(1.0) tap after the plant output acts as a non-dynamic fan-out point.
//  The compiler breaks only the plant→tap edge (one delay); all three feedback
//  destinations (error, e·y, θ₂·y) read from the tap's current-step output.
//  This matches the discrete-time MRAC where the previous step's y is used
//  for all feedback paths — a single one-step delay, not triple.
//
//  Uses a step reference (r=1) instead of square wave. A persistent reference
//  lets the adaptation converge to the ideal parameters (θ₁→1, θ₂→1) and the
//  plant output tracks the reference model output. A square wave would keep
//  re-exciting the system, and the compiler's one-step feedback delay adds
//  phase lag that prevents convergence under persistent oscillation.
//
//  Adaptation gains γ=0.5 match the tool page.
const mracLyapunov: ExportedModel = {
  blocks: [
    // Reference signal r(t) — unit step
    { id: 'sq', type: BlockType.Step, params: { stepTime: 0, stepValue: 1 }, position: { x: 60, y: 140 } },
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
    // Gain(1.0) tap — non-dynamic fan-out so only plant→tap is broken by compiler
    { id: 'tap', type: BlockType.Gain, params: { gain: 1.0 }, position: { x: 1280, y: 200 } },
    // Scopes: plant output and control signal
    { id: 'sy', type: BlockType.Scope, params: {}, position: { x: 1420, y: 140 } },
    { id: 'su', type: BlockType.Scope, params: {}, position: { x: 1420, y: 320 } },
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
    // Plant input and output → tap
    { id: 'e15', source: 'us', sourcePort: 0, target: 'plant', targetPort: 0, waypoints: [] },
    { id: 'e16', source: 'plant', sourcePort: 0, target: 'tap', targetPort: 0, waypoints: [] },
    // Tap → scopes
    { id: 'e17', source: 'tap', sourcePort: 0, target: 'sy', targetPort: 0, waypoints: [] },
    { id: 'e17b', source: 'us', sourcePort: 0, target: 'su', targetPort: 0, waypoints: [{ x: 1080, y: 260 }, { x: 1420, y: 260 }] },
    // Feedback from tap (non-dynamic) → only plant→tap edge is broken by compiler
    // tap → error (e = ym - y)
    { id: 'e18', source: 'tap', sourcePort: 0, target: 'err', targetPort: 1, waypoints: [{ x: 1340, y: 240 }, { x: 1340, y: 440 }, { x: 340, y: 440 }, { x: 340, y: 180 }] },
    // tap → e·y (for θ₂ adaptation)
    { id: 'e19', source: 'tap', sourcePort: 0, target: 'ey', targetPort: 1, waypoints: [{ x: 1340, y: 260 }, { x: 1340, y: 460 }, { x: 480, y: 460 }, { x: 480, y: 360 }] },
    // tap → θ₂·y (for control law)
    { id: 'e20', source: 'tap', sourcePort: 0, target: 'th2y', targetPort: 1, waypoints: [{ x: 1340, y: 280 }, { x: 1340, y: 480 }, { x: 860, y: 480 }, { x: 860, y: 360 }] },
  ],
  simConfig: { dt: 0.005, duration: 20 },
};

// ---- Example 8: DC Motor PID Speed Control (Imported from Simulink) -----------
//  Imported from DCMotorPID.mdl — DC motor speed control using standard
//  Simulink blocks only (no Simscape). 100% block support rate.
//  Step(setpoint) → Sum(error) → PID → Saturation(actuator) → Gain → TF(motor) → Scope
//  Feedback: motor output → Sum (negative) for closed-loop speed control.
//  The PID controller regulates motor speed against a 100 rad/s setpoint.
//  Actuator saturation limits the control voltage to ±12 V.
//  Motor model: G(s) = 10/(0.5s + 1) — first-order with gain 10, time constant 0.5s.
const dcMotorPID: ExportedModel = {
  blocks: [
    { id: 'Speed_Reference', type: BlockType.Step, params: { stepTime: 0, stepValue: 100 }, position: { x: 50, y: 50 } },
    { id: 'Error', type: BlockType.Sum, params: { signs: [1, -1], inputCount: 2 }, position: { x: 140, y: 50 } },
    { id: 'PID_Controller', type: BlockType.PID, params: { Kp: 2, Ti: 0.5, Td: 0.1 }, position: { x: 210, y: 50 } },
    { id: 'Actuator_Limit', type: BlockType.Saturation, params: { upperLimit: 12, lowerLimit: -12 }, position: { x: 290, y: 50 } },
    { id: 'Motor_Gain', type: BlockType.Gain, params: { gain: 10 }, position: { x: 360, y: 50 } },
    { id: 'Motor_Dynamics', type: BlockType.TransferFunction, params: { num: [1], den: [0.5, 1] }, position: { x: 430, y: 50 } },
    { id: 'Speed_Feedback', type: BlockType.Gain, params: { gain: 1 }, position: { x: 560, y: 100 } },
    { id: 'Speed_Output', type: BlockType.Scope, params: {}, position: { x: 680, y: 50 } },
    { id: 'Control_Signal', type: BlockType.Scope, params: {}, position: { x: 680, y: 150 } },
  ],
  edges: [
    { id: 'e0', source: 'Speed_Reference', sourcePort: 0, target: 'Error', targetPort: 0, waypoints: [] },
    { id: 'e1', source: 'Error', sourcePort: 0, target: 'PID_Controller', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'PID_Controller', sourcePort: 0, target: 'Actuator_Limit', targetPort: 0, waypoints: [] },
    { id: 'e3', source: 'Actuator_Limit', sourcePort: 0, target: 'Motor_Gain', targetPort: 0, waypoints: [] },
    { id: 'e4', source: 'Motor_Gain', sourcePort: 0, target: 'Motor_Dynamics', targetPort: 0, waypoints: [] },
    { id: 'e5', source: 'Motor_Dynamics', sourcePort: 0, target: 'Speed_Output', targetPort: 0, waypoints: [] },
    { id: 'e6', source: 'Motor_Dynamics', sourcePort: 0, target: 'Speed_Feedback', targetPort: 0, waypoints: [] },
    { id: 'e7', source: 'Speed_Feedback', sourcePort: 0, target: 'Error', targetPort: 1, waypoints: [{ x: 590, y: 140 }, { x: 140, y: 140 }] },
    { id: 'e8', source: 'Actuator_Limit', sourcePort: 0, target: 'Control_Signal', targetPort: 0, waypoints: [{ x: 310, y: 90 }, { x: 680, y: 170 }] },
  ],
  simConfig: { dt: 0.01, duration: 10 },
};

// ---- Example: Thermistor RC Charge-Time Temperature Measurement ----------
//   2-OUT/1-IN microcontroller trick. OUT1 switches +24V through R1 + NTC
//   thermistor into C (charge). OUT2 shorts C to GND (discharge). The IN pin
//   reads V_C and trips at the logic-1 threshold V_L1 = 12 V.
//
//   The block model uses the transfer function G(s) = 1/(τs+1) with τ = 2 s
//   (frozen at 25 °C) as the RC plant. A Relay (IN pin) detects when V_C
//   reaches V_L1. A Switch routes the TF input between +24 V (charge) and 0 V
//   (discharge) based on the relay state — when the cap charges to 12 V the
//   relay fires, the switch flips to 0 V, and the cap discharges back down.
//   When V_C drops below the relay's switchOff, the relay resets and the
//   switch flips back to +24 V, recharging. This produces a charge/discharge
//   oscillation with hysteresis, exactly as the real measurement loop does.
//
//   τ = (R1 + R_T(25 °C))·C = (10 kΩ + 10 kΩ)·100 µF = 2.0 s
//   t_L = τ·ln(V_S/(V_S − V_L1)) = 2·ln(24/12) = 2·ln(2) ≈ 1.39 s
const thermistorRcTimer: ExportedModel = {
  blocks: [
    { id: 'vs', type: BlockType.Constant, params: { value: 24 }, position: { x: -1.68, y: 326.42 } },
    { id: 'gnd', type: BlockType.Constant, params: { value: 0 }, position: { x: 5.60, y: 190.64 } },
    { id: 'sw', type: BlockType.Switch, params: { threshold: 0.5, condition: 'u2>=threshold' }, position: { x: 239.36, y: 200.80 } },
    { id: 'tf', type: BlockType.TransferFunction, params: { num: [1], den: [2, 1] }, position: { x: 400, y: 200.97 } },
    { id: 'relay', type: BlockType.Relay, params: { onValue: 1, offValue: 0, switchOn: 12, switchOff: 1 }, position: { x: 580, y: 340 } },
    { id: 'scope_v', type: BlockType.Scope, params: {}, position: { x: 580, y: 200 } },
    { id: 'scope_r', type: BlockType.Scope, params: {}, position: { x: 760, y: 340 } },
    { id: 'c_vs', type: BlockType.Comment, params: { text: 'OUT1: +24 V supply\n(charge phase)' }, position: { x: -36.09, y: 259.15 } },
    { id: 'c_gnd', type: BlockType.Comment, params: { text: 'OUT2: 0 V\ndischarge path' }, position: { x: -12.93, y: 96.28 } },
    { id: 'c_sw', type: BlockType.Comment, params: { text: 'Switch: OUT1/OUT2 routing\nRelay=0 → charge (V_S)\nRelay=1 → discharge (0 V)' }, position: { x: 173.44, y: 89.10 } },
    { id: 'c_tf', type: BlockType.Comment, params: { text: 'G(s) = 1/(τs+1)\nτ = 2 s @ 25 °C\n(R1+R_T)·C = 20 kΩ · 100 µF' }, position: { x: 400, y: 60 } },
    { id: 'c_relay', type: BlockType.Comment, params: { text: 'IN pin: Relay @ V_L1 = 12 V\nswitchOff = 1 V (hysteresis)\nOutput: 1 = charged, 0 = discharged' }, position: { x: 530.01, y: 459.29 } },
  ],
  edges: [
    { id: 'e1', source: 'gnd', sourcePort: 0, target: 'sw', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'vs', sourcePort: 0, target: 'sw', targetPort: 2, waypoints: [] },
    { id: 'e3', source: 'sw', sourcePort: 0, target: 'tf', targetPort: 0, waypoints: [] },
    { id: 'e4', source: 'tf', sourcePort: 0, target: 'relay', targetPort: 0, waypoints: [{ x: 543.24, y: 220.01 }, { x: 543.24, y: 360.01 }] },
    { id: 'e6', source: 'tf', sourcePort: 0, target: 'scope_v', targetPort: 0, waypoints: [] },
    { id: 'e7', source: 'relay', sourcePort: 0, target: 'scope_r', targetPort: 0, waypoints: [] },
    { id: 'e-relay-sw-1788229996272', source: 'relay', sourcePort: 0, target: 'sw', targetPort: 1, waypoints: [{ x: 700, y: 360 }, { x: 700, y: 440 }, { x: 179.36, y: 440 }, { x: 179.36, y: 220.80 }] },
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
  { id: 'dc-motor-pid', name: 'DC Motor PID Speed Control (Imported from Simulink)', description: 'Closed-loop PID speed control of a DC motor. Imported from DCMotorPID.mdl — 100% Simulink block support (Step, Sum, PID, Saturation, Gain, TransferFunction, Scope).', model: dcMotorPID },
  { id: 'thermistor-rc-timer', name: 'Thermistor RC Charge/Discharge (2-OUT/1-IN)', description: 'Capacitor charges through R1 + NTC thermistor via OUT1, then discharges via OUT2 when V_C reaches the logic-1 threshold. Transfer function G(s)=1/(τs+1) with Relay+Switch feedback loop for automatic charge/discharge cycling. τ = 2 s at 25 °C.', model: thermistorRcTimer },
];