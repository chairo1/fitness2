# Old project archive and removal (2026-10-22)

Server: root@206.189.185.233. Old project: compose project `fitness` in `/opt/fitness`
(files: `docker-compose.yml` + `deploy/docker-compose.prod.yml`). Containers: fitness-caddy, fitness-web, fitness-api, fitness-db.

SENSITIVE: `C:\Users\VICTUS\fitness-old-backup\` contains the old `.env` (DB password, JWT secret, admin password; inside the tgz)
and Postgres role password hashes (inside the dump). Keep it private; do not commit, share or sync it.

## Archive
| File | Bytes | sha256 |
|---|---|---|
| fitness-old-db.sql | 23732 | 0433c80b6681a919488969eb62399c9c0d1ebb601bfd66cf8a66b631c8af0195 |
| fitness-old-files.tgz | 1731 | 716d286bc2a7f07fb75042f7f161fd98d699982d63f6723181d985d808cdc9f5 |
| old-docker-inventory.txt | 1672 | 0dd29709b5ff6f2cccb2839f4f9bbfcf76d83d6a0869414e77448fccba912947 (computed after the fact; it was not hashed on the server) |

The tgz holds only compose files, `deploy/Caddyfile` and `.env`. No app source was on the server (per a comment in the prod compose file, images were built elsewhere).

## Pre-checks (before archiving)
```
docker inspect fitness-db --format '{{ index .Config.Labels "com.docker.compose.project" }} | {{ index .Config.Labels "com.docker.compose.project.working_dir" }} | {{ index .Config.Labels "com.docker.compose.project.config_files" }}'
  -> fitness | /opt/fitness | /opt/fitness/docker-compose.yml,/opt/fitness/deploy/docker-compose.prod.yml
docker exec fitness-db env | grep POSTGRES_USER      -> POSTGRES_USER=fitness   (this is how the DB user was read)
df -h /   (BEFORE) -> /dev/vda1  25G  6.8G used  18G avail  28%
ss -ltnp | grep -E ':80 |:443 '  -> docker-proxy listening on 80 and 443 (v4 and v6)
```

## Archive commands
Run on the SERVER (ssh root@206.189.185.233):
```
docker exec fitness-db pg_dumpall -U fitness > /root/fitness-old-db.sql
tar czf /root/fitness-old-files.tgz -C /opt fitness
```
Run from Git Bash on the PC (the inventory is written straight to the PC; it never existed as a file on the server):
```
scp root@206.189.185.233:/root/fitness-old-db.sql root@206.189.185.233:/root/fitness-old-files.tgz /c/Users/VICTUS/fitness-old-backup/
ssh root@206.189.185.233 'docker images; docker volume ls; docker ps -a' > /c/Users/VICTUS/fitness-old-backup/old-docker-inventory.txt
```
The dump used `docker exec fitness-db` rather than the brief's `docker compose exec -T db` because the project uses two compose files
(`docker-compose.yml` + `deploy/docker-compose.prod.yml`) and a fixed container name; `docker exec` (no TTY, no -t) avoids needing the compose file arguments and gives the same result.

## Gate evidence (items 1-3 captured at the gate, before deletion; items 4-8 re-run after the removal, see note)
1. Server files: `ls -l /root/fitness-old-*` -> fitness-old-db.sql 23732, fitness-old-files.tgz 1731.
2. Server hashes `sha256sum /root/fitness-old-*` -> 0433c80b...0195 (sql), 716d286b...d9f5 (tgz).
3. `gzip -t /root/fitness-old-files.tgz && echo gzok` -> `gzok`.
4. [re-run after removal] Local `stat -c '%n %s' *` -> 23732 / 1731 / 1672 (sql and tgz sizes equal the server sizes in item 1).
5. [re-run after removal] Local `sha256sum fitness-old-*` -> identical to server hashes above.
6. [re-run after removal] Local `gzip -t fitness-old-files.tgz` -> OK (`localgzok`).
7. [re-run after removal] `tar tzf fitness-old-files.tgz` ->
   fitness/, fitness/docker-compose.yml, fitness/deploy/, **fitness/deploy/Caddyfile**, fitness/deploy/docker-compose.prod.yml, fitness/.env
8. [re-run after removal] `grep -c "CREATE TABLE" fitness-old-db.sql` -> 12 (required >= 12). Last dump line: `-- PostgreSQL database cluster dump complete`.
Note: items 1-3 are the server-side output captured at the gate, before deletion. For items 4-8 no gate-time output was preserved:
the original task report says these local checks passed before the removal, but that cannot be shown from saved evidence.
The values listed for 4-8 come from a read-only re-run on the local copy after the removal. They still prove the archive is
complete and identical to what was on the server (item 5 matches the gate-time server hashes in item 2).

## Removal
Removed (and nothing else; no `docker system prune`):
- Containers fitness-caddy, fitness-web, fitness-api, fitness-db
- Volumes fitness_caddy_config, fitness_caddy_data, fitness_pgdata; network fitness_default
- Images caddy:2.10-alpine, fitness-api:latest, fitness-web:latest, postgres:16-alpine (no other containers used them)
- /opt/fitness, /root/fitness-old-db.sql, /root/fitness-old-files.tgz
```
cd /opt/fitness && docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml down -v --rmi all
rm -rf /opt/fitness /root/fitness-old-*
```
After: `docker ps -a`, `docker volume ls`, `docker images` empty; `/opt` = containerd, digitalocean; `/root` = snap;
`ss -ltnp | grep -E ':80 |:443 '` empty; `df -h /` (AFTER) -> 25G, 5.9G used, 19G avail, 25%.

## Restore
Prereq: the app images `fitness-api:latest` and `fitness-web:latest` were deleted and are NOT in the archive (it has only the compose files, the Caddyfile and .env). They must be rebuilt or pulled from wherever the old project's source lives, and be present locally before step 3. Postgres and Caddy images are pulled automatically.
The archived .env uses the key `DB_PASSWORD` (also DB_USER, DB_NAME, JWT_SECRET, ADMIN_*, APP_HOST, ADMIN_HOST; checked by listing key names only; DB_USER and DB_NAME are both `fitness`). The compose db service is named `db` (container `fitness-db`, volume `pgdata` -> `fitness_pgdata`) and sets POSTGRES_USER/POSTGRES_DB from DB_USER/DB_NAME, so a fresh volume already has role `fitness` and database `fitness` before the dump is loaded.

1. Run from Git Bash on the PC:
   ```
   scp /c/Users/VICTUS/fitness-old-backup/fitness-old-files.tgz /c/Users/VICTUS/fitness-old-backup/fitness-old-db.sql root@206.189.185.233:/root/
   ```
2. On the server, create the restore script and run it as a separate bash process (`set -e` / `exit 1` then end only the
   script, not your login shell). Paste the whole block (copy from the rendered page so the closing `EOF` starts its line):
   ```
   cat > /root/restore-fitness-db.sh <<'EOF'
   #!/usr/bin/env bash
   set -euo pipefail
   fail() { echo "FAIL: $*" >&2; exit 1; }

   # (0) only restore onto a clean slate
   [ ! -e /opt/fitness ] || fail "/opt/fitness already exists"
   ! docker volume inspect fitness_pgdata >/dev/null 2>&1 || fail "volume fitness_pgdata already exists"

   tar xzf /root/fitness-old-files.tgz -C /opt        # creates /opt/fitness (.env, compose files, deploy/Caddyfile)
   cd /opt/fitness
   C=(docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml)

   # (a) start only the database; Compose creates the labelled fitness_pgdata volume itself
   "${C[@]}" up -d db

   # (b) wait for the FINAL server, at most 30 tries x 2 s. Probe over TCP: on a fresh volume the image first runs a
   #     temporary init server that listens on the Unix socket only, so a socket probe could succeed too early.
   ok=0
   for i in $(seq 1 30); do
     if docker exec fitness-db pg_isready -h 127.0.0.1 -U fitness -d fitness >/dev/null 2>&1; then ok=1; break; fi
     sleep 2
   done
   [ "$ok" = 1 ] || fail "postgres not accepting TCP connections after 60 s"

   # (c) load the dump over TCP and stop on the first error. The two statements for objects the image already
   #     created (CREATE ROLE fitness; CREATE DATABASE fitness ...) are filtered out; ALTER ROLE / ALTER DATABASE still run.
   grep -v -e '^CREATE ROLE fitness;$' -e '^CREATE DATABASE fitness ' /root/fitness-old-db.sql \
     | docker exec -i fitness-db psql -h 127.0.0.1 -U fitness -d postgres -v ON_ERROR_STOP=1 -q \
     || fail "psql reported an error while loading the dump"

   # (d) automatic gate: 12 tables in public (the dump has 12 CREATE TABLE and no views) and 2 rows in users
   q() { docker exec fitness-db psql -h 127.0.0.1 -U fitness -d fitness -tAc "$1"; }
   t=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
   u=$(q "SELECT count(*) FROM public.users")
   [ "$t" = 12 ] && [ "$u" = 2 ] || fail "tables=$t (want 12), users=$u (want 2)"
   echo "RESTORE OK: $t public tables, $u users"
   EOF
   bash /root/restore-fitness-db.sh
   ```
   Pass = the last line printed is `RESTORE OK: 12 public tables, 2 users` and the exit status is 0. Any `FAIL:` line
   (non-zero exit) means the restore is not usable: do not continue to step 3. Inspect, then to start over remove only what
   the script created: `cd /opt/fitness && docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml down -v && rm -rf /opt/fitness`.
   Loopback TCP needs no password: the postgres image's initdb keeps `trust` for 127.0.0.1 inside the container.
3. Start the rest of the stack (the app images must exist locally):
   ```
   cd /opt/fitness && docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
   ```
