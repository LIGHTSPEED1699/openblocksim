import type { XYPosition } from '@xyflow/react';

export interface WireGestureState {
  active: boolean;
  source: { nodeId: string; handleId: string } | null;
  planted: XYPosition[];
  cursor: XYPosition | null;
  pointerId: number | null;
  completed: boolean;
}

type Listener = () => void;

let state: WireGestureState = {
  active: false,
  source: null,
  planted: [],
  cursor: null,
  pointerId: null,
  completed: false,
};

const listeners = new Set<Listener>();

export const wireGesture = {
  get: (): WireGestureState => state,
  set: (patch: Partial<WireGestureState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    wireGesture.set({
      active: false,
      source: null,
      planted: [],
      cursor: null,
      pointerId: null,
      completed: false,
    });
  },
};