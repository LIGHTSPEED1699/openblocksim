# Simulink vs OpenBlockSim: Thorough Block Library Comparison

## 1. Simulink Block Library Categories (Complete)

Simulink organizes blocks into these libraries:

| Library | Description |
|---------|-------------|
| **Commonly Used** | Curated set of frequently-used blocks from other libraries |
| **Continuous** | Continuous-time linear and nonlinear blocks |
| **Discrete** | Discrete-time blocks (delays, filters, transfer functions) |
| **Discontinuities** | Nonlinear blocks with discontinuous outputs |
| **Logic and Bit Operations** | Boolean logic, relational operators, bit shifts |
| **Lookup Tables** | 1D/2D/nD interpolation from tabulated data |
| **Math Operations** | Arithmetic, trigonometric, exponential, rounding |
| **Model Verification** | Assertion and range-checking blocks |
| **Model-Wide Utilities** | Model info, configuration, profiling |
| **Ports & Subsystems** | Subsystem I/O, model reference, atomic subsystems |
| **Signal Attributes** | Data type conversion, rate transition, signal specification |
| **Signal Routing** | Mux/Demux, Switch, Goto/From, Merge, Selector |
| **Sinks** | Scope, Display, To Workspace, To File, XY Graph, Terminator |
| **Sources** | Step, Ramp, Sine, Constant, Pulse, Random, Chirp, Clock, From File/Workspace |
| **User-Defined Functions** | MATLAB Function, S-Function, Fcn, Interpreted Fcn |
| **Additional Math & Discrete** | Increment/Decrement, additional discrete filters |

## 2. Current OpenBlockSim Blocks (20 types)

| Block | Category | Simulink Equivalent | Status |
|-------|----------|---------------------|--------|
| Constant | Source | Constant | ✅ Direct match |
| Step | Source | Step | ✅ Direct match |
| Ramp | Source | Ramp | ✅ Direct match |
| Sine | Source | Sine Wave | ✅ Match (freq in Hz, Simulink uses rad/s option too) |
| Square | Source | (Signal Generator / Pulse Generator) | ⚠️ Approximate — Simulink separates Pulse Generator from Square |
| Scope | Sink | Scope | ⚠️ Single-input only; Simulink Scope supports multi-trace |
| ToWorkspace | Sink | To Workspace | ⚠️ No CSV export spec; Simulink supports structured workspace vars |
| Sum | Math | Sum | ⚠️ Fixed 2 inputs; Simulink supports arbitrary input count with +/- signs |
| Gain | Math | Gain | ✅ Direct match |
| Product | Math | Product, Divide | ⚠️ Fixed multiply of 2 inputs; Simulink supports ÷ and arbitrary count |
| TransferFunction | Linear | Transfer Fcn | ✅ Match (controllable canonical form, RK4 integration) |
| StateSpace | Linear | State-Space | ✅ Match (single input/output; Simulink supports MIMO) |
| Integrator | Linear | Integrator | ⚠️ Basic; Simulink has reset, saturation, external IC |
| Derivative | Linear | Derivative | ✅ Match (both use finite difference approximation) |
| TransportDelay | Linear | Transport Delay | ✅ Match (ring buffer approach) |
| Saturation | Nonlinear | Saturation | ✅ Direct match |
| Deadzone | Nonlinear | Dead Zone | ✅ Direct match |
| PID | Control | PID Controller | ✅ Match (ISA standard form, filtered derivative) |
| Relay | Control | Relay | ✅ Match (hysteresis logic) |
| Comment | Annotation | (Annotation / Note) | ✅ OpenBlockSim has this as a block; Simulink uses annotations |

## 3. Gap Analysis: What Simulink Has That OpenBlockSim Doesn't

### Priority 1: High-Frequency Blocks (appear in most real models)

#### Signal Routing (entire category missing)
| Simulink Block | Purpose | Complexity |
|---|---|---|
| **Mux** | Combine N scalar signals into a vector bus | Low — output = array of inputs |
| **Demux** | Split vector bus into N scalar signals | Low — output N = input[n] |
| **Switch** | 3-input: output input1 or input3 based on input2 vs threshold | Low — conditional pass-through |
| **Manual Switch** | Toggle between 2 inputs (UI interaction) | Low — but needs UI state |
| **Merge** | Combine signals from alternative paths | Medium — only one active at a time |
| **Goto/From** | Wireless signal routing (named tags) | Medium — needs global lookup |
| **Multiport Switch** | Select one of N data inputs based on control index | Low — indexed pass-through |
| **Bus Creator/Selector** | Structured bus (named hierarchical) | High — complex type system |

**Recommendation:** Add Mux, Demux, Switch. Skip Goto/From, Bus, Merge (architectural mismatch — OpenBlockSim uses port-based wiring, no need for wireless routing). Skip Manual Switch (UI interactive, low value for simulation).

#### Math Operations (most missing)
| Simulink Block | Purpose | Complexity |
|---|---|---|
| **Abs** | Absolute value | Trivial |
| **Sign** | Sign function (-1, 0, +1) | Trivial |
| **MinMax** | Min or max of N inputs | Trivial |
| **Bias** | y = u + bias (add constant offset) | Trivial |
| **Unary Minus** | Negate input | Trivial |
| **Math Function** | exp, log, log10, 10^u, 2^u, square, sqrt, pow | Low — select function type via param |
| **Trigonometric Function** | sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh | Low — select function via param |
| **Sqrt** | Square root | Trivial |
| **Rounding Function** | round, floor, ceil, fix | Trivial |
| **Divide** | Divide (a/b) | Trivial |
| **Slider Gain** | Gain with UI slider | Skip — Gain already covers this |
| **Product of Elements** | Reduce (multiply all elements) | Skip — YAGNI for scalar-only sim |
| **Dot Product** | Vector inner product | Skip — YAGNI |
| **Algebraic Constraint** | Solve f(u) = 0 algebraically | High — needs algebraic solver |
| **Complex to Real-Imag / Magnitude-Angle** | Complex number decomposition | Skip — OpenBlockSim is real-only |
| **Permute/Reshape/Squeeze** | Array manipulation | Skip — YAGNI for scalar sim |

**Recommendation:** Add Abs, Sign, MinMax, Bias, Divide, Math Function (exp/log/square/sqrt/10^u/2^u), Trigonometric Function (sin/cos/tan/asin/acos/atan/atan2/sinh/cosh/tanh), Rounding Function, Unary Minus. That's 9 new math blocks, all trivial-to-low complexity.

#### Discrete Blocks (entire category missing)
| Simulink Block | Purpose | Complexity |
|---|---|---|
| **Unit Delay** | z^-1 — delay input by one sample period | Low — 1-state absolute update |
| **Integer Delay** | z^-N — delay by N sample periods | Low — N-state shift register |
| **Tapped Delay** | Output all delayed versions | Medium — multi-output |
| **Discrete-Time Integrator** | Forward Euler, Backward Euler, Trapezoidal | Medium — integration method selection |
| **Discrete Transfer Fcn** | H(z) = num(z)/den(z) | Medium — z-domain implementation |
| **Discrete State-Space** | x[k+1] = Ax[k] + Bu[k], y = Cx + Du | Medium — matrix discrete update |
| **Discrete Filter** | H(z^-1) = num(z^-1)/den(z^-1) | Medium — same as discrete TF but in z^-1 form |
| **Memory** | Hold previous input value (like unit delay but continuous-time) | Low |
| **Zero-Order Hold** | Sample and hold at discrete intervals | Medium — needs sample time concept |
| **First-Order Hold** | Linear interpolation between samples | High — interpolation logic |

**Recommendation:** Add Unit Delay, Discrete-Time Integrator, Discrete Transfer Fcn, Memory. These are the most commonly used discrete blocks. The rest are either redundant (Discrete Filter = Discrete TF in different notation) or require architectural changes (sample time concept).

#### Discontinuities (partially covered)
| Simulink Block | Purpose | OpenBlockSim? |
|---|---|---|
| Saturation | Clamp to [lower, upper] | ✅ Have it |
| Dead Zone | Zero output within [start, end] | ✅ Have it |
| **Rate Limiter** | Limit rate of change (rising/falling slew) | ❌ Missing — common in actuator models |
| **Backlash** | Play/deadband in mechanical systems | ❌ Missing — common in mechanical modeling |
| **Coulomb & Viscous Friction** | Friction model with offset at zero | ❌ Missing — niche |
| **Quantizer** | Round to discrete levels (quantization) | ❌ Missing — useful for ADC modeling |
| **Wrap to Zero** | Zero output when input exceeds threshold | ❌ Missing — niche |
| **Hit Crossing** | Detect signal crossing a threshold | ❌ Missing — useful for event detection |
| **Saturation Dynamic** | Saturation with signal-dependent limits | ❌ Missing — niche (can be built from Saturation + Mux) |
| **Dead Zone Dynamic** | Dead zone with signal-dependent limits | ❌ Missing — niche |

**Recommendation:** Add Rate Limiter, Quantizer, Backlash. Skip the rest (niche or buildable from existing blocks).

#### Sources (partially covered)
| Simulink Block | Purpose | OpenBlockSim? |
|---|---|---|
| Constant | Constant value | ✅ |
| Step | Step function | ✅ |
| Ramp | Linear ramp | ✅ |
| Sine Wave | Sinusoidal | ✅ |
| **Pulse Generator** | Configurable pulse (duty cycle, period, amplitude) | ❌ Missing — very common |
| **Clock** | Output simulation time t | ❌ Missing — trivial |
| **Chirp Signal** | Sweeping frequency sine | ❌ Missing — useful for system ID |
| **Repeating Sequence** | Arbitrary periodic waveform from lookup table | ❌ Missing — useful |
| **Random Number** | Gaussian random | ❌ Missing — useful for noise injection |
| **Uniform Random Number** | Uniform random | ❌ Missing |
| **Band-Limited White Noise** | Filtered noise for continuous systems | ❌ Missing |
| **Signal Generator** | Multiple waveform types (sine/square/sawtooth) | ❌ Partially covered by Sine/Square |
| From File/Workspace | Data import | ❌ Skip — architectural mismatch (no file I/O in browser sim) |
| Ground | Zero output for unwired ports | ❌ Missing — useful |
| Inport | Subsystem input | ❌ Skip — no subsystems |

**Recommendation:** Add Pulse Generator, Clock, Chirp Signal, Repeating Sequence, Random Number. Skip the rest (file I/O mismatch, niche, or covered by existing blocks).

#### Sinks (partially covered)
| Simulink Block | Purpose | OpenBlockSim? |
|---|---|---|
| Scope | Time-series plot | ✅ (single-input) |
| **Display** | Numeric readout (current value) | ❌ Missing — useful |
| To Workspace | Export to workspace variable | ⚠️ Have it but no export spec |
| **XY Graph** | Plot input1 vs input2 (phase plot) | ❌ Missing — useful for phase portraits |
| **Terminator** | Absorb signal from unconnected output | ❌ Missing — useful for clean diagrams |
| To File | Export to file | ❌ Skip — no file system in browser |
| **Stop Simulation** | Halt simulation on condition | ❌ Missing — useful for event-driven sim |
| Floating Scope | Roving scope | ❌ Skip — UI complexity, low value |

**Recommendation:** Add Terminator, Display (as Scope variant), Stop Simulation. Skip XY Graph (requires significant PlotArea changes) and file-based sinks.

### Priority 2: Existing Block Improvements

| Block | Current Limitation | Simulink Feature | Fix |
|---|---|---|---|
| **Sum** | Fixed 2 inputs, signs=[1,1] | Arbitrary input count, +/- signs on each input | Make inputs configurable (2-8), signs array already supports this |
| **Product** | Fixed 2 inputs, multiply only | Supports ÷, arbitrary count, * and / per input | Add operator array param, configurable input count |
| **Scope** | Single input only | Multi-trace scope (mux input or multi-port) | Support multiple input ports (2-4) |
| **Integrator** | No limits, no reset | Upper/lower saturation, external reset, initial condition source | Add upperLimit/lowerLimit params (saturation), optional reset |
| **Sine** | Frequency in Hz only | Simulink supports frequency in rad/s or Hz, plus bias offset | Add bias param, keep Hz (more intuitive) |
| **StateSpace** | Single input, single output | MIMO (B is n×m, C is p×n, D is p×m) | Support multi-input/multi-output via matrix dimensions |
| **TransportDelay** | Fixed ring buffer, pade approximation not offered | Pade approximation option for continuous delay | Keep ring buffer (simpler, accurate enough for fixed-step) |

### Priority 3: Architectural Limitations (not block-specific)

| Feature | Simulink | OpenBlockSim | Impact |
|---|---|---|---|
| Subsystems | Hierarchical nesting | Flat only | Major — limits model complexity |
| Variable-step solver | ode45, ode23tb, ode15s | Fixed-step RK4 only | Medium — stiff systems need implicit solvers |
| Multi-rate simulation | Different sample times per block | Single global dt | Medium — discrete blocks need their own sample time |
| Conditional execution | Enabled/triggered subsystems | None | Low — advanced feature |
| Model parameters | Global tunable parameters | Per-block params only | Low — can be worked around |
| Signal labeling | Named signals, bus elements | Unnamed wires | Low — cosmetic |

## 4. Recommended Additions Summary

### New Blocks (21 total)

**Signal Routing (3):**
1. Mux — combine N inputs into vector output
2. Demux — split vector input into N outputs
3. Switch — 3-input conditional pass-through

**Math Operations (9):**
4. Abs — absolute value
5. Sign — sign function
6. MinMax — min or max of inputs
7. Bias — add constant offset
8. Divide — input1 / input2
9. MathFunction — exp, log, log10, square, sqrt, 10^u, 2^u, power
10. TrigFunction — sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh
11. RoundingFunction — round, floor, ceil, fix
12. UnaryMinus — negate input

**Discrete (4):**
13. UnitDelay — z^-1 delay
14. DiscreteIntegrator — forward/backward Euler, trapezoidal
15. DiscreteTransferFcn — H(z) = num(z)/den(z)
16. Memory — hold previous value (continuous-time domain)

**Discontinuities (3):**
17. RateLimiter — slew rate limiting
18. Quantizer — discrete level quantization
19. Backlash — mechanical play/deadband

**Sources (5):**
20. PulseGenerator — configurable pulse train
21. Clock — output simulation time
22. ChirpSignal — frequency sweep
23. RepeatingSequence — arbitrary periodic waveform
24. RandomNumber — Gaussian random

**Sinks (3):**
25. Terminator — absorb unconnected signal
26. Display — numeric readout block
27. StopSimulation — conditional simulation halt

### Existing Block Improvements (6)
1. Sum — variable input count (2-8), sign array per input
2. Product — variable input count (2-4), operator array (* or /)
3. Scope — multi-input support (2-4 traces)
4. Integrator — optional upper/lower saturation limits
5. Sine — add bias (DC offset) parameter
6. StateSpace — MIMO support (multi-input, multi-output)

## 5. What NOT to Add (YAGNI)

- Goto/From — wireless routing is unnecessary in a visual port-based editor
- Bus Creator/Selector — complex type system, unnecessary for scalar sim
- Complex number blocks — OpenBlockSim is real-valued only
- Algebraic Constraint — requires algebraic loop solver (different architecture)
- File I/O blocks (From File, To File, From Workspace) — no file system in browser
- Subsystems — massive architectural change, separate project
- Variable-step solver — separate project, different numerical methods
- Model Verification blocks — niche, not needed for educational sim
- Logic and Bit Operations — boolean logic not needed for continuous control sim
- Lookup Tables — can be added later if needed, niche for control systems
- User-Defined Functions — no MATLAB runtime in browser