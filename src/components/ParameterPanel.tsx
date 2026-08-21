import { useState, useEffect } from 'react';
import { BlockType, type ParamSpec, type Params } from '../blocks/types';

const PARAM_SPECS: Record<BlockType, ParamSpec> = {
  [BlockType.Constant]: { value: { type: 'number', default: 1, label: 'Value' } },
  [BlockType.Step]: {
    stepTime: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Step Time' },
    stepValue: { type: 'number', default: 1, label: 'Step Value' },
  },
  [BlockType.Ramp]: {
    startTime: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Start Time' },
    slope: { type: 'number', default: 1, label: 'Slope' },
  },
  [BlockType.Sine]: {
    amplitude: { type: 'number', default: 1, label: 'Amplitude' },
    frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' },
    phase: { type: 'number', default: 0, label: 'Phase (rad)' },
    bias: { type: 'number', default: 0, label: 'Bias (DC offset)' },
  },
  [BlockType.Square]: {
    amplitude: { type: 'number', default: 1, label: 'Amplitude' },
    frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' },
    phase: { type: 'number', default: 0, label: 'Phase (rad)' },
  },
  [BlockType.Scope]: {},
  [BlockType.ToWorkspace]: {},
  [BlockType.Sum]: {
    inputCount: { type: 'number', default: 2, min: 2, max: 8, step: 1, label: 'Input Count' },
    signs: { type: 'array', default: [1, 1], label: 'Signs (1 or -1)' },
  },
  [BlockType.Gain]: { gain: { type: 'number', default: 1, label: 'Gain' } },
  [BlockType.Product]: {
    inputCount: { type: 'number', default: 2, min: 2, max: 4, step: 1, label: 'Input Count' },
    operators: { type: 'text', default: '*,*', label: 'Operators (* or /, comma-separated)' },
  },
  [BlockType.TransferFunction]: {
    num: { type: 'array', default: [1], label: 'Numerator coefficients' },
    den: { type: 'array', default: [1, 1], label: 'Denominator coefficients' },
  },
  [BlockType.StateSpace]: {
    A: { type: 'array', default: [0, 1, -1, -2], label: 'A matrix (row-major)' },
    B: { type: 'array', default: [0, 1], label: 'B vector' },
    C: { type: 'array', default: [1, 0], label: 'C vector' },
    D: { type: 'array', default: [0], label: 'D value' },
  },
  [BlockType.Integrator]: {
    initialValue: { type: 'number', default: 0, label: 'Initial Value' },
    upperLimit: { type: 'number', default: Infinity, label: 'Upper Limit (Infinity=none)' },
    lowerLimit: { type: 'number', default: -Infinity, label: 'Lower Limit (-Infinity=none)' },
  },
  [BlockType.Derivative]: { initialValue: { type: 'number', default: 0, label: 'Initial Previous Input' } },
  [BlockType.TransportDelay]: { delayTime: { type: 'number', default: 0.1, min: 0, step: 0.01, label: 'Delay Time (s)' } },
  [BlockType.Saturation]: {
    lowerLimit: { type: 'number', default: -1, label: 'Lower Limit' },
    upperLimit: { type: 'number', default: 1, label: 'Upper Limit' },
  },
  [BlockType.Deadzone]: {
    start: { type: 'number', default: -0.5, label: 'Dead Zone Start' },
    end: { type: 'number', default: 0.5, label: 'Dead Zone End' },
  },
  [BlockType.PID]: {
    Kp: { type: 'number', default: 1, label: 'Proportional Gain (Kp)' },
    Ti: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Integral Time Ti (s)' },
    Td: { type: 'number', default: 0, min: 0, step: 0.1, label: 'Derivative Time Td (s)' },
  },
  [BlockType.Relay]: {
    onValue: { type: 'number', default: 1, label: 'On Value' },
    offValue: { type: 'number', default: -1, label: 'Off Value' },
    switchOn: { type: 'number', default: 0.5, label: 'Switch On Threshold' },
    switchOff: { type: 'number', default: -0.5, label: 'Switch Off Threshold' },
  },
  [BlockType.Comment]: {
    text: { type: 'text', default: 'Double-click to edit', label: 'Text' },
  },
  [BlockType.Abs]: {},
  [BlockType.Sign]: {},
  [BlockType.Bias]: { bias: { type: 'number', default: 0, label: 'Bias' } },
  [BlockType.UnaryMinus]: {},
  [BlockType.Divide]: {},
  [BlockType.MinMax]: {
    mode: { type: 'select', default: 'min', label: 'Mode' },
  },
  [BlockType.RoundingFunction]: {
    mode: { type: 'select', default: 'round', label: 'Rounding Mode' },
  },
  [BlockType.MathFunction]: {
    mode: { type: 'select', default: 'exp', label: 'Function' },
    exponent: { type: 'number', default: 2, label: 'Exponent (power mode)' },
  },
  [BlockType.TrigFunction]: {
    mode: { type: 'select', default: 'sin', label: 'Function' },
  },
  [BlockType.Switch]: {
    threshold: { type: 'number', default: 0, label: 'Threshold' },
    condition: { type: 'select', default: 'u2>=threshold', label: 'Condition' },
  },
  [BlockType.UnitDelay]: { initialValue: { type: 'number', default: 0, label: 'Initial Value' } },
  [BlockType.DiscreteIntegrator]: {
    method: { type: 'select', default: 'forward-euler', label: 'Integration Method' },
    initialValue: { type: 'number', default: 0, label: 'Initial Value' },
  },
  [BlockType.DiscreteTransferFcn]: {
    num: { type: 'array', default: [1], label: 'Numerator (descending z)' },
    den: { type: 'array', default: [1, -0.5], label: 'Denominator (descending z)' },
  },
  [BlockType.Memory]: { initialValue: { type: 'number', default: 0, label: 'Initial Value' } },
  [BlockType.RateLimiter]: {
    risingSlew: { type: 'number', default: 1, label: 'Rising Slew Rate' },
    fallingSlew: { type: 'number', default: -1, label: 'Falling Slew Rate' },
  },
  [BlockType.Quantizer]: { quantum: { type: 'number', default: 0.5, min: 0, step: 0.1, label: 'Quantization Interval' } },
  [BlockType.Backlash]: { deadbandWidth: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Deadband Width' } },
  [BlockType.PulseGenerator]: {
    amplitude: { type: 'number', default: 1, label: 'Amplitude' },
    period: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Period (s)' },
    dutyCycle: { type: 'number', default: 50, min: 0, max: 100, step: 1, label: 'Duty Cycle (%)' },
    phaseDelay: { type: 'number', default: 0, label: 'Phase Delay (s)' },
  },
  [BlockType.Clock]: {},
  [BlockType.ChirpSignal]: {
    amplitude: { type: 'number', default: 1, label: 'Amplitude' },
    startFreq: { type: 'number', default: 0.1, min: 0, step: 0.1, label: 'Start Frequency (Hz)' },
    targetFreq: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Target Frequency (Hz)' },
    sweepTime: { type: 'number', default: 10, min: 0, step: 0.1, label: 'Sweep Time (s)' },
  },
  [BlockType.RepeatingSequence]: {
    timeValues: { type: 'array', default: [0, 1, 2, 3], label: 'Time Values' },
    outputValues: { type: 'array', default: [0, 1, 0, 1], label: 'Output Values' },
  },
  [BlockType.RandomNumber]: {
    mean: { type: 'number', default: 0, label: 'Mean' },
    stdDev: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Standard Deviation' },
    seed: { type: 'number', default: 0, label: 'Seed (0=random)' },
  },
  [BlockType.Terminator]: {},
  [BlockType.Display]: {},
  [BlockType.StopSimulation]: {},
};

interface Props {
  selectedBlockId: string | null;
  blockType: BlockType | null;
  params: Params;
  onUpdate: (id: string, params: Params) => void;
}

/** Uncontrolled array input — keeps local text state, commits to store on blur/Enter. */
function ArrayInput({ label, value, onCommit }: {
  label: string;
  value: unknown;
  onCommit: (arr: number[]) => void;
}) {
  const initial = Array.isArray(value) ? value.join(', ') : String(value);
  const [text, setText] = useState(initial);

  // Resync when the selected block changes or external value changes
  useEffect(() => { setText(initial); }, [initial]);

  const commit = () => {
    const parts = text.split(',').map((s) => s.trim());
    const arr = parts.map((s) => parseFloat(s)).filter((n) => !isNaN(n));
    if (arr.length > 0) {
      onCommit(arr);
    } else {
      // Revert to previous valid value
      setText(initial);
    }
  };

  return (
    <div className="mb-3">
      <label className="block text-xs text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
      />
    </div>
  );
}

export function ParameterPanel({ selectedBlockId, blockType, params, onUpdate }: Props) {
  if (!selectedBlockId || !blockType) {
    return (
      <div className="w-64 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4">
        <p className="text-[var(--text-secondary)] text-sm">No block selected</p>
      </div>
    );
  }

  const spec = PARAM_SPECS[blockType];

  return (
    <div className="w-64 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">{blockType}</h3>
      {Object.entries(spec).map(([key, paramSpec]) => {
        const value = params[key] ?? paramSpec.default;
        if (paramSpec.type === 'number') {
          return (
            <div key={key} className="mb-3">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">{paramSpec.label}</label>
              <input
                type="number"
                value={value as number}
                min={paramSpec.min}
                max={paramSpec.max}
                step={paramSpec.step ?? 'any'}
                onChange={(e) => onUpdate(selectedBlockId, { [key]: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
              />
            </div>
          );
        }
        if (paramSpec.type === 'array') {
          return (
            <ArrayInput
              key={key}
              label={paramSpec.label}
              value={value}
              onCommit={(arr) => onUpdate(selectedBlockId, { [key]: arr })}
            />
          );
        }
        if (paramSpec.type === 'text') {
          return (
            <div key={key} className="mb-3">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">{paramSpec.label}</label>
              <textarea
                value={value as string}
                rows={3}
                onChange={(e) => onUpdate(selectedBlockId, { [key]: e.target.value })}
                className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)] resize-y"
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}