# Adaptive RK4(5) Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for each task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add adaptive-step RK4(5) Dormand-Prince solver with error estimation, user-selectable alongside the existing fixed-step RK4 solver.

**Architecture:** New `solveAdaptive()` function in `solver.ts` alongside existing `solve()`. Worker dispatches based on `solverType` field. SimConfig gains `rtol`, `atol`, `solverType`. Toolbar gets a solver dropdown (Fixed RK4 / Adaptive RK45). When adaptive is selected, dt becomes the initial/max step size and tolerance inputs appear. The compiler is unchanged — it already produces a `CompiledModel` with `f(t, state)`, `getOutputs`, `applyAbsoluteState`, and `updatePrevOutputs`.

**Tech Stack:** TypeScript, Vitest, React, Zustand, Web Workers

## Global Constraints

- Existing fixed-step RK4 solver must continue to work unchanged (backward compatible)
- Default solverType = 'fixed' (backward compatible with persisted store)
- Default rtol = 1e-4, atol = 1e-6 (Simulink defaults)
- Adaptive solver must handle absolute-mode blocks (TransportDelay, Relay, etc.) — their state updates at each accepted step, not at sub-step evaluations
- Adaptive solver must capture scope traces at variable time points (not uniform dt spacing)
- All 321 existing tests must remain green
- TDD: write test first, watch fail, implement, watch pass

## File Structure

- `src/engine/solver.ts` — add `solveAdaptive()` function, export both `solve` and `solveAdaptive`
- `src/engine/types.ts` — extend `SimConfig` and `WorkerMessage` with solver params
- `src/engine/worker.ts` — dispatch based on solverType
- `src/store/diagramStore.ts` — extend `SimConfig` interface
- `src/components/Toolbar.tsx` — solver dropdown, conditional tolerance inputs
- `src/App.tsx` — pass solver config to worker message
- `tests/engine/solver-adaptive.test.ts` — new test file for adaptive solver

---

### Task 1: Solver Types and Config Extension

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/store/diagramStore.ts`

**Interfaces:**
- Consumes: existing `SimConfig`, `SimResult`, `WorkerMessage`
- Produces: extended `SimConfig` with optional `solverType`, `rtol`, `atol`; extended `WorkerMessage` run payload; new `SimResult` metadata field `actualSteps`

- [ ] **Step 1: Write failing test for extended types**

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Extend SimConfig in types.ts**

```typescript
export interface SimConfig {
  dt: number;
  duration: number;
  solverType?: 'fixed' | 'adaptive';  // default 'fixed'
  rtol?: number;  // relative tolerance, default 1e-4
  atol?: number;  // absolute tolerance, default 1e-6
}
```

Add `actualSteps` to `SimResult`:
```typescript
export interface SimResult {
  time: number[];
  traces: Record<string, number[]>;
  scopes: Record<string, number[]>;
  actualSteps?: number;  // number of steps actually taken (adaptive)
}
```

Extend `WorkerMessage` run type:
```typescript
| { type: 'run'; graph: SerializedGraph; dt: number; duration: number; solverType?: 'fixed' | 'adaptive'; rtol?: number; atol?: number }
```

- [ ] **Step 4: Extend SimConfig in diagramStore.ts**

```typescript
interface SimConfig {
  dt: number;
  duration: number;
  solverType?: 'fixed' | 'adaptive';
  rtol?: number;
  atol?: number;
}
```

Update default: `simConfig: { dt: 0.01, duration: 10 }` (solverType undefined = 'fixed', backward compatible)

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

### Task 2: Adaptive Solver Implementation

**Files:**
- Modify: `src/engine/solver.ts` — add `solveAdaptive()` function
- Test: `tests/engine/solver-adaptive.test.ts` (new file)

**Interfaces:**
- Consumes: `CompiledModel` (unchanged), `SimConfig` with rtol/atol
- Produces: `SimResult` with variable-length time array, `actualSteps` metadata

**Dormand-Prince RK4(5) coefficients (DOPRI5):**

The Dormand-Prince method computes both 4th-order and 5th-order estimates using 7 stages (k1-k7). The 5th-order result is the accepted state. The difference between 4th and 5th order gives the local error estimate.

```
k1 = f(t, y)
k2 = f(t + c2*h, y + h*(a21*k1))
k3 = f(t + c3*h, y + h*(a31*k1 + a32*k2))
k4 = f(t + c4*h, y + h*(a41*k1 + a42*k2 + a43*k3))
k5 = f(t + c5*h, y + h*(a51*k1 + a52*k2 + a53*k3 + a54*k4))
k6 = f(t + c6*h, y + h*(a61*k1 + a62*k2 + a63*k3 + a64*k4 + a65*k5))

y5 = y + h*(b1*k1 + b3*k3 + b4*k4 + b5*k5 + b6*k6)    // 5th order
y4 = y + h*(b1*k1 + b3*k3 + b4*k4 + b5*k5 + b6*k6)    // same! (FSAL)
error = y5 - y4 = h*(e1*k1 + e3*k3 + e4*k4 + e5*k5 + e6*k6)
```

Actually DOPRI5 has FSAL (First Same As Last) property: k7 = f(t+h, y5) and k7 becomes k1 of next step. The error estimate uses:
- `error_i = h * (e1*k1 + e3*k3 + e4*k4 + e5*k5 + e6*k6 + e7*k7)`

The standard coefficients:
```
c2 = 1/5, c3 = 3/10, c4 = 4/5, c5 = 8/9, c6 = 1.0, c7 = 1.0
a21 = 1/5
a31 = 3/40, a32 = 9/40
a41 = 44/45, a42 = -56/15, a43 = 32/9
a51 = 19372/6561, a52 = -25360/2187, a53 = 64448/6561, a54 = -212/729
a61 = 9017/3168, a62 = -355/33, a63 = 46732/5247, a64 = 49/176, a65 = -5103/18656
a71 = 35/384, a72 = 0, a73 = 500/1113, a74 = 125/192, a75 = -2187/6784, a76 = 11/84

b1 = 35/384, b3 = 500/1113, b4 = 125/192, b5 = -2187/6784, b6 = 11/84  (5th order)

e1 = 71/57600, e3 = -71/16695, e4 = 71/1920, e5 = -17253/339200, e6 = 22/525, e7 = -1/40
```

**Step size controller:**
```
err_i = abs(error_i) / (atol + rtol * max(abs(y_i), abs(y5_i)))
err_norm = sqrt(mean(err_i^2))   // RMS norm
if err_norm <= 1: accept step, h_new = h * min(facmax, max(facmin, fac * (1/err_norm)^(1/5)))
if err_norm > 1: reject step, h_new = h * max(facmin, fac * (1/err_norm)^(1/5))
```
Where fac=0.9, facmin=0.2, facmax=5.0 (standard values).

**Absolute-mode block handling:**
- During k1-k7 sub-step evaluations: call `f()` which returns zero stateDot for absolute blocks (same as current fixed-step)
- After accepted step: call `applyAbsoluteState(t_new, state)` to update absolute blocks
- After accepted step: call `updatePrevOutputs(t_new, state)` for feedback edges

**Scope trace capture:**
- Variable-length time array — append `t` at each accepted step
- For each accepted step, call `getOutputs(t, state)` and capture scope inputs
- This produces non-uniform time points (unlike fixed-step's uniform dt spacing)

- [ ] **Step 1: Write failing tests for adaptive solver**

Test cases:
1. `dx/dt = -x, x0=1` — analytical solution `e^(-t)`. At t=1, x ≈ 0.3679. Check accuracy within rtol=1e-4.
2. Step input through transfer function 1/(s+1) — check final value ≈ 1.0 at t=10 with rtol=1e-3.
3. Same model as test 2 but with rtol=1e-6 — verify more steps taken, higher accuracy.
4. Verify `actualSteps` is returned and is less than fixed-step equivalent.
5. Verify no NaN in results.
6. Verify time array is non-uniform (not all dt-spaced).
7. Closed-loop PID model (reuse from existing integration test) — verify stable response matching fixed-step result within tolerance.
8. Absolute block (TransportDelay) — verify ring buffer updates correctly with adaptive stepping.

- [ ] **Step 2: Run tests to verify they fail** (`solveAdaptive` not defined)

- [ ] **Step 3: Implement `solveAdaptive()` in solver.ts**

```typescript
// DOPRI5 coefficients
const C2 = 1/5, C3 = 3/10, C4 = 4/5, C5 = 8/9;
const A21 = 1/5;
const A31 = 3/40, A32 = 9/40;
const A41 = 44/45, A42 = -56/15, A43 = 32/9;
const A51 = 19372/6561, A52 = -25360/2187, A53 = 64448/6561, A54 = -212/729;
const A61 = 9017/3168, A62 = -355/33, A63 = 46732/5247, A64 = 49/176, A65 = -5103/18656;
const A71 = 35/384, A73 = 500/1113, A74 = 125/192, A75 = -2187/6784, A76 = 11/84;
const E1 = 71/57600, E3 = -71/16695, E4 = 71/1920, E5 = -17253/339200, E6 = 22/525, E7 = -1/40;

export function solveAdaptive(
  model: CompiledModel,
  config: { dt: number; duration: number; rtol: number; atol: number },
  initialState: number[]
): SimResult {
  const { dt: hMax, duration, rtol, atol } = config;
  const n = model.stateSize;

  const time: number[] = [0];
  const scopes: Record<string, number[]> = {};
  for (const scopeId of model.scopeBlockIds) {
    scopes[scopeId] = [];
  }

  let state = [...initialState];
  let t = 0;
  let h = Math.min(hMax, duration);  // initial step = hMax
  let actualSteps = 0;

  // Initialize prevOutputs and scope capture at t=0
  if (model.updatePrevOutputs) model.updatePrevOutputs(t, state);
  if (model.getOutputs) {
    const initOutputs = model.getOutputs(0, state);
    for (const scopeId of model.scopeBlockIds) {
      const wires = model.scopeInputs?.get(scopeId);
      if (wires && wires.length > 0) {
        const srcOut = initOutputs.get(wires[0].source) ?? [];
        scopes[scopeId].push(srcOut[wires[0].sourcePort] ?? 0);
      } else {
        scopes[scopeId].push(0);
      }
    }
  }

  while (t < duration) {
    // Don't overshoot end time
    if (t + h > duration) h = duration - t;

    // DOPRI5 stages
    const k1 = model.f(t, state);
    const k2 = model.f(t + C2*h, state.map((s,i) => s + h*A21*k1[i]));
    const k3 = model.f(t + C3*h, state.map((s,i) => s + h*(A31*k1[i] + A32*k2[i])));
    const k4 = model.f(t + C4*h, state.map((s,i) => s + h*(A41*k1[i] + A42*k2[i] + A43*k3[i])));
    const k5 = model.f(t + C5*h, state.map((s,i) => s + h*(A51*k1[i] + A52*k2[i] + A53*k3[i] + A54*k4[i])));
    const k6 = model.f(t + h, state.map((s,i) => s + h*(A61*k1[i] + A62*k2[i] + A63*k3[i] + A64*k4[i] + A65*k5[i])));

    // 5th order solution
    const y5 = state.map((s,i) => s + h*(A71*k1[i] + A73*k3[i] + A74*k4[i] + A75*k5[i] + A76*k6[i]));
    // k7 = f(t+h, y5) — FSAL
    const k7 = model.f(t + h, y5);

    // Error estimate
    const err = state.map((s,i) => h*(E1*k1[i] + E3*k3[i] + E4*k4[i] + E5*k5[i] + E6*k6[i] + E7*k7[i]));

    // Error norm (RMS of scaled errors)
    let errNorm = 0;
    for (let i = 0; i < n; i++) {
      const sc = atol + rtol * Math.max(Math.abs(state[i]), Math.abs(y5[i]));
      errNorm += (err[i] / sc) ** 2;
    }
    errNorm = Math.sqrt(errNorm / n);

    if (errNorm <= 1) {
      // Accept step
      state = y5;
      t += h;
      actualSteps++;

      // Apply absolute state updates
      if (model.applyAbsoluteState) model.applyAbsoluteState(t, state);

      // NaN check
      for (let i = 0; i < n; i++) {
        if (!isFinite(state[i])) {
          throw new Error(`Simulation diverged at t=${t.toFixed(3)}s. State variable ${i} produced ${isNaN(state[i]) ? 'NaN' : 'Infinity'}.`);
        }
      }

      // Capture scope traces
      if (model.getOutputs) {
        const allOutputs = model.getOutputs(t, state);
        for (const scopeId of model.scopeBlockIds) {
          const wires = model.scopeInputs?.get(scopeId);
          if (wires && wires.length > 0) {
            const srcOut = allOutputs.get(wires[0].source) ?? [];
            scopes[scopeId].push(srcOut[wires[0].sourcePort] ?? 0);
          } else {
            scopes[scopeId].push(0);
          }
        }
      }

      time.push(t);

      // Update prevOutputs for feedback edges
      if (model.updatePrevOutputs) model.updatePrevOutputs(t, state);

      // Increase step size
      const fac = 0.9 * Math.pow(1/errNorm, 1/5);
      h = Math.min(hMax, h * Math.min(5, Math.max(0.2, fac)));
    } else {
      // Reject step — reduce h and retry
      const fac = 0.9 * Math.pow(1/errNorm, 1/5);
      h = h * Math.max(0.2, fac);
      if (h < 1e-12) {
        throw new Error(`Step size underflow at t=${t.toFixed(3)}s. System may be stiff.`);
      }
    }
  }

  return { time, traces: {}, scopes, actualSteps };
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

### Task 3: Worker Dispatch

**Files:**
- Modify: `src/engine/worker.ts`

- [ ] **Step 1: Write failing test for worker dispatch**

Add test: worker receives `solverType: 'adaptive'` and returns result with `actualSteps`.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement worker dispatch**

```typescript
const solverType = msg.solverType ?? 'fixed';
let result;
if (solverType === 'adaptive') {
  const rtol = msg.rtol ?? 1e-4;
  const atol = msg.atol ?? 1e-6;
  result = solveAdaptive(model, { dt: msg.dt, duration: msg.duration, rtol, atol }, new Array(model.stateSize).fill(0));
} else {
  result = solve(model, { dt: msg.dt, duration: msg.duration }, new Array(model.stateSize).fill(0));
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

### Task 4: UI — Solver Selector and Tolerance Inputs

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add solver dropdown to Toolbar**

Add props: `solverType`, `onSolverTypeChange`, `rtol`, `atol`, `onRtolChange`, `onAtolChange`.

When `solverType === 'adaptive'`:
- dt label changes to "Max dt:"
- Tolerance inputs appear (rtol, atol)
- Duration stays

When `solverType === 'fixed'`:
- Current layout unchanged

- [ ] **Step 2: Wire App.tsx to pass solver config to worker**

```typescript
const msg: WorkerMessage = {
  type: 'run',
  graph,
  dt: store.simConfig.dt,
  duration: store.simConfig.duration,
  solverType: store.simConfig.solverType ?? 'fixed',
  rtol: store.simConfig.rtol,
  atol: store.simConfig.atol,
};
```

- [ ] **Step 3: Wire Toolbar props in App.tsx**

- [ ] **Step 4: Run full test suite**

- [ ] **Step 5: Commit**

### Task 5: Integration Tests and Build Verification

- [ ] **Step 1: Run full test suite — `npx vitest run`**

Expected: all 321 existing tests + new adaptive solver tests pass.

- [ ] **Step 2: Run build — `npm run build`**

Expected: TypeScript compiles, Vite builds clean.

- [ ] **Step 3: Verify backward compatibility**

- Default simConfig (no solverType) → fixed-step RK4 runs
- Existing model.json files load and simulate identically
- Existing tests pass unchanged

- [ ] **Step 4: Commit and push**