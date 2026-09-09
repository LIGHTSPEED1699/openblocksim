import { BlockType, type BlockMetaEntry } from './types';

// Re-export ParamSpec entries from ParameterPanel for the metadata registry.
// These mirror the PARAM_SPECS in ParameterPanel.tsx — the single source of truth
// is now BlockMeta. The ParameterPanel will be updated to read from here in a
// follow-up, but for now both coexist to avoid breaking existing behavior.

const meta: Record<BlockType, BlockMetaEntry> = {
  // ── Sources ──
  [BlockType.Constant]: { type: BlockType.Constant, category: 'Source', math: '1', doc: 'Constant value source', paramSpec: { value: { type: 'number', default: 1, label: 'Value' } } },
  [BlockType.Step]: { type: BlockType.Step, category: 'Source', math: 'u(t-t_0)', doc: 'Step input at time t₀', paramSpec: { stepTime: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Step Time' }, stepValue: { type: 'number', default: 1, label: 'Step Value' } } },
  [BlockType.Ramp]: { type: BlockType.Ramp, category: 'Source', math: 'r(t)', doc: 'Ramp signal with slope', paramSpec: { startTime: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Start Time' }, slope: { type: 'number', default: 1, label: 'Slope' } } },
  [BlockType.Sine]: { type: BlockType.Sine, category: 'Source', math: '\\sin(\\omega t)', doc: 'Sine wave generator', paramSpec: { amplitude: { type: 'number', default: 1, label: 'Amplitude' }, frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' }, phase: { type: 'number', default: 0, label: 'Phase (rad)' }, bias: { type: 'number', default: 0, label: 'Bias (DC offset)' } } },
  [BlockType.Square]: { type: BlockType.Square, category: 'Source', math: '\\square(t)', doc: 'Square wave generator', paramSpec: { amplitude: { type: 'number', default: 1, label: 'Amplitude' }, frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' }, phase: { type: 'number', default: 0, label: 'Phase (rad)' } } },
  [BlockType.PulseGenerator]: { type: BlockType.PulseGenerator, category: 'Source', math: '\\Pi(t)', doc: 'Pulse generator', paramSpec: { amplitude: { type: 'number', default: 1, label: 'Amplitude' }, period: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Period (s)' }, dutyCycle: { type: 'number', default: 50, min: 0, max: 100, step: 1, label: 'Duty Cycle (%)' }, phaseDelay: { type: 'number', default: 0, label: 'Phase Delay (s)' } } },
  [BlockType.Clock]: { type: BlockType.Clock, category: 'Source', math: 't', doc: 'Current simulation time', paramSpec: {} },
  [BlockType.ChirpSignal]: { type: BlockType.ChirpSignal, category: 'Source', math: '\\text{chirp}', doc: 'Frequency-swept sine', paramSpec: { amplitude: { type: 'number', default: 1, label: 'Amplitude' }, startFreq: { type: 'number', default: 0.1, min: 0, step: 0.1, label: 'Start Frequency (Hz)' }, targetFreq: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Target Frequency (Hz)' }, sweepTime: { type: 'number', default: 10, min: 0, step: 0.1, label: 'Sweep Time (s)' } } },
  [BlockType.RepeatingSequence]: { type: BlockType.RepeatingSequence, category: 'Source', math: '\\text{rep}', doc: 'Repeating signal from time-value pairs', paramSpec: { timeValues: { type: 'array', default: [0, 1, 2, 3], label: 'Time Values' }, outputValues: { type: 'array', default: [0, 1, 0, 1], label: 'Output Values' } } },
  [BlockType.RandomNumber]: { type: BlockType.RandomNumber, category: 'Source', math: '\\text{rand}', doc: 'Random number generator', paramSpec: { mean: { type: 'number', default: 0, label: 'Mean' }, stdDev: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Standard Deviation' }, seed: { type: 'number', default: 0, label: 'Seed (0=random)' } } },

  // ── Sinks ──
  [BlockType.Scope]: { type: BlockType.Scope, category: 'Sink', doc: 'Plot signal vs time', paramSpec: {} },
  [BlockType.ToWorkspace]: { type: BlockType.ToWorkspace, category: 'Sink', math: 'W', doc: 'Export signal to workspace', paramSpec: {} },
  [BlockType.Terminator]: { type: BlockType.Terminator, category: 'Sink', math: 'T', doc: 'Terminate unconnected output', paramSpec: {} },
  [BlockType.Display]: { type: BlockType.Display, category: 'Sink', math: 'D', doc: 'Display current value', paramSpec: {} },
  [BlockType.StopSimulation]: { type: BlockType.StopSimulation, category: 'Sink', math: '\\blacksquare', doc: 'Stop simulation when input is non-zero', paramSpec: {} },

  // ── Math ──
  [BlockType.Sum]: { type: BlockType.Sum, category: 'Math', math: '\\Sigma', doc: 'Sum or difference of inputs', portLabels: ['in₁', 'in₂'], paramSpec: { inputCount: { type: 'number', default: 2, min: 2, max: 8, step: 1, label: 'Input Count' }, signs: { type: 'array', default: [1, 1], label: 'Signs (1 or -1)' } } },
  [BlockType.Gain]: { type: BlockType.Gain, category: 'Math', math: 'K', doc: 'Multiply input by gain', paramSpec: { gain: { type: 'number', default: 1, label: 'Gain' } } },
  [BlockType.Product]: { type: BlockType.Product, category: 'Math', math: '\\otimes', doc: 'Product or quotient of inputs', paramSpec: { inputCount: { type: 'number', default: 2, min: 2, max: 4, step: 1, label: 'Input Count' }, operators: { type: 'text', default: '*,*', label: 'Operators (* or /, comma-separated)' } } },
  [BlockType.Abs]: { type: BlockType.Abs, category: 'Math', math: '|x|', doc: 'Absolute value', paramSpec: {} },
  [BlockType.Sign]: { type: BlockType.Sign, category: 'Math', math: '\\text{sgn}', doc: 'Sign function', paramSpec: {} },
  [BlockType.Bias]: { type: BlockType.Bias, category: 'Math', math: 'x+b', doc: 'Add bias to input', paramSpec: { bias: { type: 'number', default: 0, label: 'Bias' } } },
  [BlockType.UnaryMinus]: { type: BlockType.UnaryMinus, category: 'Math', math: '-x', doc: 'Negate input', paramSpec: {} },
  [BlockType.Divide]: { type: BlockType.Divide, category: 'Math', math: '\\div', doc: 'Divide first input by second', paramSpec: {} },
  [BlockType.MinMax]: { type: BlockType.MinMax, category: 'Math', math: '\\min/\\max', doc: 'Minimum or maximum of inputs', paramSpec: { mode: { type: 'select', default: 'min', label: 'Mode' } } },
  [BlockType.RoundingFunction]: { type: BlockType.RoundingFunction, category: 'Math', math: '\\lfloor x \\rceil', doc: 'Rounding function', paramSpec: { mode: { type: 'select', default: 'round', label: 'Rounding Mode' } } },
  [BlockType.MathFunction]: { type: BlockType.MathFunction, category: 'Math', math: 'f(x)', doc: 'Math function (exp, log, power, etc.)', paramSpec: { mode: { type: 'select', default: 'exp', label: 'Function' }, exponent: { type: 'number', default: 2, label: 'Exponent (power mode)' } } },
  [BlockType.TrigFunction]: { type: BlockType.TrigFunction, category: 'Math', math: '\\sin', doc: 'Trigonometric function', paramSpec: { mode: { type: 'select', default: 'sin', label: 'Function' } } },

  // ── Linear ──
  [BlockType.TransferFunction]: { type: BlockType.TransferFunction, category: 'Linear', math: '\\frac{N(s)}{D(s)}', doc: 'Continuous transfer function', paramSpec: { num: { type: 'array', default: [1], label: 'Numerator coefficients' }, den: { type: 'array', default: [1, 1], label: 'Denominator coefficients' } } },
  [BlockType.StateSpace]: { type: BlockType.StateSpace, category: 'Linear', math: '\\dot{x}=Ax+Bu', doc: 'State-space model', paramSpec: { A: { type: 'array', default: [0, 1, -1, -2], label: 'A matrix (row-major)' }, B: { type: 'array', default: [0, 1], label: 'B vector' }, C: { type: 'array', default: [1, 0], label: 'C vector' }, D: { type: 'array', default: [0], label: 'D value' } } },
  [BlockType.Integrator]: { type: BlockType.Integrator, category: 'Linear', math: '\\frac{1}{s}', doc: 'Integrate input signal', paramSpec: { initialValue: { type: 'number', default: 0, label: 'Initial Value' }, upperLimit: { type: 'number', default: Infinity, label: 'Upper Limit (Infinity=none)' }, lowerLimit: { type: 'number', default: -Infinity, label: 'Lower Limit (-Infinity=none)' } } },
  [BlockType.Derivative]: { type: BlockType.Derivative, category: 'Linear', math: 's', doc: 'Differentiate input signal', paramSpec: { initialValue: { type: 'number', default: 0, label: 'Initial Previous Input' } } },
  [BlockType.TransportDelay]: { type: BlockType.TransportDelay, category: 'Linear', math: 'e^{-\\tau s}', doc: 'Transport delay', paramSpec: { delayTime: { type: 'number', default: 0.1, min: 0, step: 0.01, label: 'Delay Time (s)' } } },

  // ── Discrete ──
  [BlockType.UnitDelay]: { type: BlockType.UnitDelay, category: 'Discrete', math: 'z^{-1}', doc: 'Unit delay (one sample)', paramSpec: { initialValue: { type: 'number', default: 0, label: 'Initial Value' }, sampleTime: { type: 'number', default: 0, min: 0, step: 0.01, label: 'Sample Time (s, 0 = every step)' } } },
  [BlockType.DiscreteIntegrator]: { type: BlockType.DiscreteIntegrator, category: 'Discrete', math: '\\frac{1}{1-z^{-1}}', doc: 'Discrete-time integrator', paramSpec: { method: { type: 'select', default: 'forward-euler', label: 'Integration Method' }, initialValue: { type: 'number', default: 0, label: 'Initial Value' }, sampleTime: { type: 'number', default: 0, min: 0, step: 0.01, label: 'Sample Time (s, 0 = every step)' } } },
  [BlockType.DiscreteTransferFcn]: { type: BlockType.DiscreteTransferFcn, category: 'Discrete', math: '\\frac{N(z)}{D(z)}', doc: 'Discrete transfer function', paramSpec: { num: { type: 'array', default: [1], label: 'Numerator (descending z)' }, den: { type: 'array', default: [1, -0.5], label: 'Denominator (descending z)' }, sampleTime: { type: 'number', default: 0, min: 0, step: 0.01, label: 'Sample Time (s, 0 = every step)' } } },
  [BlockType.Memory]: { type: BlockType.Memory, category: 'Discrete', math: 'M', doc: 'Hold previous input value', paramSpec: { initialValue: { type: 'number', default: 0, label: 'Initial Value' }, sampleTime: { type: 'number', default: 0, min: 0, step: 0.01, label: 'Sample Time (s, 0 = every step)' } } },

  // ── Nonlinear ──
  [BlockType.Saturation]: { type: BlockType.Saturation, category: 'Nonlinear', math: '\\text{sat}', doc: 'Saturate to [lower, upper] limits', paramSpec: { lowerLimit: { type: 'number', default: -1, label: 'Lower Limit' }, upperLimit: { type: 'number', default: 1, label: 'Upper Limit' } },
    eventG: () => {
      // Signed distance to limits — actual input is bound by compiler (Task 1.2)
      return [];
    },
  },
  [BlockType.Deadzone]: { type: BlockType.Deadzone, category: 'Nonlinear', math: '\\text{deadzone}', doc: 'Zero output within dead zone', paramSpec: { start: { type: 'number', default: -0.5, label: 'Dead Zone Start' }, end: { type: 'number', default: 0.5, label: 'Dead Zone End' } },
    eventG: () => [],
  },
  [BlockType.RateLimiter]: { type: BlockType.RateLimiter, category: 'Nonlinear', math: '\\text{rate}', doc: 'Limit rate of change', paramSpec: { risingSlew: { type: 'number', default: 1, label: 'Rising Slew Rate' }, fallingSlew: { type: 'number', default: -1, label: 'Falling Slew Rate' } },
    eventG: () => [],
  },
  [BlockType.Quantizer]: { type: BlockType.Quantizer, category: 'Nonlinear', math: 'Q', doc: 'Quantize to quantum intervals', paramSpec: { quantum: { type: 'number', default: 0.5, min: 0, step: 0.1, label: 'Quantization Interval' } },
    eventG: () => [],
  },
  [BlockType.Backlash]: { type: BlockType.Backlash, category: 'Nonlinear', math: '\\text{backlash}', doc: 'Backlash with deadband', paramSpec: { deadbandWidth: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Deadband Width' } },
    eventG: () => [],
  },

  // ── Control ──
  [BlockType.PID]: { type: BlockType.PID, category: 'Control', math: 'K_p + \\frac{K_i}{s} + K_d s', doc: 'PID controller', portLabels: ['e', 'PV'], paramSpec: { Kp: { type: 'number', default: 1, label: 'Proportional Gain (Kp)' }, Ti: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Integral Time Ti (s)' }, Td: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Derivative Time Td (s)' } } },
  [BlockType.Relay]: { type: BlockType.Relay, category: 'Control', math: '\\text{relay}', doc: 'Relay with hysteresis', paramSpec: { onValue: { type: 'number', default: 1, label: 'On Value' }, offValue: { type: 'number', default: -1, label: 'Off Value' }, switchOn: { type: 'number', default: 0.5, label: 'Switch On Threshold' }, switchOff: { type: 'number', default: -0.5, label: 'Switch Off Threshold' } },
    eventG: (_t, state, _params) => {
      // Relay state[0] holds the current output; the crossing residual is
      // the distance of the relay input to the relevant switching threshold.
      // The compiler will bind the input to this function; for the metadata
      // registry, we return an empty array as a placeholder. The actual
      // crossing detection is wired in compiler.ts (Task 1.2).
      return [state[0]];
    },
  },

  // ── Routing ──
  [BlockType.Switch]: { type: BlockType.Switch, category: 'Routing', math: '\\text{switch}', doc: 'Switch between inputs based on condition', paramSpec: { threshold: { type: 'number', default: 0, label: 'Threshold' }, condition: { type: 'select', default: 'u2>=threshold', label: 'Condition' } },
    eventG: () => [],
  },

  // ── Annotation ──
  [BlockType.Comment]: { type: BlockType.Comment, category: 'Annotation', doc: 'Annotation text block', paramSpec: { text: { type: 'text', default: 'Double-click to edit', label: 'Text' } } },
};

export function getBlockMeta(type: BlockType): BlockMetaEntry {
  return meta[type];
}