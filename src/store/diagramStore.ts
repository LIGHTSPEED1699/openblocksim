import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import { BlockType, Params } from '../blocks/types';
import type { SolverStats } from '../engine/types';
import { pushEntry, sameDoc, snapshotDoc, type DiagramDoc, type HistoryEntry } from './history';

interface SimConfig {
  dt: number;
  duration: number;
  solverType?: 'fixed' | 'adaptive' | 'bdf';
  rtol?: number;
  atol?: number;
  maxStep?: number;
}

interface SimResults {
  time: number[];
  scopes: Record<string, number[]>;
  stats?: SolverStats;
  actualSteps?: number;
  crossingTimes?: number[];
}

interface DiagramState {
  nodes: Node[];
  edges: Edge[];
  params: Record<string, Params>;
  selectedBlockId: string | null;
  simResults: SimResults | null;
  simConfig: SimConfig;
  simError: string | null;
  theme: 'dark' | 'light';

  /** Undo/redo history (session-transient — excluded from persist via partialize). */
  past: HistoryEntry[];
  future: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node, _type: BlockType, params: Params) => void;
  removeNode: (id: string) => void;
  updateParams: (id: string, params: Params) => void;
  selectBlock: (id: string | null) => void;
  setSimResults: (results: SimResults | null) => void;
  setSimError: (error: string | null) => void;
  setSimConfig: (config: Partial<SimConfig>) => void;
  toggleTheme: () => void;
  clear: () => void;
  clearHistory: () => void;
  undo: () => void;
  redo: () => void;
  beginCoalesce: () => void;
  endCoalesce: () => void;
}

function docToState(doc: DiagramDoc): { nodes: Node[]; edges: Edge[]; params: Record<string, Params> } {
  return {
    nodes: doc.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: n.data,
    })),
    edges: doc.edges.map((e) => ({
      id: e.id,
      type: e.type,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      data: e.data,
    })),
    params: doc.params,
  };
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set, get) => {
      const currentDoc = (): DiagramDoc => {
        const s = get();
        return snapshotDoc(s.nodes, s.edges, s.params);
      };

      /** Coalescing window (gesture in progress). Kept in the closure: never persisted. */
      let coalesceOpen = false;
      let coalesceBefore: DiagramDoc | null = null;

      const recordMutation = (before: DiagramDoc, after: DiagramDoc, key?: string) => {
        if (sameDoc(before, after)) return;
        if (coalesceOpen) return; // absorbed into the open window; endCoalesce commits it
        const s = get();
        const top = s.past[s.past.length - 1];
        if (key !== undefined && top && top.key === key) {
          // Typing coalescing: extend the previous entry's "after" in place.
          set({ past: [...s.past.slice(0, -1), { ...top, after }], future: [], canUndo: true, canRedo: false });
          return;
        }
        const entry: HistoryEntry = { before, after, key };
        const past = pushEntry(s.past, entry);
        set({ past, future: [], canUndo: past.length > 0, canRedo: false });
      };

      const applyDoc = (doc: DiagramDoc) => {
        set({ ...docToState(doc), selectedBlockId: null });
      };

      return {
        nodes: [],
        edges: [],
        params: {},
        selectedBlockId: null,
        simResults: null,
        simConfig: { dt: 0.01, duration: 10 },
        simError: null,
        theme: 'dark',
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,

        setNodes: (nodes) => {
          const before = currentDoc();
          set({ nodes });
          recordMutation(before, currentDoc());
        },
        setEdges: (edges) => {
          const before = currentDoc();
          set({ edges });
          recordMutation(before, currentDoc());
        },
        addNode: (node, _type, params) => {
          const before = currentDoc();
          set((state) => ({
            nodes: [...state.nodes, node],
            params: { ...state.params, [node.id]: params },
          }));
          recordMutation(before, currentDoc());
        },
        removeNode: (id) => {
          const before = currentDoc();
          set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
            params: Object.fromEntries(Object.entries(state.params).filter(([k]) => k !== id)),
            selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
          }));
          recordMutation(before, currentDoc());
        },
        updateParams: (id, params) => {
          const before = currentDoc();
          set((state) => ({
            params: { ...state.params, [id]: { ...state.params[id], ...params } },
          }));
          recordMutation(before, currentDoc(), `param:${id}:${Object.keys(params).sort().join(',')}`);
        },
        selectBlock: (id) => set({ selectedBlockId: id }),
        setSimResults: (results) => set({ simResults: results, simError: null }),
        setSimError: (error) => set({ simError: error, simResults: null }),
        setSimConfig: (config) =>
          set((state) => ({ simConfig: { ...state.simConfig, ...config } })),
        toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
        clear: () =>
          set({
            nodes: [], edges: [], params: {}, selectedBlockId: null,
            simResults: null, simError: null,
            past: [], future: [], canUndo: false, canRedo: false,
          }),
        clearHistory: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
        beginCoalesce: () => {
          if (coalesceOpen) return;
          coalesceOpen = true;
          coalesceBefore = currentDoc();
        },
        endCoalesce: () => {
          if (!coalesceOpen) return;
          coalesceOpen = false;
          const before = coalesceBefore;
          coalesceBefore = null;
          if (before === null) return;
          recordMutation(before, currentDoc());
        },
        undo: () => {
          coalesceOpen = false;
          coalesceBefore = null;
          const s = get();
          const entry = s.past[s.past.length - 1];
          if (!entry) return;
          applyDoc(entry.before);
          set({
            past: s.past.slice(0, -1),
            future: [...s.future, entry],
            canUndo: s.past.length - 1 > 0,
            canRedo: true,
          });
        },
        redo: () => {
          coalesceOpen = false;
          coalesceBefore = null;
          const s = get();
          const entry = s.future[s.future.length - 1];
          if (!entry) return;
          applyDoc(entry.after);
          set({
            past: pushEntry(s.past, entry),
            future: s.future.slice(0, -1),
            canUndo: true,
            canRedo: s.future.length - 1 > 0,
          });
        },
      };
    },
    {
      name: 'openblocksim-store',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        params: state.params,
        simConfig: state.simConfig,
        theme: state.theme,
      }),
      onRehydrateStorage: (state: DiagramState) => {
        if (!state.edges) return;
        state.edges = state.edges.map((edge: Edge) =>
          edge.type !== 'straight'
            ? {
                ...edge,
                type: 'straight',
                data: { ...(edge.data as Record<string, unknown>), waypoints: (edge.data as Record<string, unknown>)?.waypoints ?? [] },
              }
            : edge,
        );
      },
    }
  )
);
