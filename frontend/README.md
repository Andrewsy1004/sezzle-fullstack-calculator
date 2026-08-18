# Calculator Frontend (React + TypeScript + Vite)

A small, typed single-page app that consumes the Go calculator API. Built
with Vite and pnpm, structured into small, independently-testable modules
using barrel files (`index.ts`) for clean imports.

---

## Contents

- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [Configuring the API URL](#configuring-the-api-url)
- [Testing](#testing)
- [Design decisions](#design-decisions)

---

## Tech stack

- **React 18** + **TypeScript** (strict mode)
- **Vite 5**  dev server & build tool
- **pnpm**  package manager
- **Vitest** + **React Testing Library** + **jest-dom** unit/component tests
- **ESLint** (`@typescript-eslint`, `react-hooks`, `react-refresh`)
- Plain CSS (no framework) small enough surface area that a CSS framework
  would be overhead, not value

No UI component library, no state management library the app's state is
small enough that a single custom hook (`useCalculator`) is a better fit
than Redux/Zustand/etc.

## Project layout

```
frontend/
├── src/
│   ├── api/
│   │   ├── calculatorApi.ts     # fetch wrapper for POST /api/calculate
│   │   ├── __tests__/
│   │   └── index.ts             # barrel: `import { calculate } from "../api"`
│   ├── components/
│   │   ├── Calculator/
│   │   │   ├── Calculator.tsx   # presentational component
│   │   │   ├── Calculator.css
│   │   │   ├── __tests__/
│   │   │   └── index.ts         # barrel
│   │   └── index.ts             # barrel: re-exports every component
│   ├── hooks/
│   │   ├── useCalculator.ts     # all calculator state/validation/API logic
│   │   ├── __tests__/
│   │   └── index.ts             # barrel
│   ├── types/
│   │   └── index.ts             # shared types + Operation metadata (barrel)
│   ├── test/
│   │   └── setup.ts             # vitest + jest-dom setup
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── index.html
├── vite.config.ts               # includes vitest config (coverage, jsdom env)
├── tsconfig.json / tsconfig.node.json
├── .eslintrc.cjs
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── Dockerfile
└── nginx.conf
```

Every folder under `src/` (except `test/`) exposes an `index.ts` **barrel
file**, so consumers import from the folder rather than reaching into
individual files:

```ts
// Instead of:
import { Calculator } from "../components/Calculator/Calculator";

// You write:
import { Calculator } from "../components";
```

## Running locally

Requires Node 20+ and pnpm (via corepack: `corepack enable && corepack prepare pnpm@9 --activate`).

```bash
cd frontend
pnpm install
pnpm dev
# -> http://localhost:5173
```

By default the app calls same-origin `/api/*`. When running the frontend
dev server standalone against a Go backend on `:8080`, set
`VITE_API_BASE_URL` (see `.env.example`):

```bash
cp .env.example .env
# .env now contains: VITE_API_BASE_URL=http://localhost:8080/api
pnpm dev
```

Other scripts:

```bash
pnpm build            # tsc -b && vite build -> dist/
pnpm preview           # serve the production build locally
pnpm lint               # eslint .
pnpm test               # vitest run (single pass)
pnpm test:watch         # vitest (watch mode)
pnpm test:coverage     # vitest run --coverage
```

## Running with Docker

```bash
cd frontend
docker build -t calculator-frontend .
docker run -p 3000:80 calculator-frontend
```

Standalone like this, `/api` calls will 502 unless a service named
`backend` is reachable from the container (that's what `docker-compose.yml`
at the repo root sets up). Use the root-level `docker-compose up --build`
to run frontend + backend together see the top-level `README.md`.

The image is a multi-stage build: `node:22-alpine` (pnpm via corepack)
builds static assets, which are then served by `nginx:1.27-alpine`.
`nginx.conf` proxies `/api/*` and `/health` to the `backend` service so the
browser never needs CORS headers in the Docker setup same-origin requests
throughout.

## Configuring the API URL

| Variable              | Where it's read      | Default   | Purpose                                  |
|------------------------|-----------------------|-----------|--------------------------------------------|
| `VITE_API_BASE_URL`    | build time (Vite)     | `/api`    | Base URL the client fetches against       |

Because it's a `VITE_`-prefixed variable, it's inlined at **build** time,
not read at container runtime set it before `pnpm build` / `docker build`
if you need a non-default value.

## Testing

```bash
pnpm test:coverage
```

17 tests across 3 files, covering:

- **`api/calculatorApi.test.ts`** success response parsing, HTTP error →
  `ApiError` mapping, network failure handling, malformed JSON response
  handling.
- **`hooks/useCalculator.test.ts`** initial state, unary-operation
  detection (hides operand B for `sqrt`), successful submit, client-side
  validation rejecting non-numeric input *without* calling the API,
  surfacing backend error messages, `reset()`.
- **`components/Calculator.test.tsx`** renders expected fields, hides
  operand B for `sqrt`, full submit → result flow, validation message
  display, backend error display, reset button behavior.

Coverage on the exercised source files (`api/`, `hooks/`, `components/Calculator.tsx`)
is effectively 95–100% statements/branches; `App.tsx`/`main.tsx` are
excluded from the coverage report since they're framework bootstrap with no
branching logic.

## Design decisions

- **Logic lives in a hook, not the component.** `useCalculator` owns all
  state, validation, and API calls; `<Calculator />` is a thin render
  layer. This makes the business logic (what counts as valid input, how
  errors are surfaced) testable via `renderHook` without needing to drive a
  full DOM interaction for every case, and keeps the component easy to
  restyle without touching logic.
- **Client-side validation happens before the network call.** Non-numeric
  input is rejected locally with a clear message and the API is never
  called faster feedback for the user and one less round trip for an
  input we already know is invalid.
- **Operand `b` hides itself for unary operations.** Rather than showing a
  disabled/ignored field for `sqrt`, the UI only renders what's relevant,
  driven by a single `UNARY_OPERATIONS` set shared between the type
  definitions and the hook  adding a future unary operation is a one-line
  change.
- **A single `ApiError` class** distinguishes "the backend told us this
  input is invalid" (with its message surfaced directly, since the backend
  already writes user-safe messages) from "something else went wrong"
  (network failure, unparsable response), where a generic fallback message
  is shown instead of leaking implementation details.
- **Barrel files (`index.ts`) per folder** keep import paths stable as
  internal file structure changes (e.g. splitting `Calculator.tsx` into
  smaller pieces later doesn't change any import elsewhere in the app) and
  keep the public surface of each module explicit  only what's exported
  from `index.ts` is meant to be used outside that folder.
- **No global state library.** The whole app is one form with one hook;
  reaching for Redux/Zustand/Context here would add indirection without
  solving a problem this app actually has.
- **nginx proxies `/api` instead of the browser calling the backend
  directly in Docker.** This avoids CORS configuration in production
  entirely (same-origin request from the browser's perspective) and means
  the backend's container port never needs to be exposed to the browser at
  all only to the frontend's nginx process, over the Docker network.
