import { useEffect } from 'react';
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

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const selectedNode = nodes.find((n) => n.id === selectedBlockId);
  const selectedType = (selectedNode?.data?.type as BlockType | undefined) ?? null;
  const selectedParams = selectedBlockId ? params[selectedBlockId] ?? {} : {};

  const handleRun = () => {
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
      } else if (result.type === 'error') {
        setSimError(result.message);
      }
      worker.terminate();
    };
    worker.onerror = (e) => {
      setSimError(e.message || 'Worker error');
      worker.terminate();
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
      <PlotArea />
      <div className="flex gap-2 px-4 py-1 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-xs">
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
      </div>
    </div>
  );
}