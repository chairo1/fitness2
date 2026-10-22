# Local development

Requirements: Node 22, pnpm 9.15 (`corepack enable`), Docker.

## Setup

```bash
pnpm install
cp .env.example .env        # root .env is git-ignored; package scripts read it via dotenv
docker compose up -d db     # Postgres on localhost:5432
pnpm --filter @fit/db migrate:deploy
```

`.env` needs at least `DATABASE_URL=postgresql://fitness:fitness@localhost:5432/fitness`, `JWT_SECRET`, `COOKIE_SECURE=false`.

## Run

```bash
pnpm --filter api dev       # API
pnpm --filter web dev       # web on :3001
```

Or run the whole stack with `docker compose up --build`.

## Checks (same as CI)

```bash
pnpm turbo run lint typecheck test
pnpm --filter api test:e2e   # needs the db running and migrated
```

CI runs exactly these against a Postgres 16 service (`.github/workflows/ci.yml`).

The web Playwright e2e (`pnpm --filter web e2e`) is NOT run in CI: it needs the api and db running together. Run it locally with the stack up.

## Create an admin locally

```bash
pnpm --filter @fit/db create-admin --email you@example.com --password 'LongPassword123'
```

See deploy.md for CI/CD, server setup and rollback.
