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
```
docker exec fitness-db pg_dumpall -U fitness > /root/fitness-old-db.sql
tar czf /root/fitness-old-files.tgz -C /opt fitness
docker images; docker volume ls; docker ps -a   > old-docker-inventory.txt   (saved to the PC)
scp root@206.189.185.233:/root/fitness-old-db.sql root@206.189.185.233:/root/fitness-old-files.tgz /c/Users/VICTUS/fitness-old-backup/
```
The dump used `docker exec fitness-db` rather than the brief's `docker compose exec -T db` because the project uses two compose files
(`docker-compose.yml` + `deploy/docker-compose.prod.yml`) and a fixed container name; `docker exec` (no TTY, no -t) avoids needing the compose file arguments and gives the same result.

## Gate evidence (in order; all passed before any deletion)
1. Server files: `ls -l /root/fitness-old-*` -> fitness-old-db.sql 23732, fitness-old-files.tgz 1731.
2. Server hashes `sha256sum /root/fitness-old-*` -> 0433c80b...0195 (sql), 716d286b...d9f5 (tgz).
3. `gzip -t /root/fitness-old-files.tgz && echo gzok` -> `gzok`.
4. Local `stat -c '%n %s' *` -> 23732 / 1731 / 1672 (sizes equal remote).
5. Local `sha256sum fitness-old-*` -> identical to server hashes above.
6. Local `gzip -t fitness-old-files.tgz` -> OK (`localgzok`).
7. `tar tzf fitness-old-files.tgz` ->
   fitness/, fitness/docker-compose.yml, fitness/deploy/, **fitness/deploy/Caddyfile**, fitness/deploy/docker-compose.prod.yml, fitness/.env
8. `grep -c "CREATE TABLE" fitness-old-db.sql` -> 12 (required >= 12). Last dump line: `-- PostgreSQL database cluster dump complete`.
(Items 4-8 were re-run read-only after the fact for this document; values identical to those seen at the gate.)

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
Prereq: the app images `fitness-api:latest` and `fitness-web:latest` were deleted and are NOT in the archive. They must be rebuilt or
pulled from wherever the old project's source lives (the compose file expects images loaded onto the server by the old deploy.sh). The
archive only has compose files, the Caddyfile and .env. Postgres and Caddy images are pulled automatically.

1. Copy back to the server (Git Bash on the PC):
   ```
   scp /c/Users/VICTUS/fitness-old-backup/fitness-old-files.tgz /c/Users/VICTUS/fitness-old-backup/fitness-old-db.sql root@206.189.185.233:/root/
   ```
2. On the server, extract to /opt/fitness:
   ```
   tar xzf /root/fitness-old-files.tgz -C /opt        # creates /opt/fitness (with .env, compose files, deploy/Caddyfile)
   ```
3. Database only (needs DB_PASSWORD from /opt/fitness/.env; the dump also recreates the role with its original hash):
   ```
   docker run -d --name fitness-db -e POSTGRES_USER=fitness -e POSTGRES_PASSWORD="$(grep ^DB_PASSWORD= /opt/fitness/.env | cut -d= -f2-)" -v fitness_pgdata:/var/lib/postgresql/data postgres:16-alpine
   # wait until ready: docker exec fitness-db pg_isready -U fitness
   docker exec -i fitness-db psql -U fitness -d postgres < /root/fitness-old-db.sql
   ```
   psql will report `ERROR: role "fitness" already exists` (and possibly that database(s) exist); this is expected and harmless.
   If you then use compose for the full stack, remove this standalone container first (`docker rm -f fitness-db`); the named volume `fitness_pgdata` is kept.
4. Full stack, after the app images are available as `fitness-api:latest` and `fitness-web:latest`:
   ```
   cd /opt/fitness && docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
   ```
   (If doing this, restore the DB via step 3 against the compose-created `fitness-db` instead, using `docker exec -i fitness-db psql ...`.)
