import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import { BlockType, Params } from '../blocks/types';

interface SimConfig {
  dt: number;
  duration: number;
}

interface SimResults {
  time: number[];
  scopes: Record<string, number[]>;
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
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      params: {},
      selectedBlockId: null,
      simResults: null,
      simConfig: { dt: 0.01, duration: 10 },
      simError: null,
      theme: 'dark',

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      addNode: (node, _type, params) =>
        set((state) => ({
          nodes: [...state.nodes, node],
          params: { ...state.params, [node.id]: params },
        })),
      removeNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          params: Object.fromEntries(Object.entries(state.params).filter(([k]) => k !== id)),
          selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
        })),
      updateParams: (id, params) =>
        set((state) => ({
          params: { ...state.params, [id]: { ...state.params[id], ...params } },
        })),
      selectBlock: (id) => set({ selectedBlockId: id }),
      setSimResults: (results) => set({ simResults: results, simError: null }),
      setSimError: (error) => set({ simError: error, simResults: null }),
      setSimConfig: (config) =>
        set((state) => ({ simConfig: { ...state.simConfig, ...config } })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      clear: () => set({ nodes: [], edges: [], params: {}, selectedBlockId: null, simResults: null, simError: null }),
    }),
    {
      name: 'openblocksim-store',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        params: state.params,
        simConfig: state.simConfig,
        theme: state.theme,
      }),
    }
  )
);