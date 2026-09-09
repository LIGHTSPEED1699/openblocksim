import { BlockType } from '../blocks/types';
import { useDiagramStore } from '../store/diagramStore';
import { getPaletteGroups } from '../blocks/palette';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Accent stripe color per category (unchanged from the old BLOCK_GROUPS accents).
const GROUP_ACCENT: Record<string, string> = {
  Source: 'border-l-green-500',
  Sink: 'border-l-blue-500',
  Math: 'border-l-orange-500',
  Linear: 'border-l-purple-500',
  Discrete: 'border-l-indigo-500',
  Nonlinear: 'border-l-red-500',
  Control: 'border-l-teal-500',
  Routing: 'border-l-cyan-500',
  Annotation: 'border-l-amber-500',
};

// Only meta entries WITHOUT a math string and NOT using a themed PNG icon need
// a glyph fallback. Today that is just Comment (Scope is an image, below).
const FALLBACK_GLYPHS: Partial<Record<BlockType, string>> = {
  [BlockType.Comment]: '📝',
};

interface Props {
  onDragStart: (type: BlockType) => void;
}

export function BlockLibrary({ onDragStart }: Props) {
  const theme = useDiagramStore((s) => s.theme);
  const isImageBlock = (type: BlockType) => type === BlockType.Scope || type === BlockType.Step;
  const imageFor = (type: BlockType) => {
    const dark = theme === 'dark';
    if (type === BlockType.Scope) return dark ? '/scope-icon-dark.png' : '/scope-icon.png';
    return dark ? '/step-icon-dark.png' : '/step-icon.png'; // Step
  };

  return (
    <div className="w-44 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] overflow-y-auto p-2">
      {getPaletteGroups().map(({ category, label, entries }) => (
        <div key={label} className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">{label}</h3>
          {entries.map(({ type, math, doc }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', type);
                onDragStart(type);
              }}
              title={doc ?? type}
              className={`flex items-center gap-2 ${GROUP_ACCENT[category] ?? 'border-l-slate-500'} border-l-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm rounded-r px-2 py-1 mb-1 cursor-grab hover:opacity-80 transition-opacity select-none`}
            >
              {isImageBlock(type) ? (
                <img src={imageFor(type)} alt={type} className="w-5 h-5" />
              ) : math ? (
                <span className="text-base leading-none text-[var(--text-primary)]">
                  <InlineMath math={math} />
                </span>
              ) : (
                <span className="font-mono text-base">{FALLBACK_GLYPHS[type] ?? type}</span>
              )}
              <span className="text-xs text-[var(--text-secondary)]">{type}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
