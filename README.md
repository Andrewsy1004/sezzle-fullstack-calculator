# Full-Stack Calculator

A React (TypeScript) frontend backed by a Go REST API microservice.
Supports add, subtract, multiply, divide, power, square root, and
percentage, with input validation and error handling on both ends.

This file is a short, top-level summary. For the full detail on each
layer, see:

- **[`backend/README.md`](backend/README.md)**: Go API: endpoints, error
  handling table, testing, and design rationale.
- **[`frontend/README.md`](frontend/README.md)**: React app: project
  structure, barrel files, testing, and design rationale.
- **[`PROMPTS.md`](PROMPTS.md)**: AI prompts used while building this.

---

## Run everything with one command

Requires [Docker](https://docs.docker.com/get-docker/) and Docker Compose
(bundled with Docker Desktop / recent Docker Engine).

```bash
docker compose up --build -d 
```

- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:8080** (also reachable via the frontend
  at `http://localhost:3000/api/...`, proxied by nginx)

Stop everything with `Ctrl+C`, or `docker compose down` to remove the
containers.

### What `docker compose up --build -d` does

| Service    | Build                                              | Serves                                                  |
|------------|------------------------------------------------------|----------------------------------------------------------|
| `backend`  | `golang:1.22-alpine` → `alpine:3.20` (multi-stage)    | REST API on `:8080`, with a `/health` healthcheck        |
| `frontend` | `node:22-alpine` (pnpm build) → `nginx:1.27-alpine`   | Static React build on `:80` (mapped to host `:3000`), proxying `/api/*` and `/health` to `backend` |

`frontend` waits for `backend`'s Docker healthcheck to pass before
starting, so there's no race on first boot.

## Running without Docker

See the per-layer READMEs for full detail; short version:

```bash
# Terminal 1: backend (needs Go 1.22+)
cd backend
go run ./cmd/server
# -> listening on :8080

# Terminal 2: frontend (needs Node 20+ and pnpm)
cd frontend
pnpm install
cp .env.example .env   # points the dev server at http://localhost:8080
pnpm dev
# -> http://localhost:5173
```

## API example

```bash
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
# -> {"operation":"add","result":5}
```

Full endpoint reference, all operations, and every error case are
documented in [`backend/README.md`](backend/README.md#api-reference).

## Tests & coverage

```bash
# Backend
cd backend && go test ./... -cover
# calculator: 89.5% | handlers: 95.8%

# Frontend
cd frontend && pnpm test:coverage
# 17/17 tests passing; ~95-100% on api/, hooks/, and the Calculator component
```

Both suites were run and passing as of this repo's last commit; see each
README for the exact commands to generate an HTML coverage report.

## Repository layout

```
.
├── backend/          # Go REST API (see backend/README.md)
├── frontend/          # React + TypeScript SPA (see frontend/README.md)
├── docker-compose.yml # runs both services together
├── PROMPTS.md          # AI prompts used during development
└── README.md           # this file
```

## Key design decisions (short version)

- **Single `POST /api/calculate` endpoint** with an `operation` field,
  rather than one route per operation, keeping the API surface small and
  the frontend integration uniform.
- **Go standard library only** on the backend: no framework needed at
  this size; keeps the dependency surface at zero.
- **All calculator errors are `400`s**: every failure (divide by zero,
  negative sqrt, unsupported op, missing operand) is a client-input
  problem, not a server fault.
- **Business logic lives in `useCalculator`, not the component** on the
  frontend, which makes validation/API-calling logic testable in isolation and
  keeps `<Calculator />` purely presentational.
- **nginx proxies `/api` to the backend** in the Docker setup, so the
  browser only ever talks same-origin; no CORS configuration needed in
  production.
- **Barrel files (`index.ts`) per module** on the frontend for stable,
  explicit import paths as internal structure evolves.

See each layer's README for the fuller rationale behind these and other
choices (JSON decoding strictness, pointer-typed operand `b`, non-root
Docker users, etc.).