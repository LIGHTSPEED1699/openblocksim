# OpenBlockSim

A pure client-side block diagram simulator for control systems. Build, simulate, and visualize dynamic system models directly in the browser — no backend, no server.

## Features

- **19 block types** across 6 categories: Sources, Math, Linear, Nonlinear, Control, Sinks
- **Custom RK4 solver** with NaN/Infinity detection and step limits
- **Graph compiler** with topological sort, state assignment, and ODE generation
- **Algebraic loop detection** via DFS-based cycle detection
- **Web Worker** simulation — non-blocking UI during solve
- **React Flow** drag-and-drop diagram editor with custom color-coded nodes
- **Plotly.js** real-time scope widgets
- **Zustand** state management with localStorage auto-save
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

| Category | Blocks |
|----------|--------|
| Sources | Constant, Step, Ramp, Sine, Square |
| Math | Sum, Gain, Product |
| Linear | Integrator, Derivative, TransferFunction, StateSpace, TransportDelay |
| Nonlinear | Saturation, Deadzone |
| Control | PID, Relay |
| Sinks | Scope, ToWorkspace |

## Deployment

Static site deployed via Cloudflare Pages.

- **Repo:** [github.com/LIGHTSPEED1699/openblocksim](https://github.com/LIGHTSPEED1699/openblocksim)
- **Domain:** sim.hongbinli.ca
- **Build command:** `npm run build`
- **Output directory:** `dist`

## License

MIT