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
  solverType?: 'fixed' | 'adaptive';
  onSolverTypeChange?: (type: 'fixed' | 'adaptive') => void;
  rtol?: number;
  atol?: number;
  onRtolChange?: (rtol: number) => void;
  onAtolChange?: (atol: number) => void;
}

export function Toolbar({ onRun, onReset, dt, duration, onDtChange, onDurationChange, theme, onToggleTheme, isRunning, runStatus, solverType = 'fixed', onSolverTypeChange, rtol = 1e-4, atol = 1e-6, onRtolChange, onAtolChange }: Props) {
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
      {runStatus && (
        <span className="text-xs text-[var(--text-secondary)] animate-pulse">
          {runStatus}
        </span>
      )}
      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text-secondary)]">Solver:</label>
        <select
          value={solverType}
          onChange={(e) => onSolverTypeChange?.(e.target.value as 'fixed' | 'adaptive')}
          className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border-color)]"
        >
          <option value="fixed">RK4 (Fixed)</option>
          <option value="adaptive">RK4(5) (Adaptive)</option>
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
      <button
        onClick={onToggleTheme}
        className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}