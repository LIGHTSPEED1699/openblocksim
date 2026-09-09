import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import { BlockType, Params } from '../blocks/types';
import type { SolverStats } from '../engine/types';
import { pushEntry, sameDoc, snapshotDoc, type DiagramDoc, type HistoryEntry } from './history';
import { GroupBox, GroupBoxRect, GROUP_BOX_COLORS, GROUP_BOX_MIN_WIDTH, GROUP_BOX_MIN_HEIGHT, groupMemberIds } from '../utils/groups';
import { subsystemizeGroup } from '../utils/subsystemize';

type SerializedGraphLike = { blocks: { id: string; type: unknown; params: unknown; position: unknown }[]; edges: unknown[] };

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
  groups: GroupBox[];
  selectedGroupId: string | null;

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
  flipNode: (id: string) => void;
  setGroups: (groups: GroupBox[]) => void;
  addGroup: (init?: Partial<GroupBoxRect>) => void;
  moveGroupTo: (id: string, x: number, y: number) => void;
  resizeGroup: (id: string, patch: Partial<GroupBoxRect>) => void;
  deleteGroup: (id: string) => void;
  convertGroupToSubsystem: (groupId: string) => void;
  selectGroup: (id: string | null) => void;
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

function docToState(doc: DiagramDoc): { nodes: Node[]; edges: Edge[]; params: Record<string, Params>; groups: GroupBox[] } {
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
    groups: doc.groups,
  };
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set, get) => {
      const currentDoc = (): DiagramDoc => {
        const s = get();
        return snapshotDoc(s.nodes, s.edges, s.params, s.groups);
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
        set({ ...docToState(doc), selectedBlockId: null, selectedGroupId: null });
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
        groups: [],
        selectedGroupId: null,
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
        selectBlock: (id) => set((state) => ({ selectedBlockId: id, selectedGroupId: id === null ? state.selectedGroupId : null })),
        // Feature H R-H2: mirror the node horizontally (swap input/output handle
        // sides). The flag lives on node.data so persist + JSON round-trip carry
        // it for free (exportImport adds the field explicitly in Task T5).
        flipNode: (id) => {
          const before = currentDoc();
          set((state) => ({
            nodes: state.nodes.map((n) =>
              n.id === id
                ? { ...n, data: { ...n.data, flipped: !Boolean((n.data as { flipped?: boolean })?.flipped) } }
                : n,
            ),
          }));
          recordMutation(before, currentDoc());
        },
        setGroups: (groups) => {
          const before = currentDoc();
          set({ groups });
          recordMutation(before, currentDoc());
        },
        addGroup: (init) => {
          const before = currentDoc();
          set((state) => {
            const n = state.groups.length;
            const x = init?.x ?? 60 + (n % 6) * 28;
            const y = init?.y ?? 60 + (n % 6) * 28;
            const group: GroupBox = {
              id: `grp-${Date.now()}-${n}`,
              name: `Group ${n + 1}`,
              color: GROUP_BOX_COLORS[n % GROUP_BOX_COLORS.length],
              x,
              y,
              width: Math.max(GROUP_BOX_MIN_WIDTH, init?.width ?? 280),
              height: Math.max(GROUP_BOX_MIN_HEIGHT, init?.height ?? 180),
            };
            return { groups: [...state.groups, group] };
          });
          recordMutation(before, currentDoc());
        },
        moveGroupTo: (id, x, y) => {
          const before = currentDoc();
          set((state) => {
            const g = state.groups.find((gr) => gr.id === id);
            if (!g) return state;
            const dx = x - g.x;
            const dy = y - g.y;
            if (dx === 0 && dy === 0) return state;
            const members = new Set(groupMemberIds(g, state.nodes));
            return {
              groups: state.groups.map((gr) => (gr.id === id ? { ...gr, x, y } : gr)),
              nodes: state.nodes.map((n) =>
                members.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
              ),
            };
          });
          recordMutation(before, currentDoc());
        },
        resizeGroup: (id, patch) => {
          const before = currentDoc();
          set((state) => ({
            groups: state.groups.map((gr) =>
              gr.id === id
                ? {
                    ...gr,
                    x: patch.x ?? gr.x,
                    y: patch.y ?? gr.y,
                    width: Math.max(GROUP_BOX_MIN_WIDTH, patch.width ?? gr.width),
                    height: Math.max(GROUP_BOX_MIN_HEIGHT, patch.height ?? gr.height),
                  }
                : gr,
            ),
          }));
          recordMutation(before, currentDoc());
        },
        deleteGroup: (id) => {
          const before = currentDoc();
          set((state) => {
            const g = state.groups.find((gr) => gr.id === id);
            if (!g) return state;
            const members = new Set(groupMemberIds(g, state.nodes));
            return {
              groups: state.groups.filter((gr) => gr.id !== id),
              nodes: state.nodes.filter((n) => !members.has(n.id)),
              edges: state.edges.filter((e) => !members.has(e.source) && !members.has(e.target)),
              params: Object.fromEntries(Object.entries(state.params).filter(([k]) => !members.has(k))),
              selectedGroupId: state.selectedGroupId === id ? null : state.selectedGroupId,
              selectedBlockId: members.has(state.selectedBlockId ?? '') ? null : state.selectedBlockId,
            };
          });
          recordMutation(before, currentDoc());
        },
        convertGroupToSubsystem: (groupId) => {
          const before = currentDoc();
          set((state) => {
            const group = state.groups.find((g) => g.id === groupId);
            if (!group) return state;
            const members = new Set(groupMemberIds(group, state.nodes));
            const res = subsystemizeGroup(group, state.nodes, state.edges);
            // The fold is params-free (nodes carry only data.type); merge the
            // store's real member params in before persisting the inner graph.
            const withParams = (() => {
              const parsed = JSON.parse(res.subsystemJson) as SerializedGraphLike;
              parsed.blocks = parsed.blocks.map((b) => ({ ...b, params: state.params[b.id] ?? b.params }));
              return JSON.stringify(parsed);
            })();
            return {
              groups: state.groups.filter((g) => g.id !== groupId),
              nodes: res.newNodes,
              edges: res.newEdges,
              params: {
                ...Object.fromEntries(Object.entries(state.params).filter(([k]) => !members.has(k))),
                [res.subsystemNode.id]: { subsystem: withParams },
              },
              selectedGroupId: null,
              selectedBlockId: null,
            };
          });
          recordMutation(before, currentDoc());
        },
        selectGroup: (id) => {
          const before = currentDoc();
          set((state) => ({ selectedGroupId: id, selectedBlockId: id === null ? state.selectedBlockId : null }));
          recordMutation(before, currentDoc());
        },
        setSimResults: (results) => set({ simResults: results, simError: null }),
        setSimError: (error) => set({ simError: error, simResults: null }),
        setSimConfig: (config) =>
          set((state) => ({ simConfig: { ...state.simConfig, ...config } })),
        toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
        clear: () =>
          set({
            nodes: [], edges: [], params: {}, selectedBlockId: null,
            groups: [], selectedGroupId: null,
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
        groups: state.groups,
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
