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
  },
  [BlockType.Square]: {
    amplitude: { type: 'number', default: 1, label: 'Amplitude' },
    frequency: { type: 'number', default: 1, min: 0, step: 0.1, label: 'Frequency (Hz)' },
    phase: { type: 'number', default: 0, label: 'Phase (rad)' },
  },
  [BlockType.Scope]: {},
  [BlockType.ToWorkspace]: {},
  [BlockType.Sum]: { signs: { type: 'array', default: [1, 1], label: 'Signs (1 or -1)' } },
  [BlockType.Gain]: { gain: { type: 'number', default: 1, label: 'Gain' } },
  [BlockType.Product]: {},
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
  [BlockType.Integrator]: { initialValue: { type: 'number', default: 0, label: 'Initial Value' } },
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
        return null;
      })}
    </div>
  );
}