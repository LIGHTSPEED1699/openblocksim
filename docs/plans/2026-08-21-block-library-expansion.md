# OpenBlockSim Block Library Expansion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for each block. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Expand OpenBlockSim from 20 to 40+ block types, closing the gap with Simulink's commonly-used libraries.

**Architecture:** Each block is a standalone `.ts` file exporting a `BlockFactory` satisfies object. Blocks are registered in `worker.ts` and `DiagramCanvas.tsx`. Tests go in `tests/blocks/`. Types go in `src/blocks/types.ts`.

**Tech Stack:** TypeScript, Vitest, React Flow, Zustand

## Global Constraints

- Every new block must follow the `BlockFactory` pattern from `src/blocks/types.ts`
- Every new block gets a `BlockType` enum entry and `BlockCategory` if needed
- Every new block gets tests in `tests/blocks/` following existing patterns
- Every new block must be registered in `src/engine/worker.ts` and `src/components/DiagramCanvas.tsx`
- Export/import (`src/utils/exportImport.ts`) must be updated with TYPE_IO and CATEGORY_FOR_TYPE entries
- Node components may need new React Flow node types in `DiagramCanvas.tsx`
- All 200+ existing tests must remain green after each task
- TDD: write test first, watch it fail, implement, watch it pass, commit

## File Structure

- `src/blocks/types.ts` — BlockType enum, BlockCategory enum, interfaces
- `src/blocks/<category>/<BlockName>.ts` — one file per block
- `src/engine/worker.ts` — registry registration
- `src/components/DiagramCanvas.tsx` — FACTORIES map, node type mapping
- `src/utils/exportImport.ts` — TYPE_IO, CATEGORY_FOR_TYPE maps
- `src/components/nodes/*.tsx` — React Flow node components (reuse existing by category)
- `tests/blocks/<category>.test.ts` — test files per category

---

### Task 1: Trivial Math Blocks (Abs, Sign, Bias, UnaryMinus, Divide, MinMax, RoundingFunction)

**Files:**
- Modify: `src/blocks/types.ts` (add 7 BlockType entries)
- Create: `src/blocks/math/Abs.ts`, `Sign.ts`, `Bias.ts`, `UnaryMinus.ts`, `Divide.ts`, `MinMax.ts`, `RoundingFunction.ts`
- Modify: `src/engine/worker.ts`, `src/components/DiagramCanvas.tsx`, `src/utils/exportImport.ts`
- Test: `tests/blocks/math.test.ts` (append new describe blocks)

**Interfaces:**
- All consume the existing `Block`, `BlockFactory`, `Params` types from `types.ts`
- All produce `BlockFactory` satisfies objects with `category: BlockCategory.Math`
- All are static (isDynamic=false, stateSize=0) except none

- [ ] **Step 1: Write failing tests for all 7 math blocks**

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Add BlockType enum entries to types.ts**

- [ ] **Step 4: Implement all 7 block files**

- [ ] **Step 5: Register blocks in worker.ts, DiagramCanvas.tsx, exportImport.ts**

- [ ] **Step 6: Run tests to verify they pass**

- [ ] **Step 7: Commit**

### Task 2: MathFunction and TrigFunction Blocks

**Files:**
- Create: `src/blocks/math/MathFunction.ts`, `src/blocks/math/TrigFunction.ts`
- Modify: same registration files
- Test: `tests/blocks/math.test.ts` (append)

- [ ] **Step 1-7: TDD cycle for MathFunction (exp, log, log10, square, sqrt, 10^u, 2^u, power) and TrigFunction (sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh)**

### Task 3: Signal Routing Blocks (Mux, Demux, Switch)

**Files:**
- Create: `src/blocks/routing/Mux.ts`, `Demux.ts`, `Switch.ts`
- Add `BlockCategory.Routing` to types.ts
- Modify: registration files
- Test: `tests/blocks/routing.test.ts` (new file)

**Key design decisions:**
- Mux: N inputs (2-8), 1 output (vector). Output = array of all inputs. isDynamic=false.
- Demux: 1 input (vector), N outputs (2-8). Each output = input[n]. isDynamic=false.
- Switch: 3 inputs (data1, control, data2), 1 output. If control >= threshold, output=data1, else output=data2. isDynamic=false.

- [ ] **Steps 1-7: TDD cycle**

### Task 4: Discrete Blocks (UnitDelay, DiscreteIntegrator, DiscreteTransferFcn, Memory)

**Files:**
- Create: `src/blocks/discrete/UnitDelay.ts`, `DiscreteIntegrator.ts`, `DiscreteTransferFcn.ts`, `Memory.ts`
- Add `BlockCategory.Discrete` to types.ts
- Modify: registration files, compiler.ts (getStateSize for DiscreteTransferFcn)
- Test: `tests/blocks/discrete.test.ts` (new file)

**Key design:**
- UnitDelay: 1 state, absolute update. state[0] = input (previous). output = state[0]. z^-1.
- DiscreteIntegrator: 1 state, absolute update. Methods: Forward Euler (y += dt*u), Backward Euler (y += dt*u_new), Trapezoidal (y += dt*(u_old+u_new)/2). Default: Forward Euler.
- DiscreteTransferFcn: H(z) = num(z)/den(z). Uses difference equation: den[0]*y[k] = sum(num[i]*u[k-i]) - sum(den[j]*y[k-j]). State = previous outputs + previous inputs. Absolute update.
- Memory: Like UnitDelay but for continuous-time. Holds previous input value. 1 state, absolute update.

- [ ] **Steps 1-7: TDD cycle**

### Task 5: Discontinuity Blocks (RateLimiter, Quantizer, Backlash)

**Files:**
- Create: `src/blocks/nonlinear/RateLimiter.ts`, `Quantizer.ts`, `Backlash.ts`
- Modify: registration files
- Test: `tests/blocks/nonlinear.test.ts` (append)

**Key design:**
- RateLimiter: 1 state (previous output), absolute update. Limits rate of change to [risingSlew, fallingSlew]. If (input - prevOutput)/dt > risingSlew, output = prevOutput + risingSlew*dt. If (input - prevOutput)/dt < -fallingSlew, output = prevOutput - fallingSlew*dt. Else output = input.
- Quantizer: Static. output = round(input/quantum) * quantum.
- Backlash: 1 state (previous output), absolute update. Deadband width. If input changes within deadband, output stays. If input exceeds deadband, output follows input.

- [ ] **Steps 1-7: TDD cycle**

### Task 6: New Source Blocks (PulseGenerator, Clock, ChirpSignal, RepeatingSequence, RandomNumber)

**Files:**
- Create: `src/blocks/sources/PulseGenerator.ts`, `Clock.ts`, `ChirpSignal.ts`, `RepeatingSequence.ts`, `RandomNumber.ts`
- Modify: registration files
- Test: `tests/blocks/sources.test.ts` (append)

**Key design:**
- PulseGenerator: amplitude, period, dutyCycle (%), phaseDelay. Output = amplitude when mod(t+phase, period) < period*dutyCycle/100, else 0.
- Clock: Output = t (simulation time). No params.
- ChirpSignal: startFreq, targetFreq, sweepTime, amplitude. freq(t) = startFreq + (targetFreq - startFreq) * min(t/sweepTime, 1). output = amplitude * sin(2*pi*integral(freq, t)).
- RepeatingSequence: dataPoints array of [t, y] pairs. Linear interpolation, periodic.
- RandomNumber: mean, stdDev. Uses seeded PRNG (mulberry32) for reproducibility. Output = mean + stdDev * gaussianRandom().

- [ ] **Steps 1-7: TDD cycle**

### Task 7: New Sink Blocks (Terminator, Display, StopSimulation)

**Files:**
- Create: `src/blocks/sinks/Terminator.ts`, `Display.ts`, `StopSimulation.ts`
- Modify: registration files, solver.ts (for StopSimulation — check flag and halt)
- Test: `tests/blocks/sinks.test.ts` (append)

**Key design:**
- Terminator: 1 input, 0 outputs. No-op. Just absorbs signal.
- Display: 1 input, 0 outputs. No-op for engine (UI shows current value). Same as Scope but without time-series.
- StopSimulation: 1 input, 0 outputs. Dynamic (1 state). When input != 0, sets a flag that solver checks to halt simulation early.

- [ ] **Steps 1-7: TDD cycle**

### Task 8: Existing Block Improvements

**Files:**
- Modify: `src/blocks/math/Sum.ts` (variable inputs 2-8)
- Modify: `src/blocks/math/Product.ts` (variable inputs 2-4, operator array)
- Modify: `src/blocks/sinks/Scope.ts` (multi-input 1-4)
- Modify: `src/blocks/linear/Integrator.ts` (optional saturation limits)
- Modify: `src/blocks/sources/Sine.ts` (add bias param)
- Modify: `src/utils/exportImport.ts` (update TYPE_IO for variable-input blocks)
- Modify: `src/components/DiagramCanvas.tsx` (node rendering for variable inputs)
- Modify: `src/components/ParameterPanel.tsx` (input count param for Sum/Product/Scope)
- Test: Update existing tests, add new ones

- [ ] **Steps 1-7: TDD cycle for each improvement**

### Task 9: Final Integration — Build and Full Test Suite

- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — TypeScript compiles, Vite builds
- [ ] Commit final state