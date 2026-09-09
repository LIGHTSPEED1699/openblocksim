# OpenBlockSim

A pure client-side block diagram simulator for control systems. Build, simulate, and visualize dynamic system models directly in the browser — no backend, no server.

## Features

- **45+ block types** across 9 categories: Sources, Sinks, Math, Linear, Discrete, Nonlinear, Control, Routing, Annotation
- **Custom RK4 solver** with NaN/Infinity detection and step limits
- **Graph compiler** with topological sort, state assignment, and ODE generation
- **Algebraic loop detection** via DFS-based cycle detection
- **Web Worker** simulation — non-blocking UI during solve
- **React Flow** drag-and-drop diagram editor with custom color-coded nodes
- **Plotly.js** real-time scope widgets
- **Zustand** state management with localStorage auto-save
- **Undo/redo** for diagram edits — add/move/delete/param-edit (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, session-transient history)
- **Grouping boxes** — colored, resizable, movable boxes that group nodes visually;
  dragging a box moves its contained nodes, deleting a box (with confirmation) deletes
  its contents, and membership follows geometry (a node whose top-left corner is inside
  the box). Boxes are saved in the model JSON (`groups`) and survive export/import.
- **Semantic port labels** (u/y/in1/in2) rendered from BlockMeta on every block
- **Node flip** (F key or right-click → Flip) — mirrors a node and swaps its input/output handle sides
- **Draggable wire waypoints** — drag any edge to bend it, drag waypoint dots to re-route, double-click a dot to delete; waypoints persist in the model JSON
- **JSON export/import** for saving and sharing models
- **Dark/light theme** toggle
- **Fully static** — deploy anywhere

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Simulation Engine | TypeScript (custom RK4, no external ODE library) |
| Diagram Editor | React Flow (@xyflow/react v12) |
| Plotting | Plotly.js (react-plotly.js) |
| State | Zustand 4.x with persist middleware |
| Build | Vite 5.x |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Styling | Tailwind CSS with CSS variables for theming |

## Architecture

Three independent layers:

1. **Diagram Editor** (React Flow) — visual block diagram manipulation
2. **Simulation Engine** (TypeScript + Web Worker) — compile graph to ODE, solve with RK4
3. **Plotting** (Plotly.js) — time-series visualization of scope outputs

The engine runs in a Web Worker to keep the UI responsive during long simulations.

## Getting Started

```bash
npm install
npm run dev      # Start dev server at localhost:5173
npm run build    # Production build to dist/
npm test         # Run unit/integration tests (Vitest)
npm run test:e2e # Run E2E tests (Playwright)
```

## Block Types

Block metadata (categories, KaTeX math icons, port labels, parameter specs) lives in
`src/blocks/meta.ts`. Sources: Constant, Step, Ramp, Sine, Square, PulseGenerator, Clock,
ChirpSignal, RepeatingSequence, RandomNumber · Sinks: Scope, ToWorkspace, Terminator,
Display, StopSimulation · Math: Sum, Gain, Product, Abs, Sign, Bias, UnaryMinus, Divide,
MinMax, RoundingFunction, MathFunction, TrigFunction, Interpolate, Pow, Clip · Linear:
TransferFunction, StateSpace, Integrator, Derivative, TransportDelay · Discrete: UnitDelay,
DiscreteIntegrator, DiscreteTransferFcn, Memory · Nonlinear: Saturation, Deadzone,
RateLimiter, Quantizer, Backlash · Control: PID, Relay · Routing: Mux, Demux, Switch ·
Annotation: Comment.

## Deployment

Static site deployed via Cloudflare Pages.

- **Repo:** [github.com/LIGHTSPEED1699/openblocksim](https://github.com/LIGHTSPEED1699/openblocksim)
- **Domain:** sim.hongbinli.ca
- **Build command:** `npm run build`
- **Output directory:** `dist`

## License

MIT