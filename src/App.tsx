import { useEffect, useState, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useDiagramStore } from './store/diagramStore';
import { BlockLibrary } from './components/BlockLibrary';
import { DiagramCanvas } from './components/DiagramCanvas';
import { ParameterPanel } from './components/ParameterPanel';
import { Toolbar } from './components/Toolbar';
import { PlotArea } from './components/PlotArea';
import { exportModel, importModel } from './utils/exportImport';
import type { WorkerMessage } from './engine/types';
import type { BlockType } from './blocks/types';

function parsePort(handle: string | null | undefined): number {
  if (!handle) return 0;
  const parts = handle.split('-');
  const n = parseInt(parts[parts.length - 1], 10);
  return isNaN(n) ? 0 : n;
}

export default function App() {
  const selectedBlockId = useDiagramStore((s) => s.selectedBlockId);
  const nodes = useDiagramStore((s) => s.nodes);
  const params = useDiagramStore((s) => s.params);
  const simConfig = useDiagramStore((s) => s.simConfig);
  const theme = useDiagramStore((s) => s.theme);
  const updateParams = useDiagramStore((s) => s.updateParams);
  const setSimResults = useDiagramStore((s) => s.setSimResults);
  const setSimError = useDiagramStore((s) => s.setSimError);
  const setSimConfig = useDiagramStore((s) => s.setSimConfig);
  const toggleTheme = useDiagramStore((s) => s.toggleTheme);
  const clear = useDiagramStore((s) => s.clear);

  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runRevision, setRunRevision] = useState(0);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    if (!showNewMenu) return;
    const handler = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewMenu]);

  const handleNew = () => {
    setShowNewMenu(true);
  };

  const handleNewConfirm = (exportFirst: boolean) => {
    setShowNewMenu(false);
    if (exportFirst) {
      exportModel();
    }
    clear();
  };

  const selectedNode = nodes.find((n) => n.id === selectedBlockId);
  const selectedType = (selectedNode?.data?.type as BlockType | undefined) ?? null;
  const selectedParams = selectedBlockId ? params[selectedBlockId] ?? {} : {};

  const handleRun = () => {
    setIsRunning(true);
    setRunStatus('Running…');

    const store = useDiagramStore.getState();
    const graph = {
      blocks: store.nodes.map((n) => ({
        id: n.id,
        type: n.data?.type as BlockType,
        params: store.params[n.id] ?? {},
        position: n.position,
      })),
      edges: store.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourcePort: parsePort(e.sourceHandle),
        target: e.target,
        targetPort: parsePort(e.targetHandle),
      })),
    };

    const worker = new Worker(new URL('./engine/worker.ts', import.meta.url), { type: 'module' });
    const msg: WorkerMessage = {
      type: 'run',
      graph,
      dt: store.simConfig.dt,
      duration: store.simConfig.duration,
    };
    worker.postMessage(msg);
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const result = e.data;
      if (result.type === 'done') {
        setSimResults(result.results);
        setRunStatus(`Done — ${result.results.time.length} steps`);
        setRunRevision((r) => r + 1);
      } else if (result.type === 'error') {
        setSimError(result.message);
        setRunStatus('Error');
      }
      worker.terminate();
      setIsRunning(false);
      setTimeout(() => setRunStatus(null), 3000);
    };
    worker.onerror = (e) => {
      setSimError(e.message || 'Worker error');
      setRunStatus('Error');
      worker.terminate();
      setIsRunning(false);
      setTimeout(() => setRunStatus(null), 3000);
    };
  };

  const handleReset = () => {
    setSimResults(null);
    setSimError(null);
  };

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onRun={handleRun}
        onReset={handleReset}
        dt={simConfig.dt}
        duration={simConfig.duration}
        onDtChange={(dt) => setSimConfig({ dt })}
        onDurationChange={(duration) => setSimConfig({ duration })}
        theme={theme}
        onToggleTheme={toggleTheme}
        isRunning={isRunning}
        runStatus={runStatus}
      />
      <div className="flex flex-1 overflow-hidden">
        <BlockLibrary onDragStart={() => {}} />
        <ReactFlowProvider>
          <DiagramCanvas />
        </ReactFlowProvider>
        <ParameterPanel
          selectedBlockId={selectedBlockId}
          blockType={selectedType}
          params={selectedParams}
          onUpdate={updateParams}
        />
      </div>
      <PlotArea revision={runRevision} />
      <div className="flex items-center gap-2 px-4 py-1 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-xs">
        <div ref={newMenuRef} className="relative">
          <button
            onClick={handleNew}
            className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:opacity-80"
          >
            New
          </button>
          {showNewMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded shadow-lg py-1 z-50 min-w-[240px]">
              <div className="px-3 py-2 text-[var(--text-secondary)]">
                Export current model before clearing?
              </div>
              <button
                onClick={() => handleNewConfirm(true)}
                className="block w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                Export, then clear
              </button>
              <button
                onClick={() => handleNewConfirm(false)}
                className="block w-full text-left px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              >
                Clear without exporting
              </button>
              <button
                onClick={() => setShowNewMenu(false)}
                className="block w-full text-left px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <button
          onClick={exportModel}
          className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:opacity-80"
        >
          Export
        </button>
        <label className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:opacity-80 cursor-pointer">
          Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importModel(file).catch((err: unknown) => setSimError(String(err)));
              e.target.value = '';
            }}
          />
        </label>
        <div className="flex-1" />
        <a
          href="https://hongbinli.ca/tools/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--accent)] underline-offset-2 hover:underline"
        >
          ← Back to Tools
        </a>
      </div>
    </div>
  );
}