# Simulink Model Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for each task.

**Goal:** Add best-effort Simulink model import (.slx and .mdl) to OpenBlockSim, mapping supported block types and reporting unsupported ones as placeholder blocks.

**Architecture:** New `src/utils/simulinkImport.ts` module with SLX parser (ZIP→XML→DOM), MDL parser (text→tokens), block type mapper, parameter mapper, and connection mapper. The existing `importModel()` in `exportImport.ts` dispatches to the Simulink importer based on file extension. Unsupported blocks become Comment blocks with the Simulink type name as text. A summary report shows what was imported, what was skipped, and what was modified.

**Tech Stack:** TypeScript, Vitest, fflate (ZIP decompression, 10KB zero-dep), browser DOMParser (XML parsing, native)

## Global Constraints

- No breaking changes to existing JSON import/export
- .slx parsing uses fflate for ZIP decompression + native DOMParser for XML
- .mdl parsing uses a line-by-line text parser (no XML)
- Unsupported blocks become Comment blocks with Simulink type name
- All 333 existing tests must remain green
- TDD: write test first, watch fail, implement, watch pass

## File Structure

- `src/utils/simulinkImport.ts` — main importer module (SLX + MDL parsers, mappers)
- `src/utils/exportImport.ts` — dispatch based on file extension
- `src/App.tsx` — update Import button accept attribute
- `tests/utils/simulinkImport.test.ts` — new test file

---

### Task 1: Install fflate dependency

- [ ] `npm install fflate`
- [ ] Verify it imports cleanly
- [ ] Commit

### Task 2: Block type mapper

**Files:**
- Create: `src/utils/simulinkImport.ts` (initial file with mapper only)
- Test: `tests/utils/simulinkImport.test.ts`

**Block type mapping:**

| Simulink BlockType | OpenBlockSim BlockType | Notes |
|---|---|---|
| Constant | Constant | value → value |
| Step | Step | time, amplitude → stepTime, stepValue |
| Ramp | Ramp | slope, startTime → slope, startTime |
| SineWave | Sine | amplitude, frequency(rad/s), phase → amplitude, frequency(Hz), phase |
| PulseGenerator | PulseGenerator | amplitude, period, dutyCycle → amplitude, period, dutyCycle |
| Gain | Gain | gain → gain |
| Sum | Sum | inputs string (e.g. "++", "+-") → signs array |
| Product | Product | inputs → operators |
| Integrator | Integrator | InitialCondition → initialValue |
| Derivative | Derivative | — |
| TransferFcn | TransferFunction | numerator, denominator → num, den |
| StateSpace | StateSpace | A,B,C,D → A,B,C,D |
| TransportDelay | TransportDelay | delayTime → delayTime |
| Saturation | Saturation | upper, lower → upperLimit, lowerLimit |
| DeadZone | Deadzone | start, end → start, end |
| Relay | Relay | — |
| PIDController | PID | Kp, Ti, Td → Kp, Ti, Td |
| Subsystem | (skip/flatten) | If flat, expand contents; if nested, unsupported |
| Scope | Scope | — |
| ToWorkspace | ToWorkspace | — |
| (unknown) | Comment | Text = "[Unsupported: <SimulinkType>]" |

- [ ] **Step 1: Write failing tests for block type mapper**
- [ ] **Step 2: Run tests, verify fail**
- [ ] **Step 3: Implement mapBlockType() and mapParams()**
- [ ] **Step 4: Run tests, verify pass**
- [ ] **Step 5: Commit**

### Task 3: SLX parser (ZIP → XML → blocks + lines)

**Files:**
- Modify: `src/utils/simulinkImport.ts`
- Test: `tests/utils/simulinkImport.test.ts`

**SLX structure:**
- .slx is a ZIP file
- Key file: `simulink/blockdiagram.xml`
- XML structure: `<System>` contains `<Block>` and `<Line>` elements
- Each `<Block BlockType="X" Name="Y" SID="N">` has `<P Name="paramName">value</P>` children
- Each `<Line>` has `<P Name="Src">SID#out:port</P>` and `<P Name="Dst">SID#in:port</P>`
- Position stored as `<P Name="Position">[x, y, w, h]</P>`

- [ ] **Step 1: Write failing tests with a minimal .slx fixture (hand-crafted ZIP)**
- [ ] **Step 2: Run, verify fail**
- [ ] **Step 3: Implement parseSLX(file: File) → ParsedModel**
- [ ] **Step 4: Run, verify pass**
- [ ] **Step 5: Commit**

### Task 4: MDL parser (text → blocks + lines)

**Files:**
- Modify: `src/utils/simulinkImport.ts`
- Test: `tests/utils/simulinkImport.test.ts`

**MDL structure:**
- Line-oriented key-value pairs
- `Block { BlockType Step Name "Step" ... }`
- `Line { SrcBlock "Step" SrcPort 1 DstBlock "Sum" DstPort 1 ... }`
- Parameters: `ParameterName value`

- [ ] **Step 1: Write failing tests with a minimal .mdl fixture**
- [ ] **Step 2: Run, verify fail**
- [ ] **Step 3: Implement parseMDL(text: string) → ParsedModel**
- [ ] **Step 4: Run, verify pass**
- [ ] **Step 5: Commit**

### Task 5: Connection mapper (Simulink lines → OpenBlockSim edges)

**Files:**
- Modify: `src/utils/simulinkImport.ts`
- Test: `tests/utils/simulinkImport.test.ts`

- [ ] **Steps 1-5: TDD cycle**

### Task 6: Integration with importModel + UI

**Files:**
- Modify: `src/utils/exportImport.ts` — dispatch by file extension
- Modify: `src/App.tsx` — update accept attribute, handle import summary
- Test: `tests/utils/simulinkImport.test.ts`

- [ ] **Steps 1-5: TDD cycle**

### Task 7: Import summary report

**Files:**
- Modify: `src/utils/simulinkImport.ts` — return ImportSummary
- Modify: `src/App.tsx` — display summary
- Test: `tests/utils/simulinkImport.test.ts`

- [ ] **Steps 1-5: TDD cycle**

### Task 8: Full test suite + build + commit + push

- [ ] Run `npx vitest run` — all pass
- [ ] Run `npm run build` — clean
- [ ] Commit and push