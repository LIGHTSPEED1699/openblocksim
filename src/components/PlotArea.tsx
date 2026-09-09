import Plot from 'react-plotly.js';
import { useDiagramStore } from '../store/diagramStore';
import type { SolverStats } from '../engine/types';

interface Props {
  revision?: number;
}

function fmtStep(v: number): string {
  if (!isFinite(v)) return '∞';
  if (v === 0) return '0';
  const e = Math.abs(v) >= 0.001 && Math.abs(v) < 1000 ? v.toPrecision(4) : v.toExponential(2);
  return e;
}

function SolverStatsBar({ stats }: { stats: SolverStats }) {
  const items = [
    `accepted ${stats.acceptedSteps}`,
    `rejected ${stats.rejectedSteps}`,
    `min step ${fmtStep(stats.minStep)}s`,
    `max step ${fmtStep(stats.maxStep)}s`,
    `RHS evals ${stats.rhsEvals}`,
    `${stats.wallMs} ms`,
  ];
  return (
    <div className="text-[11px] text-[var(--text-secondary)] px-3 pt-1 select-none">
      Solver report: {items.join(' · ')}
    </div>
  );
}

export function PlotArea({ revision = 0 }: Props) {
  const simResults = useDiagramStore((s) => s.simResults);
  const simError = useDiagramStore((s) => s.simError);
  const nodes = useDiagramStore((s) => s.nodes);

  const stats = simResults?.stats;

  if (simError) {
    return (
      <div className="h-48 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-center">
        <p className="text-red-400 text-sm">{simError}</p>
      </div>
    );
  }

  if (!simResults) {
    return (
      <div className="h-48 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)] text-sm">Run a simulation to see plots</p>
      </div>
    );
  }

  const scopeNodes = nodes.filter((n) => n.data?.type === 'Scope');

  if (scopeNodes.length === 0) {
    return (
      <div className="h-48 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex flex-col justify-center">
        {stats && <SolverStatsBar stats={stats} />}
        <div className="flex items-center justify-center flex-1">
          <p className="text-[var(--text-secondary)] text-sm">No Scope blocks in diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex flex-col">
      {stats && <SolverStatsBar stats={stats} />}
      <div className="flex-1 flex gap-2 p-2 overflow-x-auto">
        {scopeNodes.map((node) => {
          const trace = simResults.scopes[node.id] ?? [];
          return (
            <Plot
              key={`${node.id}-${revision}`}
              data={[
                {
                  x: simResults.time,
                  y: trace,
                  type: 'scatter',
                  mode: 'lines',
                  name: node.id,
                  line: { color: '#3b82f6', width: 2 },
                },
              ]}
              layout={{
                title: { text: `Scope: ${node.id}`, font: { size: 12 } },
                xaxis: { title: 'Time (s)', gridcolor: '#475569' },
                yaxis: { gridcolor: '#475569' },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#f1f5f9' },
                margin: { t: 30, b: 30, l: 40, r: 10 },
              }}
              style={{ width: '300px', height: '100%' }}
              config={{ responsive: true, displayModeBar: false }}
            />
          );
        })}
      </div>
    </div>
  );
}
