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

The tgz holds only compose files, `deploy/Caddyfile` and `.env`. No app source was on the server (images were built elsewhere and loaded).

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
docker images; docker volume ls; docker ps -a        # output saved to old-docker-inventory.txt on the PC (via ssh redirect)
```
Run from Git Bash on the PC:
```
scp root@206.189.185.233:/root/fitness-old-db.sql root@206.189.185.233:/root/fitness-old-files.tgz /c/Users/VICTUS/fitness-old-backup/
```
The dump used `docker exec fitness-db` rather than the brief's `docker compose exec -T db` because the project uses two compose files
(`docker-compose.yml` + `deploy/docker-compose.prod.yml`) and a fixed container name; `docker exec` (no TTY, no -t) avoids needing the compose file arguments and gives the same result.

## Gate evidence (in order; items 1-3 were observed at gate time, before any deletion)
1. Server files: `ls -l /root/fitness-old-*` -> fitness-old-db.sql 23732, fitness-old-files.tgz 1731.
2. Server hashes `sha256sum /root/fitness-old-*` -> 0433c80b...0195 (sql), 716d286b...d9f5 (tgz).
3. `gzip -t /root/fitness-old-files.tgz && echo gzok` -> `gzok`.
4. [post-hoc re-run, values match gate] Local `stat -c '%n %s' *` -> 23732 / 1731 / 1672 (sizes equal remote).
5. [post-hoc re-run, values match gate] Local `sha256sum fitness-old-*` -> identical to server hashes above.
6. [post-hoc re-run, values match gate] Local `gzip -t fitness-old-files.tgz` -> OK (`localgzok`).
7. [post-hoc re-run, values match gate] `tar tzf fitness-old-files.tgz` ->
   fitness/, fitness/docker-compose.yml, fitness/deploy/, **fitness/deploy/Caddyfile**, fitness/deploy/docker-compose.prod.yml, fitness/.env
8. [post-hoc re-run, values match gate] `grep -c "CREATE TABLE" fitness-old-db.sql` -> 12 (required >= 12). Last dump line: `-- PostgreSQL database cluster dump complete`.
Items 1-3 are as captured at the gate (server side, before deletion). Items 4-8 were checked at the gate, but the values listed were re-run read-only on the local copy after the removal and match what the gate showed.

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
Prereq: the app images `fitness-api:latest` and `fitness-web:latest` were deleted and are NOT in the archive (it has only the compose files, the Caddyfile and .env). They must be rebuilt or pulled from wherever the old project's source lives, and be present locally before step 4. Postgres and Caddy images are pulled automatically.
The archived .env uses the key `DB_PASSWORD` (also DB_USER, DB_NAME, JWT_SECRET, ADMIN_*, APP_HOST, ADMIN_HOST; checked by listing key names only). The compose db service is named `db` (container `fitness-db`, volume `pgdata` -> `fitness_pgdata`).

1. Run from Git Bash on the PC:
   ```
   scp /c/Users/VICTUS/fitness-old-backup/fitness-old-files.tgz /c/Users/VICTUS/fitness-old-backup/fitness-old-db.sql root@206.189.185.233:/root/
   ```
2. On the server (bash):
   ```
   set -euo pipefail
   tar xzf /root/fitness-old-files.tgz -C /opt        # creates /opt/fitness (.env, compose files, deploy/Caddyfile)
   cd /opt/fitness
   C="docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml"

   # (a) start only the database; Compose creates the labelled fitness_pgdata volume itself
   $C up -d db

   # (b) wait for Postgres, at most 30 tries x 2 s
   ok=0
   for i in $(seq 1 30); do
     if docker exec fitness-db pg_isready -U fitness; then ok=1; break; fi
     sleep 2
   done
   [ "$ok" = 1 ] || { echo "postgres not ready"; exit 1; }

   # (c) load the dump
   docker exec -i fitness-db psql -v ON_ERROR_STOP=0 -U fitness -d postgres < /root/fitness-old-db.sql
   ```
   Expected noise from (c): `ERROR: role "fitness" already exists` (and possibly that the database already exists). This is harmless.
   Sanity check: `docker exec fitness-db psql -U fitness -d "$(grep ^DB_NAME= .env | cut -d= -f2-)" -c '\dt'` should list 12 tables.
3. Start the rest of the stack (the app images must exist locally):
   ```
   $C up -d
   ```
   (run in the same shell session as step 2 so `$C` is set; otherwise spell out the full compose command.)
