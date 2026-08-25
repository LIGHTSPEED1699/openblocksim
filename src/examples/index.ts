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

// ---- Example 8: VFD Motor Control (Imported from Simulink) ---------------
//  Auto-generated from VF_Control.slx in github.com/Turki-Alzhrani/VFD-for-Induction-Motor.
//  59 blocks (10 supported, 49 unsupported Comment placeholders). 60 edges
//  resolved from 60 connection lines (including Branch fan-out).
//  Supported: Constant, Gain, Integrator, Sum, Scope, RoundingFunction.
//  Unsupported (Simscape): Reference (electrical machine, IGBT, diodes, sources),
//  BusSelector, Mux, Fcn, Logic, RelationalOperator, Display, KnobBlock,
//  ManualSwitch. The supported blocks form the control logic layer; the
//  Simscape Power Systems blocks are imported as Comment placeholders that
//  still participate in the connection graph topology.
const vfdImported: ExportedModel = {
  blocks: [
    { id: 'Asynchronous_Machine_SI_U', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2265, y: 285 } },
    { id: 'Bus_Selector', type: BlockType.Comment, params: { text: '[Unsupported: BusSelector]' }, position: { x: 2385, y: 311 } },
    { id: 'CURRENT', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 2665, y: 275 } },
    { id: 'Constant1', type: BlockType.Constant, params: { value: 1800 }, position: { x: 60, y: 481 } },
    { id: 'Diode1', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1060, y: 280 } },
    { id: 'Diode2', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1158, y: 280 } },
    { id: 'Diode3', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1060, y: 490 } },
    { id: 'Diode4', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1158, y: 490 } },
    { id: 'Diode5', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1248, y: 275 } },
    { id: 'Diode6', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1245, y: 490 } },
    { id: 'Fcn', type: BlockType.Comment, params: { text: '[Unsupported: Fcn]' }, position: { x: 765, y: 455 } },
    { id: 'Fcn1', type: BlockType.Comment, params: { text: '[Unsupported: Fcn]' }, position: { x: 750, y: 565 } },
    { id: 'Fcn2', type: BlockType.Comment, params: { text: '[Unsupported: Fcn]' }, position: { x: 760, y: 510 } },
    { id: 'Frequncey', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 530, y: 345 } },
    { id: 'Gain', type: BlockType.Gain, params: { gain: 1 }, position: { x: 2490, y: 255 } },
    { id: 'Gain1', type: BlockType.Gain, params: { gain: 1 }, position: { x: 2220, y: 180 } },
    { id: 'Gain2', type: BlockType.Gain, params: { gain: 1 }, position: { x: 575, y: 575 } },
    { id: 'Gain3', type: BlockType.Gain, params: { gain: 1 }, position: { x: 565, y: 445 } },
    { id: 'IGBT_Diode', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1748, y: 320 } },
    { id: 'IGBT_Diode1', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1858, y: 320 } },
    { id: 'IGBT_Diode2', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2023, y: 325 } },
    { id: 'IGBT_Diode3', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1748, y: 465 } },
    { id: 'IGBT_Diode4', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1858, y: 465 } },
    { id: 'IGBT_Diode5', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2023, y: 465 } },
    { id: 'Index_', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 695, y: 325 } },
    { id: 'Integrator', type: BlockType.Integrator, params: { initialValue: 0 }, position: { x: 680, y: 575 } },
    { id: 'Knob', type: BlockType.Comment, params: { text: '[Unsupported: KnobBlock]' }, position: { x: 230, y: 501 } },
    { id: 'Logical_Operator1', type: BlockType.Comment, params: { text: '[Unsupported: Logic]' }, position: { x: 1675, y: 404 } },
    { id: 'Logical_Operator2', type: BlockType.Comment, params: { text: '[Unsupported: Logic]' }, position: { x: 1985, y: 404 } },
    { id: 'Logical_Operator3', type: BlockType.Comment, params: { text: '[Unsupported: Logic]' }, position: { x: 1900, y: 404 } },
    { id: 'Manual_Switch', type: BlockType.Comment, params: { text: '[Unsupported: ManualSwitch]' }, position: { x: 475, y: 457 } },
    { id: 'Motor_Speed', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 410, y: 300 } },
    { id: 'Mux', type: BlockType.Comment, params: { text: '[Unsupported: Mux]' }, position: { x: 725, y: 456 } },
    { id: 'PID_Controller', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 410, y: 447 } },
    { id: 'RMS', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2245, y: 595 } },
    { id: 'RMS1', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2600, y: 280 } },
    { id: 'Relational_Operator', type: BlockType.Comment, params: { text: '[Unsupported: RelationalOperator]' }, position: { x: 1715, y: 97 } },
    { id: 'Relational_Operator1', type: BlockType.Comment, params: { text: '[Unsupported: RelationalOperator]' }, position: { x: 1865, y: 107 } },
    { id: 'Relational_Operator2', type: BlockType.Comment, params: { text: '[Unsupported: RelationalOperator]' }, position: { x: 2060, y: 117 } },
    { id: 'Repeating_Sequence', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 410, y: 515 } },
    { id: 'Repeating_Sequence1', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1605, y: 60 } },
    { id: 'Repeating_Sequence2', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1790, y: 60 } },
    { id: 'Repeating_Sequence3', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1950, y: 80 } },
    { id: 'Rotor_Speed', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 2460, y: 140 } },
    { id: 'Rounding_Function', type: BlockType.RoundingFunction, params: {}, position: { x: 180, y: 470 } },
    { id: 'SPEED', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 2665, y: 215 } },
    { id: 'SPEED_VS_CURRENT', type: BlockType.Scope, params: {}, position: { x: 2640, y: 316 } },
    { id: 'Scope', type: BlockType.Scope, params: {}, position: { x: 2545, y: 313 } },
    { id: 'Series_RLC_Branch', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1305, y: 241 } },
    { id: 'Series_RLC_Branch1', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1381, y: 350 } },
    { id: 'Subtract', type: BlockType.Sum, params: { signs: [1, -1], inputCount: 2 }, position: { x: 360, y: 447 } },
    { id: 'Sync_Speed', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 230, y: 425 } },
    { id: 'Three_Phase_Source', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 890, y: 391 } },
    { id: 'Vdc', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 1440, y: 465 } },
    { id: 'Voltage_Measurement', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 1470, y: 388 } },
    { id: 'Voltage_Measurement1', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2300, y: 488 } },
    { id: 'Vrms', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 2370, y: 600 } },
    { id: 'powergui', type: BlockType.Comment, params: { text: '[Unsupported: Reference]' }, position: { x: 2465, y: 80 } },
    { id: 'torque', type: BlockType.Comment, params: { text: '[Unsupported: Display]' }, position: { x: 2500, y: 440 } },
  ],
  edges: [
    { id: 'e0', source: 'Asynchronous_Machine_SI_U', sourcePort: 0, target: 'Bus_Selector', targetPort: 0, waypoints: [] },
    { id: 'e1', source: 'Bus_Selector', sourcePort: 0, target: 'Rotor_Speed', targetPort: 0, waypoints: [] },
    { id: 'e2', source: 'Bus_Selector', sourcePort: 0, target: 'Gain1', targetPort: 0, waypoints: [] },
    { id: 'e3', source: 'Bus_Selector', sourcePort: 0, target: 'Gain', targetPort: 0, waypoints: [] },
    { id: 'e4', source: 'Bus_Selector', sourcePort: 0, target: 'Scope', targetPort: 0, waypoints: [] },
    { id: 'e5', source: 'Bus_Selector', sourcePort: 1, target: 'SPEED_VS_CURRENT', targetPort: 1, waypoints: [] },
    { id: 'e6', source: 'Bus_Selector', sourcePort: 1, target: 'RMS1', targetPort: 0, waypoints: [] },
    { id: 'e7', source: 'Bus_Selector', sourcePort: 1, target: 'Scope', targetPort: 1, waypoints: [] },
    { id: 'e8', source: 'Gain', sourcePort: 0, target: 'SPEED_VS_CURRENT', targetPort: 0, waypoints: [] },
    { id: 'e9', source: 'Gain', sourcePort: 0, target: 'SPEED', targetPort: 0, waypoints: [] },
    { id: 'e10', source: 'Gain', sourcePort: 0, target: 'Motor_Speed', targetPort: 0, waypoints: [] },
    { id: 'e11', source: 'Gain', sourcePort: 0, target: 'Subtract', targetPort: 1, waypoints: [] },
    { id: 'e12', source: 'Bus_Selector', sourcePort: 2, target: 'torque', targetPort: 0, waypoints: [] },
    { id: 'e13', source: 'Bus_Selector', sourcePort: 2, target: 'Scope', targetPort: 2, waypoints: [] },
    { id: 'e14', source: 'Gain1', sourcePort: 0, target: 'Asynchronous_Machine_SI_U', targetPort: 0, waypoints: [] },
    { id: 'e15', source: 'Mux', sourcePort: 0, target: 'Fcn', targetPort: 0, waypoints: [] },
    { id: 'e16', source: 'Mux', sourcePort: 0, target: 'Fcn2', targetPort: 0, waypoints: [] },
    { id: 'e17', source: 'Mux', sourcePort: 0, target: 'Fcn1', targetPort: 0, waypoints: [] },
    { id: 'e18', source: 'Gain2', sourcePort: 0, target: 'Integrator', targetPort: 0, waypoints: [] },
    { id: 'e19', source: 'Integrator', sourcePort: 0, target: 'Mux', targetPort: 1, waypoints: [] },
    { id: 'e20', source: 'Gain3', sourcePort: 0, target: 'Index_', targetPort: 0, waypoints: [] },
    { id: 'e21', source: 'Gain3', sourcePort: 0, target: 'Mux', targetPort: 0, waypoints: [] },
    { id: 'e22', source: 'IGBT_Diode3', sourcePort: 0, target: 'IGBT_Diode', targetPort: 0, waypoints: [] },
    { id: 'e23', source: 'IGBT_Diode4', sourcePort: 0, target: 'IGBT_Diode1', targetPort: 0, waypoints: [] },
    { id: 'e24', source: 'IGBT_Diode5', sourcePort: 0, target: 'IGBT_Diode2', targetPort: 0, waypoints: [] },
    { id: 'e25', source: 'Repeating_Sequence1', sourcePort: 0, target: 'Relational_Operator', targetPort: 0, waypoints: [] },
    { id: 'e26', source: 'Fcn', sourcePort: 0, target: 'Relational_Operator', targetPort: 1, waypoints: [] },
    { id: 'e27', source: 'Relational_Operator', sourcePort: 0, target: 'Logical_Operator1', targetPort: 0, waypoints: [] },
    { id: 'e28', source: 'Relational_Operator', sourcePort: 0, target: 'IGBT_Diode', targetPort: 0, waypoints: [] },
    { id: 'e29', source: 'Logical_Operator1', sourcePort: 0, target: 'IGBT_Diode3', targetPort: 0, waypoints: [] },
    { id: 'e30', source: 'Fcn2', sourcePort: 0, target: 'Relational_Operator1', targetPort: 1, waypoints: [] },
    { id: 'e31', source: 'Repeating_Sequence2', sourcePort: 0, target: 'Relational_Operator1', targetPort: 0, waypoints: [] },
    { id: 'e32', source: 'Fcn1', sourcePort: 0, target: 'Relational_Operator2', targetPort: 1, waypoints: [] },
    { id: 'e33', source: 'Repeating_Sequence3', sourcePort: 0, target: 'Relational_Operator2', targetPort: 0, waypoints: [] },
    { id: 'e34', source: 'Relational_Operator1', sourcePort: 0, target: 'Logical_Operator3', targetPort: 0, waypoints: [] },
    { id: 'e35', source: 'Relational_Operator1', sourcePort: 0, target: 'IGBT_Diode1', targetPort: 0, waypoints: [] },
    { id: 'e36', source: 'Logical_Operator3', sourcePort: 0, target: 'IGBT_Diode4', targetPort: 0, waypoints: [] },
    { id: 'e37', source: 'Relational_Operator2', sourcePort: 0, target: 'Logical_Operator2', targetPort: 0, waypoints: [] },
    { id: 'e38', source: 'Relational_Operator2', sourcePort: 0, target: 'IGBT_Diode2', targetPort: 0, waypoints: [] },
    { id: 'e39', source: 'Logical_Operator2', sourcePort: 0, target: 'IGBT_Diode5', targetPort: 0, waypoints: [] },
    { id: 'e40', source: 'Subtract', sourcePort: 0, target: 'PID_Controller', targetPort: 0, waypoints: [] },
    { id: 'e41', source: 'Diode1', sourcePort: 0, target: 'Diode3', targetPort: 0, waypoints: [] },
    { id: 'e42', source: 'Diode2', sourcePort: 0, target: 'Diode4', targetPort: 0, waypoints: [] },
    { id: 'e43', source: 'Diode5', sourcePort: 0, target: 'Diode6', targetPort: 0, waypoints: [] },
    { id: 'e44', source: 'Voltage_Measurement', sourcePort: 0, target: 'Vdc', targetPort: 0, waypoints: [] },
    { id: 'e45', source: 'Series_RLC_Branch', sourcePort: 0, target: 'IGBT_Diode2', targetPort: 0, waypoints: [] },
    { id: 'e46', source: 'IGBT_Diode5', sourcePort: 0, target: 'Voltage_Measurement', targetPort: 1, waypoints: [] },
    { id: 'e47', source: 'IGBT_Diode5', sourcePort: 0, target: 'Diode3', targetPort: 0, waypoints: [] },
    { id: 'e48', source: 'Diode5', sourcePort: 0, target: 'Diode2', targetPort: 0, waypoints: [] },
    { id: 'e49', source: 'PID_Controller', sourcePort: 0, target: 'Manual_Switch', targetPort: 0, waypoints: [] },
    { id: 'e50', source: 'Manual_Switch', sourcePort: 0, target: 'Frequncey', targetPort: 0, waypoints: [] },
    { id: 'e51', source: 'Manual_Switch', sourcePort: 0, target: 'Gain3', targetPort: 0, waypoints: [] },
    { id: 'e52', source: 'Manual_Switch', sourcePort: 0, target: 'Gain2', targetPort: 0, waypoints: [] },
    { id: 'e53', source: 'Repeating_Sequence', sourcePort: 0, target: 'Manual_Switch', targetPort: 1, waypoints: [] },
    { id: 'e54', source: 'Voltage_Measurement1', sourcePort: 0, target: 'RMS', targetPort: 0, waypoints: [] },
    { id: 'e55', source: 'RMS', sourcePort: 0, target: 'Vrms', targetPort: 0, waypoints: [] },
    { id: 'e56', source: 'Constant1', sourcePort: 0, target: 'Rounding_Function', targetPort: 0, waypoints: [] },
    { id: 'e57', source: 'Rounding_Function', sourcePort: 0, target: 'Sync_Speed', targetPort: 0, waypoints: [] },
    { id: 'e58', source: 'Rounding_Function', sourcePort: 0, target: 'Subtract', targetPort: 0, waypoints: [] },
    { id: 'e59', source: 'RMS1', sourcePort: 0, target: 'CURRENT', targetPort: 0, waypoints: [] },
  ],
  simConfig: { dt: 0.01, duration: 10 },
};

export const EXAMPLES: Example[] = [
  { id: 'first-order-step', name: 'First-Order Step Response', description: 'Exponential rise of a 1/(s+1) lag to a unit step.', model: firstOrderStep },
  { id: 'second-order-step', name: 'Second-Order Underdamped Step', description: 'Decaying oscillatory response of 1/(s^2 + 0.4s + 1).', model: secondOrderStep },
  { id: 'pid-closed-loop', name: 'PID Closed-Loop Control', description: 'PID controller tracking a unit step on an underdamped plant.', model: pidClosedLoop },
  { id: 'sine-saturation', name: 'Sine Through Saturation', description: 'A clipped sinusoid showing the saturation nonlinearity.', model: sineSaturation },
  { id: 'relay-bang-bang', name: 'Relay Bang-Bang Control', description: 'On/off control with hysteresis producing a limit cycle.', model: relayBangBang },
  { id: 'drum-level-3element', name: 'Three-Element Drum Level Control', description: 'Cascade PID with steam flow feedforward for a boiler drum with inverse-response dynamics.', model: drumLevelThreeElement },
  { id: 'mrac-lyapunov', name: 'Model Reference Adaptive Control', description: 'Lyapunov-based MRAC — controller adapts online to track a reference model with unknown plant parameters.', model: mracLyapunov },
  { id: 'vfd-imported', name: 'VFD Motor Control (Imported from Simulink)', description: 'Supported blocks extracted from VF_Control.slx (github.com/Turki-Alzhrani/VFD-for-Induction-Motor). 10 of 59 blocks imported — Constant, Gain, Integrator, Sum, Scope, Rounding. Simscape electrical blocks (Reference, Mux, BusSelector, Fcn) are unsupported.', model: vfdImported },
];