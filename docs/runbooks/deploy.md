# Deploy runbook

Server: `206.189.185.233`, user `root`, folder `/opt/fitness2`. Nothing is built on the server; images come from GHCR.

## Files on the server

```
/opt/fitness2/docker-compose.yml   (copy of deploy/docker-compose.prod.yml)
/opt/fitness2/Caddyfile
/opt/fitness2/.env                 (copy of deploy/.env.example, real secrets)
/opt/fitness2/deploy.sh
/opt/fitness2/backup.sh
/opt/fitness2/backups/
```

All commands run inside `/opt/fitness2` and use plain `docker compose` (no `-f`).

## First-time setup

From your PC:

```bash
ssh root@206.189.185.233 "mkdir -p /opt/fitness2/backups"
scp deploy/docker-compose.prod.yml root@206.189.185.233:/opt/fitness2/docker-compose.yml
scp deploy/Caddyfile deploy/deploy.sh deploy/backup.sh root@206.189.185.233:/opt/fitness2/
scp deploy/.env.example root@206.189.185.233:/opt/fitness2/.env
```

On the server:

```bash
cd /opt/fitness2
chmod 600 .env && chmod +x deploy.sh backup.sh
nano .env        # set POSTGRES_PASSWORD, DATABASE_URL (same password), JWT_SECRET
# only if the images are private:
echo "<GHCR_TOKEN>" | docker login ghcr.io -u chairo1 --password-stdin
./deploy.sh <TAG>
```

DNS: `fit2.chairops.online` and `ad2.chairops.online` -> `206.189.185.233` (Cloudflare DNS-only). Ports 80 and 443 must be open.

## Create the first admin

```bash
cd /opt/fitness2
docker compose exec api create-admin --email you@example.com --password 'LongPassword123'
```

Login at `https://ad2.chairops.online`.

## Deploy a new version

```bash
cd /opt/fitness2
./deploy.sh <TAG>      # e.g. a git sha or v1.0.0
```

The script sets `TAG` in `.env`, pulls images, runs `docker compose up -d`, waits up to 90 s for `https://fit2.chairops.online/api/health`, then prunes old images. If the check fails it prints the last 100 log lines and exits 1.

If `Caddyfile` or `docker-compose.yml` changed, copy them to the server first (scp as above; CI does this on every deploy). `deploy.sh` then runs `caddy reload` (and `docker compose restart caddy` if reload fails), because a changed bind-mounted Caddyfile is not picked up otherwise. The TAG may only contain letters, digits, `.`, `_`, `-`.

## Roll back

```bash
./deploy.sh <previous-TAG>
```

Migrations run when the api starts. Do not roll back across a destructive migration; restore a backup instead (see backup-restore.md).

## Useful commands

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 caddy
docker stats --no-stream
```

## Backup cron

See backup-restore.md.
