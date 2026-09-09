import { useState, useEffect } from 'react';
import { BlockType, type Params } from '../blocks/types';
import { getBlockMeta } from '../blocks/meta';

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

const EXPR_PREFIX = '=';

/** Numeric param input that accepts plain numbers or "="-prefixed JS expressions.
 *  Plain numbers commit parseFloat(...) live (existing behavior); expressions are
 *  stored verbatim and resolved by the engine at run start. */
function NumberField({ label, value, onCommit }: {
  label: string;
  value: number | string;
  onCommit: (v: number | string) => void;
}) {
  const initial = typeof value === 'string' ? value : String(value);
  const [text, setText] = useState(initial);
  // Resync when the selected block changes or external value changes
  useEffect(() => { setText(initial); }, [initial]);

  return (
    <div className="mb-3">
      <label className="block text-xs text-[var(--text-secondary)] mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (t.startsWith(EXPR_PREFIX)) {
            onCommit(t);
            return;
          }
          const n = parseFloat(t);
          if (!Number.isNaN(n)) onCommit(n);
        }}
        placeholder="number, or =expr"
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

  const spec = getBlockMeta(blockType)?.paramSpec ?? {};

  return (
    <div className="w-64 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">{blockType}</h3>
      {Object.entries(spec).map(([key, paramSpec]) => {
        const value = params[key] ?? paramSpec.default;
        if (paramSpec.type === 'number') {
          return (
            <NumberField
              key={key}
              label={paramSpec.label}
              value={value as number | string}
              onCommit={(v) => onUpdate(selectedBlockId, { [key]: v })}
            />
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