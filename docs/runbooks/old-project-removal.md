# Old project archive and removal (2026-10-22)

Server: root@206.189.185.233. Old project: compose project `fitness` in `/opt/fitness`
(files: `docker-compose.yml` + `deploy/docker-compose.prod.yml`).

## Archive (on user's PC, outside repo): `C:\Users\VICTUS\fitness-old-backup\`
| File | Bytes | sha256 (local == remote) |
|---|---|---|
| fitness-old-db.sql | 23732 | 0433c80b6681a919488969eb62399c9c0d1ebb601bfd66cf8a66b631c8af0195 |
| fitness-old-files.tgz | 1731 | 716d286bc2a7f07fb75042f7f161fd98d699982d63f6723181d985d808cdc9f5 |
| old-docker-inventory.txt | 1672 | (docker images / volume ls / ps -a before removal) |

Note: the tgz holds only config (compose files, deploy/Caddyfile, .env); images were built elsewhere, no app source was on the server.

## Commands run
1. `docker exec fitness-db pg_dumpall -U fitness > /root/fitness-old-db.sql`
2. `tar czf /root/fitness-old-files.tgz -C /opt fitness`
3. `scp` both files to the archive folder
4. Verified: `gzip -t` OK (remote and local); sha256 match; sizes match; `tar tzf` lists `fitness/deploy/Caddyfile`; `grep -c "CREATE TABLE" fitness-old-db.sql` = 12; dump ends with "cluster dump complete".
5. Removal: `cd /opt/fitness && docker compose -p fitness -f docker-compose.yml -f deploy/docker-compose.prod.yml down -v --rmi all`; `rm -rf /opt/fitness /root/fitness-old-*`

## Removed
- Containers: fitness-caddy, fitness-web, fitness-api, fitness-db
- Volumes: fitness_caddy_config, fitness_caddy_data, fitness_pgdata
- Network: fitness_default
- Images: caddy:2.10-alpine, fitness-api:latest, fitness-web:latest, postgres:16-alpine (only used by the old project)
- Dirs: /opt/fitness, /root/fitness-old-db.sql, /root/fitness-old-files.tgz
- Not run: docker system prune. Nothing else touched.

## After
- `ss -ltnp | grep -E ':80 |:443 '` empty. No containers, volumes, or images remain.
- Disk `/`: used 6.8G, 18G free before; 5.9G used, 19G free after.

## Restore
```
mkdir restore && tar xzf fitness-old-files.tgz -C restore      # gives restore/fitness/...
# start a postgres:16-alpine container with POSTGRES_USER=fitness, then:
cat fitness-old-db.sql | docker exec -i <db-container> psql -U fitness -d postgres
```
