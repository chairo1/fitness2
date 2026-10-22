# Plan 1 — Təməl və Deploy (Foundation & Deploy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, working skeleton: monorepo, full database schema with seed, API with auth, one Next.js app serving the cabinet on `fit2.chairops.online` and the admin area on `ad2.chairops.online`, Docker + Caddy on the server, GitHub Actions CI/CD, nightly backup, and the old project archived locally and removed.

**Architecture:** pnpm + Turborepo monorepo. `apps/api` (NestJS REST under `/api`) owns all data access through `packages/db` (Prisma/PostgreSQL). `apps/web` (Next.js App Router) is a thin UI that calls `/api` on the same origin; Next.js middleware picks cabinet vs admin by `Host`. Images are built in CI, pushed to GHCR, and pulled on the 1 GB droplet.

**Tech Stack:** Node 22, pnpm 9 (via corepack), Turborepo 2, TypeScript 5 (strict), NestJS 11, Prisma 6, PostgreSQL 16, Next.js 15 (App Router, `output: 'standalone'`), next-intl 4, argon2, @nestjs/jwt, @nestjs/throttler, zod, Vitest, Jest+supertest (API e2e), Playwright, Docker, Caddy 2, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-22-fitness-ecosystem-design.md`

**Out of this plan (Plans 2–3):** week plan builder, chains, workout logging, timer, profile/calories, charts, muscle map, free-exercise-db import, admin features beyond the role-gated shell, final visual design. Plan 1 UI is deliberately plain (system font, neutral greys) — the visual direction is chosen with the user before Plan 2.

## Global Constraints

- Server `206.189.185.233`, SSH `root`, app dir `/opt/fitness2`. Nothing is built on the server.
- Domains: web `fit2.chairops.online`, admin `ad2.chairops.online` (Cloudflare DNS-only).
- Production containers: `caddy`, `web`, `api`, `db` only. Memory limits: caddy 64m, web 256m, api 256m, db 256m.
- Web UI locales: `az` (default) and `en`. Admin: `az` only.
- Registration open to everyone; no email verification; register/login rate-limited.
- Session: httpOnly cookie `fit_session` (JWT, 30 days), `Secure` in production, `SameSite=Lax`.
- Exercise measure types are exactly `reps_weight`, `reps`, `time`.
- Backup: nightly `pg_dump` on the server, keep last 7 days, no off-server copy.
- Old project: archive `/opt/fitness` files + DB dump to the user's PC, verify, then delete everything of it on the server.
- Secrets never committed: server `.env`, GitHub Secrets for SSH key.
- UI copy is short and imperative; no emoji, no gradients, no "sparkle" icons (spec §7).

## Review Focus

1. Admin pages requested via `fit2.chairops.online/admin` (or any `/admin` path on the web host) — must 404, never render admin UI. Test in Task 6.
2. A user blocked by an admin who still holds a valid cookie — `/api/auth/me` and every guarded route must return 401. Test in Task 4.
3. Same email with different case/whitespace (`Ali@Mail.com ` vs `ali@mail.com`) — treated as one account; second registration → 409. Test in Task 4.
4. Re-running migrations + seed on every deploy — must not duplicate muscle groups/exercises or touch user data. Test in Task 2.
5. Unknown or missing locale (`/fr/...`, `/`) — falls back to `az`, never a 500. Test in Task 6.

---

## File Structure

```
package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .gitignore, .editorconfig, .prettierrc, eslint.config.mjs
docker-compose.yml                 — local dev: db, api, web
packages/shared/src/auth.ts        — zod schemas: registerSchema, loginSchema; normalizeEmail()
packages/shared/src/index.ts
packages/db/prisma/schema.prisma   — full schema (spec §6)
packages/db/prisma/seed.ts         — muscle groups, equipment, 17 user exercises (idempotent upserts)
packages/db/src/seed-data.ts       — the seed rows as typed constants
packages/db/src/create-admin.ts    — CLI: create/promote admin
packages/db/src/index.ts           — re-exports PrismaClient + types
apps/api/src/main.ts, app.module.ts
apps/api/src/prisma/prisma.service.ts
apps/api/src/health/health.controller.ts
apps/api/src/auth/{auth.module,auth.controller,auth.service,jwt.guard,roles.guard,roles.decorator,current-user.decorator}.ts
apps/api/test/*.e2e-spec.ts
apps/api/Dockerfile
apps/web/next.config.ts, middleware.ts, src/i18n/{routing,request}.ts, messages/{az,en}.json
apps/web/src/lib/host.ts           — resolveArea(host) pure function
apps/web/src/lib/api.ts            — fetch wrapper for /api
apps/web/src/app/[locale]/(site)/page.tsx            — landing placeholder
apps/web/src/app/[locale]/(auth)/{login,register}/page.tsx
apps/web/src/app/[locale]/(cabinet)/cabinet/page.tsx
apps/web/src/app/admin/{layout,page}.tsx             — admin shell, AZ only, role-gated
apps/web/e2e/*.spec.ts
apps/web/Dockerfile
deploy/docker-compose.prod.yml, deploy/Caddyfile, deploy/.env.example, deploy/backup.sh, deploy/deploy.sh
.github/workflows/ci.yml, .github/workflows/deploy.yml
docs/runbooks/{local-dev,deploy,backup-restore,old-project-removal}.md
```

---

### Task 1: Monorepo scaffold + git

**Files:**
- Create: root config files listed above, `packages/shared/*`, `docker-compose.yml` (db service only for now: `postgres:16-alpine`, port 5432, volume `pgdata`, user/db `fitness`)
- Test: `packages/shared/src/auth.test.ts`

**Interfaces:**
- Produces: `normalizeEmail(email: string): string` (trim + lowercase); `registerSchema` (`email` valid email, `password` 8–128 chars, `locale: 'az' | 'en'` default `'az'`); `loginSchema` (`email`, `password`); `type Locale = 'az' | 'en'`. Package name `@fit/shared`.

- [ ] **Step 1:** `git init`, `corepack enable`, `corepack prepare pnpm@9 --activate`; create root `package.json` (`"private": true`, `packageManager: pnpm@9.x`), workspace `apps/*`, `packages/*`; turbo tasks `build`, `lint`, `test`, `typecheck`.
- [ ] **Step 2: Write failing test** `auth.test.ts`:
  - `normalizeEmail('  Ali@Mail.COM ')` → `'ali@mail.com'`
  - `registerSchema.parse({email:'a@b.az', password:'1234567'})` throws (7 chars)
  - `registerSchema.parse({email:'a@b.az', password:'12345678'}).locale` → `'az'`
- [ ] **Step 3:** Run `pnpm --filter @fit/shared test` → FAIL (module missing).
- [ ] **Step 4:** Implement `packages/shared/src/auth.ts`.
- [ ] **Step 5:** Run `pnpm turbo run lint typecheck test` → all PASS.
- [ ] **Step 6:** Commit (include the already-written `docs/`): `chore: monorepo scaffold and shared auth schemas`.

### Task 2: Database schema + idempotent seed

**Files:**
- Create: `packages/db/prisma/schema.prisma`, `packages/db/src/seed-data.ts`, `packages/db/prisma/seed.ts`, `packages/db/src/create-admin.ts`, `packages/db/src/index.ts`
- Test: `packages/db/test/seed.test.ts` (runs against the dev Postgres from `docker-compose.yml`, `DATABASE_URL` from `.env`)

**Interfaces:**
- Produces (Prisma models, exact names): `User`(id cuid, email unique, passwordHash, role `Role {user admin}`, locale, status `UserStatus {active blocked}`, createdAt), `Profile`(userId unique, sex `Sex {male female}`, birthDate, heightCm, activityLevel `ActivityLevel {sedentary light moderate active very_active}`, defaultRestSec Int default 90), `BodyWeightEntry`(userId, date, kg Decimal(5,2)), `MuscleGroup`(id, slug unique, nameAz, nameEn, mapId), `Equipment`(slug unique, nameAz, nameEn), `Exercise`(slug unique, nameAz, nameEn, descriptionAz?, descriptionEn?, imageUrl?, measureType `MeasureType {reps_weight reps time}`, equipmentId, isCustomSeed Boolean), `ExerciseMuscle`(exerciseId, muscleGroupId, primary Boolean), `WeekPlan`(userId, status `PlanStatus {active archived}`), `PlanDay`(weekPlanId, weekday 1–7, isRest), `PlanDayMuscle`(planDayId, muscleGroupId), `PlanBlock`(planDayId, order, kind `BlockKind {single chain}`, intraRestSec Int default 0, restSec Int default 90), `PlanBlockExercise`(planBlockId, exerciseId, order), `WorkoutSession`(userId, planDayId?, startedAt, endedAt?, kcalEstimate?), `SessionBlock`(sessionId, order, kind, intraRestSec, restSec), `SessionBlockExercise`(sessionBlockId, exerciseId, order), `SetEntry`(sessionBlockId, exerciseId, round Int, reps?, weightKg Decimal(5,2)?, durationSec?, feel `Feel {easy normal hard}`?, loggedAt). All child relations `onDelete: Cascade` from User.
- Produces: `pnpm --filter @fit/db seed`, `pnpm --filter @fit/db create-admin -- --email <e> --password <p>` (creates, or promotes existing user to admin).

Seed data (`seed-data.ts`):
- Muscle groups (slug / AZ / EN): `chest` Sinə/Chest, `triceps` Triceps/Triceps, `forearms` Bilək/Forearms, `shoulders` Çiyin/Shoulders, `legs` Ayaq/Legs, `calves` Baldır/Calves, `traps` Traps/Traps, `back` Bel/Back, `biceps` Biceps/Biceps, `abs` Qarın/Abs. `mapId` = slug.
- Equipment: `bodyweight` Bədən çəkisi, `dumbbell` Dumbbell, `pullup_bar` Turnik, `parallel_bars` Paralel qol, `gym` Zal avadanlığı.
- Exercises: exactly the 17 rows of spec §5.4 table (EN name, AZ name, primary muscle, equipment, measure type), with Squat and Calf Raise as `dumbbell` / `reps_weight`; slugs kebab-case of EN name (e.g. `dip-shrug`, `dumbbell-squat`); `isCustomSeed: true`.

- [ ] **Step 1: Write failing test** `seed.test.ts`: run `seed()` twice; assert `muscleGroup.count() === 10`, `equipment.count() === 5`, `exercise.count({where:{isCustomSeed:true}}) === 17`; `exercise.findUnique({where:{slug:'plank'}}).measureType === 'time'`; `dumbbell-squat` is `reps_weight`; a pre-created `User` row still exists after the second seed run.
- [ ] **Step 2:** `docker compose up -d db`; run test → FAIL.
- [ ] **Step 3:** Write `schema.prisma`, `pnpm --filter @fit/db prisma migrate dev --name init`.
- [ ] **Step 4:** Implement `seed()` with `upsert` by slug only (never deletes); `create-admin.ts` hashes with argon2.
- [ ] **Step 5:** Run test → PASS.
- [ ] **Step 6:** Commit: `feat(db): schema and idempotent seed`.

### Task 3: API bootstrap + health

**Files:**
- Create: `apps/api/src/main.ts`, `app.module.ts`, `prisma/prisma.service.ts`, `health/health.controller.ts`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: global prefix `/api`; `GET /api/health` → `200 {status:'ok', db:'ok'}` (runs `SELECT 1`), `503 {status:'error', db:'down'}` on DB failure; `PrismaService` (extends PrismaClient, injectable, used by every later module); port from `PORT` (default 3000); `cookie-parser` enabled.

- [ ] **Step 1:** Write failing e2e test: `GET /api/health` → 200 with body `{status:'ok', db:'ok'}`.
- [ ] **Step 2:** Run `pnpm --filter api test:e2e` → FAIL.
- [ ] **Step 3:** Implement bootstrap, PrismaService, HealthController.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `feat(api): bootstrap and health endpoint`.

### Task 4: API auth

**Files:**
- Create: `apps/api/src/auth/*` (files listed in structure)
- Test: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `registerSchema`, `loginSchema`, `normalizeEmail` from `@fit/shared`; `PrismaService`.
- Produces:
  - `POST /api/auth/register` body `{email,password,locale?}` → 201 `{id,email,role,locale}`, sets cookie `fit_session`; 409 `{code:'EMAIL_TAKEN'}`; 400 on schema error.
  - `POST /api/auth/login` → 200 same body + cookie; 401 `{code:'INVALID_CREDENTIALS'}`; 403 `{code:'BLOCKED'}` for blocked users.
  - `POST /api/auth/logout` → 204, clears cookie.
  - `GET /api/auth/me` → 200 `{id,email,role,locale}` or 401.
  - `JwtGuard` (reads `fit_session`, loads user from DB on every request, rejects missing/blocked → 401), `@Roles('admin')` + `RolesGuard` (403), `@CurrentUser()` param decorator returning `{id, role, locale}`.
  - Throttle: register and login each max 10 requests / 15 min per IP.
  - Env: `JWT_SECRET` (required, app fails to start without it), `COOKIE_SECURE` (`true` in prod).

- [ ] **Step 1: Write failing tests:**
  - register → 201, `set-cookie` contains `fit_session` and `HttpOnly`; `/me` with that cookie → 200 email `ali@mail.com`
  - register `' Ali@Mail.com '` after `ali@mail.com` → 409 `EMAIL_TAKEN`
  - login wrong password → 401 `INVALID_CREDENTIALS`
  - set user `status=blocked` in DB, reuse old cookie on `/me` → 401; login → 403 `BLOCKED`
  - a test-only route guarded by `@Roles('admin')`: user → 403, admin → 200
  - 11th register within window → 429
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement module (argon2id hashing, JWT payload `{sub: userId}`, 30-day expiry).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `feat(api): cookie-based auth with roles and blocking`.

### Task 5: Local Docker for api + web dev wiring

**Files:**
- Create: `apps/api/Dockerfile` (multi-stage: deps → build → runtime `node:22-alpine`, runs `prisma migrate deploy && node dist/main.js` via entry script `apps/api/docker-entrypoint.sh`, then seed), `.dockerignore`
- Modify: `docker-compose.yml` — add `api` (build local, env from `.env`, depends on db healthy).

**Interfaces:**
- Produces: `docker compose up` → `http://localhost:3000/api/health` 200. Entry script order: `migrate deploy` → `seed` → start (seed is idempotent per Task 2).

- [ ] **Step 1:** Write Dockerfile, entrypoint, compose service.
- [ ] **Step 2:** Run `docker compose up -d --build api` then `curl -s localhost:3000/api/health` → `{"status":"ok","db":"ok"}`.
- [ ] **Step 3:** Run `docker compose restart api` and check `exercise` count is still 17 (`docker compose exec db psql -U fitness -c "select count(*) from \"Exercise\""`).
- [ ] **Step 4:** Commit: `build(api): dockerfile and local compose`.

### Task 6: Web app — i18n, host routing, auth pages, admin shell

**Files:**
- Create: everything under `apps/web/` in the structure.
- Test: `apps/web/src/lib/host.test.ts` (Vitest), `apps/web/e2e/auth.spec.ts` (Playwright against `docker compose` stack)

**Interfaces:**
- Consumes: auth API (Task 4).
- Produces:
  - `resolveArea(host: string | null, env: {ADMIN_HOST: string}): 'admin' | 'web'` — `'admin'` iff host (port stripped, lowercased) equals `ADMIN_HOST`; dev `ADMIN_HOST=admin.localhost`.
  - Middleware: area `admin` → rewrite every path to `/admin/...` (no locale prefix); area `web` → any path starting `/admin` returns 404, otherwise next-intl middleware (`locales ['az','en']`, `defaultLocale 'az'`, `localePrefix 'always'`).
  - `next.config.ts`: `output:'standalone'`, dev rewrite `/api/:path*` → `http://localhost:3000/api/:path*` (prod: Caddy routes `/api`).
  - Pages: landing placeholder (product name + "Qeydiyyat"/"Daxil ol" links), register, login, `/cabinet` (server-side `GET /api/auth/me`, redirect to login on 401, shows email + logout), admin `layout` (calls `/me`; non-admin → login page in admin area; shows "Admin panel" header), admin `page` ("İstifadəçilər — tezliklə" placeholder). All copy in `messages/az.json` / `en.json`; admin copy hard-coded AZ.
  - Language switch on web pages (AZ/EN), persists via URL prefix.

- [ ] **Step 1: Write failing unit tests** `host.test.ts`: `resolveArea('ad2.chairops.online', {ADMIN_HOST:'ad2.chairops.online'})` → `'admin'`; `'AD2.chairops.online:443'` → `'admin'`; `'fit2.chairops.online'` → `'web'`; `null` → `'web'`.
- [ ] **Step 2:** Run `pnpm --filter web test` → FAIL; implement `host.ts`; → PASS.
- [ ] **Step 3: Write failing e2e** `auth.spec.ts`:
  - `/` redirects to `/az`; `/fr` → 404 page (not 500); `/en` shows EN copy
  - register new user on `/az/register` → lands on `/az/cabinet` showing the email; logout → login page
  - `localhost:<port>/admin` (web host) → 404
  - on `admin.localhost:<port>/`: unauthenticated → admin login; normal user → "İcazə yoxdur"; admin (created via `create-admin`) → "Admin panel"
- [ ] **Step 4:** Implement middleware, i18n config, pages, `api.ts`.
- [ ] **Step 5:** Run `pnpm --filter web e2e` → PASS.
- [ ] **Step 6:** Write `apps/web/Dockerfile` (standalone), add `web` to `docker-compose.yml`; `docker compose up -d --build`; open `http://localhost:3001/az` → landing renders.
- [ ] **Step 7:** Commit: `feat(web): i18n, host-based admin area, auth pages`.

### Task 7: Production compose, Caddy, backup, deploy script

**Files:**
- Create: `deploy/docker-compose.prod.yml`, `deploy/Caddyfile`, `deploy/.env.example`, `deploy/backup.sh`, `deploy/deploy.sh`, `docs/runbooks/deploy.md`, `docs/runbooks/backup-restore.md`

**Interfaces:**
- Produces:
  - Compose services `caddy` (`caddy:2-alpine`, ports 80/443, volumes `caddy_data`, `caddy_config`), `web` (`ghcr.io/<owner>/fitness2-web:${TAG}`), `api` (`ghcr.io/<owner>/fitness2-api:${TAG}`), `db` (`postgres:16-alpine`, volume `pgdata`, `shared_buffers=64MB`, `max_connections=30`), each with the `mem_limit` from Global Constraints and `restart: unless-stopped`. Only caddy publishes ports.
  - Caddyfile: for each of `{$WEB_HOST}` and `{$ADMIN_HOST}`: `handle /api/*` → `reverse_proxy api:3000`; else `reverse_proxy web:3000`; `encode zstd gzip`.
  - `.env.example` keys: `TAG`, `GHCR_OWNER`, `WEB_HOST=fit2.chairops.online`, `ADMIN_HOST=ad2.chairops.online`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECURE=true`.
  - `backup.sh`: `docker compose exec -T db pg_dump -U fitness fitness | gzip > /opt/fitness2/backups/fitness-$(date +%F).sql.gz`, delete files older than 7 days; installed as root cron `15 3 * * *`.
  - `deploy.sh TAG`: in `/opt/fitness2`, set `TAG`, `docker compose pull`, `docker compose up -d`, wait for `https://$WEB_HOST/api/health` 200 (max 90 s), else print logs and exit 1; `docker image prune -f`.

- [ ] **Step 1:** Write files.
- [ ] **Step 2:** Validate locally: `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.example config` → exits 0; `docker run --rm -v ./deploy/Caddyfile:/etc/caddy/Caddyfile -e WEB_HOST=a.test -e ADMIN_HOST=b.test caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile` → "Valid configuration".
- [ ] **Step 3:** Commit: `ops: production compose, caddy, backup and deploy scripts`.

### Task 8: Archive and remove the old project (server ops)

**Files:**
- Create: `docs/runbooks/old-project-removal.md` (record exact commands run and the archive location/size)

Archive location on user's PC: `C:\Users\VICTUS\fitness-old-backup\` (outside the repo).

- [ ] **Step 1:** On server: `cd /opt/fitness && docker compose exec -T db pg_dumpall -U <user> > /root/fitness-old-db.sql` (read user from the container env) and `tar czf /root/fitness-old-files.tgz -C /opt fitness`.
- [ ] **Step 2:** `scp` both files to `C:\Users\VICTUS\fitness-old-backup\`.
- [ ] **Step 3: Verify:** `tar tzf fitness-old-files.tgz | head` lists `fitness/deploy/Caddyfile`; `grep -c "CREATE TABLE" fitness-old-db.sql` ≥ 12; local file sizes equal remote sizes (`stat`). Stop here if any check fails.
- [ ] **Step 4:** On server: `cd /opt/fitness && docker compose down -v --rmi all`; `docker volume ls` shows no `fitness_*` volumes; `rm -rf /opt/fitness /root/fitness-old-*`; `ss -ltnp | grep -E ':80|:443'` → empty.
- [ ] **Step 5:** Commit runbook: `docs: old project archived and removed`.

### Task 9: GitHub Actions CI/CD + first deploy

**Prerequisite (user):** create an empty GitHub repo (e.g. `fitness2`), give its URL; enable GHCR package write via `GITHUB_TOKEN`. Claude generates a dedicated deploy SSH key pair; user adds secrets `DEPLOY_HOST=206.189.185.233`, `DEPLOY_USER=root`, `DEPLOY_SSH_KEY` (private key); public key goes to server `~/.ssh/authorized_keys`.

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `docs/runbooks/local-dev.md`

**Interfaces:**
- `ci.yml`: on push + PR; Postgres 16 service; `pnpm install --frozen-lockfile`, `prisma migrate deploy`, `turbo run lint typecheck test`, API e2e.
- `deploy.yml`: on push to `main` after CI passes (`workflow_run` or `needs`); build `apps/api/Dockerfile` and `apps/web/Dockerfile` with `docker/build-push-action`, tags `${{ github.sha }}` and `latest`, push to GHCR; then SSH: copy `deploy/` files to `/opt/fitness2` (keep existing `.env`), run `deploy.sh ${{ github.sha }}`.
- Server one-time: create `/opt/fitness2/.env` from `.env.example` with generated `POSTGRES_PASSWORD` and `JWT_SECRET` (`openssl rand -hex 32`), `docker login ghcr.io` (if packages private), install backup cron.

- [ ] **Step 1:** Write workflows; push to GitHub; CI run → green.
- [ ] **Step 2:** One-time server setup above.
- [ ] **Step 3:** Merge/push to `main` → deploy job green.
- [ ] **Step 4: Verify live:**
  - `curl -s https://fit2.chairops.online/api/health` → `{"status":"ok","db":"ok"}`
  - `curl -sI https://fit2.chairops.online/` → 307 to `/az`; valid TLS certificate
  - `curl -s -o /dev/null -w "%{http_code}" https://fit2.chairops.online/admin` → `404`
  - `https://ad2.chairops.online/` → admin login page
  - `pnpm --filter @fit/db create-admin` run in the api container for the user's email; log in on ad2 → "Admin panel"
  - `docker stats --no-stream` → every container under its limit
  - run `/opt/fitness2/backup.sh` once → `.sql.gz` appears in `/opt/fitness2/backups`
- [ ] **Step 5:** Commit runbooks: `ci: build, test and deploy pipeline`.

---

## Self-review notes
- Spec coverage for Plan 1: §3 (server, domains, old project, no server build) → Tasks 7–9; §4 stack/repo/infra → Tasks 1–7, 9; §5.2 → Task 4; §5.11 admin role/first admin → Tasks 2, 4, 6; §6 schema → Task 2; §5.4 seed rows → Task 2; i18n → Task 6. Remaining spec sections are scheduled for Plans 2–3.
- Order constraint: Task 8 (old project removal) must run before Task 9 Step 3, because the old Caddy holds ports 80/443.
