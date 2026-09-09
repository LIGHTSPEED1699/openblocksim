interface Props {
  onRun: () => void;
  onReset: () => void;
  dt: number;
  duration: number;
  onDtChange: (dt: number) => void;
  onDurationChange: (duration: number) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isRunning?: boolean;
  runStatus?: string | null;
  solverType?: 'fixed' | 'adaptive' | 'bdf';
  onSolverTypeChange?: (type: 'fixed' | 'adaptive' | 'bdf') => void;
  rtol?: number;
  atol?: number;
  onRtolChange?: (rtol: number) => void;
  onAtolChange?: (atol: number) => void;
  onExportSvg?: () => void;
  onExportPng?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAddGroup?: () => void;
}

export function Toolbar({ onRun, onReset, dt, duration, onDtChange, onDurationChange, theme, onToggleTheme, isRunning, runStatus, solverType = 'fixed', onSolverTypeChange, rtol = 1e-4, atol = 1e-6, onRtolChange, onAtolChange, onExportSvg, onExportPng, onUndo, onRedo, canUndo = false, canRedo = false, onAddGroup }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
      <button
        onClick={onRun}
        disabled={isRunning}
        className={`px-3 py-1 rounded text-sm font-medium transition-all active:scale-95 active:brightness-125 ${
          isRunning
            ? 'bg-[var(--accent)] text-white opacity-60 cursor-wait'
            : 'bg-[var(--accent)] text-white hover:opacity-80'
        }`}
      >
        {isRunning ? 'Running…' : 'Run'}
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm hover:opacity-80 active:scale-95"
      >
        Reset
      </button>
      {onAddGroup && (
        <button
          onClick={onAddGroup}
          className="px-3 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm hover:opacity-80 active:scale-95"
        >
          Group Box
        </button>
      )}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
        className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Redo
      </button>
      {runStatus && (
        <span className="text-xs text-[var(--text-secondary)] animate-pulse">
          {runStatus}
        </span>
      )}
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text-secondary)]">Solver:</label>
        <select
          value={solverType}
          onChange={(e) => onSolverTypeChange?.(e.target.value as 'fixed' | 'adaptive' | 'bdf')}
          className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
        >
          <option value="fixed">RK4 (Fixed)</option>
          <option value="adaptive">RK4(5) (Adaptive)</option>
          <option value="bdf">BDF (Stiff)</option>
        </select>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text-secondary)]">{solverType === 'adaptive' ? 'Max dt:' : 'dt:'}</label>
        <input
          type="number"
          value={dt}
          step={0.001}
          min={0.001}
          onChange={(e) => onDtChange(parseFloat(e.target.value))}
          className="w-20 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
        />
      </div>
      {solverType === 'adaptive' && (
        <>
          <div className="flex items-center gap-1">
            <label className="text-xs text-[var(--text-secondary)]">rtol:</label>
            <input
              type="number"
              value={rtol}
              step={0.0001}
              min={0}
              onChange={(e) => onRtolChange?.(parseFloat(e.target.value))}
              className="w-24 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-[var(--text-secondary)]">atol:</label>
            <input
              type="number"
              value={atol}
              step={0.000001}
              min={0}
              onChange={(e) => onAtolChange?.(parseFloat(e.target.value))}
              className="w-24 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
            />
          </div>
        </>
      )}
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text-secondary)]">Duration:</label>
        <input
          type="number"
          value={duration}
          step={1}
          min={0.1}
          onChange={(e) => onDurationChange(parseFloat(e.target.value))}
          className="w-20 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
        />
      </div>
      <div className="flex-1" />
      {(onExportSvg || onExportPng) && (
        <div className="flex items-center gap-1">
          <label className="text-xs text-[var(--text-secondary)]">Export:</label>
          {onExportSvg && (
            <button
              onClick={onExportSvg}
              className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm hover:opacity-80"
            >
              SVG
            </button>
          )}
          {onExportPng && (
            <button
              onClick={onExportPng}
              className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm hover:opacity-80"
            >
              PNG
            </button>
          )}
        </div>
      )}
      <button
        onClick={onToggleTheme}
        className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}