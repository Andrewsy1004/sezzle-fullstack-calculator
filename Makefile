.PHONY: up down build test test-backend test-frontend lint

## Run the full stack via Docker Compose
up:
	docker compose up --build

## Stop and remove containers
down:
	docker compose down

## Build both Docker images without starting them
build:
	docker compose build

## Run backend + frontend test suites
test: test-backend test-frontend

test-backend:
	cd backend && go test ./... -cover

test-frontend:
	cd frontend && pnpm install --frozen-lockfile && pnpm test:coverage

## Lint the frontend
lint:
	cd frontend && pnpm lint
