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

### Web dev env (`pnpm --filter web dev`)

Create `apps/web/.env.local` from `apps/web/.env.example`. It holds `ADMIN_HOST`, `API_ORIGIN` and `API_INTERNAL_URL`. The ports must match the root `.env` `API_PORT` (default 3000; use 3002 only as a local override when 3000 is busy). The public site is at http://localhost:3001 and the admin area at http://admin.localhost:3001 (`*.localhost` resolves to loopback in modern browsers).

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

## Rules for Plan 2 (admin features)

- Every admin API route must use `@Roles('admin')` (with `JwtGuard` + `RolesGuard`). Never rely on the web app hiding links.
- Admin pages must not rely on the admin layout alone for protection: each page/server action must itself verify the session role, and the API remains the real authority.
