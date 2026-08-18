# Calculator Backend (Go)

A small, dependency-free REST API that performs arithmetic operations for
the calculator app. Built with the Go standard library only no web
framework to keep it easy to read, easy to audit, and cheap to run.

---

## Contents

- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Running locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [API reference](#api-reference)
- [Error handling](#error-handling)
- [Testing](#testing)
- [Design decisions](#design-decisions)

---

## Tech stack

- **Go 1.22** (standard library only `net/http` with Go 1.22's
  method-aware `ServeMux` patterns, e.g. `"POST /api/calculate"`)
- No external dependencies. `go.mod` has no `require` block.

## Project layout

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # entrypoint: routing, middleware, graceful shutdown
├── internal/
│   ├── calculator/
│   │   ├── calculator.go       # pure arithmetic logic + domain errors
│   │   └── calculator_test.go
│   ├── handlers/
│   │   ├── handlers.go         # HTTP <-> calculator glue (JSON in/out, status codes)
│   │   └── handlers_test.go
│   └── models/
│       └── models.go           # request/response DTOs
├── go.mod
├── Dockerfile
└── .dockerignore
```

`internal/` is used deliberately: nothing here is meant to be imported by
another module, and the Go compiler enforces that.

## Running locally

Requires Go 1.22+.

```bash
cd backend
go run ./cmd/server
# -> calculator API listening on :8080
```

Environment variables:

| Variable              | Default | Description                                   |
|-----------------------|---------|------------------------------------------------|
| `PORT`                | `8080`  | Port the HTTP server listens on                |
| `CORS_ALLOWED_ORIGIN` | `*`     | Value sent in `Access-Control-Allow-Origin`     |

Quick smoke test:

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
```

## Running with Docker

```bash
cd backend
docker build -t calculator-backend .
docker run -p 8080:8080 calculator-backend
```

(To run the full stack in one command, see the root `README.md` /
`docker-compose.yml` instead.)

The image is a multi-stage build: compiled with `golang:1.22-alpine`, then
copied into a minimal `alpine:3.20` runtime image with a non-root user and
a built-in `HEALTHCHECK` that hits `/health`.

## API reference

### `GET /health`

Liveness check.

```bash
curl http://localhost:8080/health
```

```json
{ "status": "ok" }
```

### `POST /api/calculate`

**Request body**

| Field       | Type   | Required               | Notes                                              |
|-------------|--------|-------------------------|-----------------------------------------------------|
| `operation` | string | yes                     | One of: `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, `percentage` (case-insensitive) |
| `a`         | number | yes                     | First operand                                      |
| `b`         | number | required except for `sqrt` | Second operand                                 |

`percentage` is defined as **"a percent of b"**: `result = (a / 100) * b`.
For example `{"operation":"percentage","a":20,"b":50}` → `20% of 50 = 10`.

**Success response  `200 OK`**

```json
{ "operation": "add", "result": 5 }
```

**Error response  `400 Bad Request`**

```json
{ "error": "division by zero is not allowed" }
```

### Examples

```bash
# Addition
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
# -> {"operation":"add","result":5}

# Division by zero (error case)
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"divide","a":10,"b":0}'
# -> 400 {"error":"division by zero is not allowed"}

# Square root (unary  omit "b")
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"sqrt","a":81}'
# -> {"operation":"sqrt","result":9}

# Negative square root (error case)
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"sqrt","a":-4}'
# -> 400 {"error":"cannot compute the square root of a negative number"}

# Percentage: 20% of 50
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"percentage","a":20,"b":50}'
# -> {"operation":"percentage","result":10}
```

## Error handling

All handler-level errors are domain errors defined in `internal/calculator`
and mapped to HTTP status codes by `handlers.statusForError`:

| Condition                          | Error message                                              | Status |
|-------------------------------------|--------------------------------------------------------------|--------|
| Division by zero                    | `division by zero is not allowed`                            | 400    |
| Square root of a negative number    | `cannot compute the square root of a negative number`        | 400    |
| Unknown/unsupported operation       | `unsupported operation`                                       | 400    |
| Missing required operand `b`        | `operand 'b' is required for this operation`                 | 400    |
| Result is `±Inf` / `NaN` (overflow) | `result is not a finite number (overflow or invalid operation)` | 400 |
| Malformed / non-JSON body           | `invalid JSON body: ...`                                      | 400    |
| Unknown JSON fields in body         | (decoder rejects it same 400 path)                          | 400    |
| Missing `operation` field           | `'operation' is required`                                     | 400    |

There are currently no server-caused (5xx) failure modes in the calculate
path every failure is traceable to bad client input, which is why
everything maps to `400`. `statusForError` has a `500` fallback in case
new, non-input-related errors are introduced later.

## Testing

```bash
cd backend
go test ./... -v              # run all tests, verbose
go test ./... -cover          # coverage summary
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html   # HTML report
```

Current coverage (measured during development):

- `internal/calculator`: **89.5%** statements
- `internal/handlers`: **95.8%** statements

Both packages use table-driven tests covering the happy path, every
documented error case, and edge cases (case-insensitive operation names,
overflow, missing/omitted operands, malformed/unknown-field JSON).

`cmd/server/main.go` (the process bootstrap signal handling, listener
setup) is intentionally left untested via `go test`; it's a thin wrapper
around already-tested handlers, and its behavior is better verified by the
Docker healthcheck / manual `curl` smoke tests described above.

## Design decisions

- **Standard library only.** For an API this small, a router like
  `chi` or `gin` adds a dependency without adding real value. Go 1.22's
  `http.ServeMux` already supports method-based patterns (`"POST /api/calculate"`),
  which covers everything this service needs.
- **`internal/calculator` has zero HTTP knowledge.** Arithmetic and its
  error cases (division by zero, negative sqrt, overflow) are expressed as
  plain Go functions and sentinel errors. This makes the core logic trivial
  to unit test and reusable from other transports (a CLI, a gRPC service,
  etc.) without touching a single HTTP concern.
- **A single `POST /api/calculate` endpoint** (vs. one endpoint per
  operation like `/api/add`, `/api/subtract`, ...) keeps the API surface
  small and the frontend integration uniform  the client only ever needs
  one request shape, and adding a new operation later means adding a case
  in `calculator.Calculate`, not a new route.
- **`b *float64` (pointer) instead of `b float64`.** This lets the API
  distinguish "b was omitted" (nil  valid for unary ops like `sqrt`) from
  "b was explicitly `0`" (valid, e.g. `add(5, 0)`), and lets `Calculate`
  return a clear `ErrMissingOperand` for binary operations instead of
  silently treating a missing field as zero.
- **Every calculator error is a client (400) error.** There is no
  legitimate server-side failure mode in the arithmetic itself, so mapping
  all domain errors to `400 Bad Request` keeps the status codes honest 
  the client sent something that can't be computed, not something the
  server broke on.
- **`DisallowUnknownFields()` on the JSON decoder.** Silently ignoring typos
  like `"operaton"` would return a confusing 400 for the wrong field, or
  worse, silently default to add. Rejecting unknown fields surfaces the
  mistake immediately.
- **Non-root user + `HEALTHCHECK` in the Docker image** small production
  hygiene choices that cost nothing and matter once this runs anywhere
  beyond a laptop.
