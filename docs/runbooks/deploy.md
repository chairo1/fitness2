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

## CI/CD

- `.github/workflows/ci.yml` runs on every push and PR: Postgres 16, migrations, lint, typecheck, unit tests, API e2e.
- `.github/workflows/deploy.yml` runs on push to `main`: it calls CI first, then builds `apps/api` and `apps/web` images, pushes them to `ghcr.io/chairo1/fitness2-api` and `fitness2-web` (tags `<sha>` and `latest`), copies the `deploy/` files to the server and runs `deploy.sh <sha>`. Only one deploy runs at a time (`concurrency: deploy`).
- Deploy files are written in place (`cat > file`), so the Caddyfile bind mount keeps its inode. `/opt/fitness2/.env` is never touched.
- The workflow logs in to GHCR on the server with the job's `GITHUB_TOKEN` and logs out afterwards, so packages may stay private.

### GitHub Secrets (Settings -> Secrets and variables -> Actions)

- `DEPLOY_HOST` - server IP or host name
- `DEPLOY_USER` - SSH user (`root`)
- `DEPLOY_SSH_KEY` - private key of the dedicated deploy key (whole file, including header and footer lines)

`GITHUB_TOKEN` is provided automatically. In Settings -> Actions -> General, workflow permissions must allow writing packages (the workflow requests `packages: write` itself).

### Generate the deploy key

On your PC (dedicated key, no passphrase):

```bash
ssh-keygen -t ed25519 -N "" -C "fitness2-deploy" -f ./fitness2_deploy
ssh-copy-id -i ./fitness2_deploy.pub root@206.189.185.233   # or append the .pub line to ~/.ssh/authorized_keys on the server
```

Paste the content of `fitness2_deploy` into the `DEPLOY_SSH_KEY` secret, then delete both local files.

## One-time server setup

```bash
ssh root@206.189.185.233
mkdir -p /opt/fitness2/backups && cd /opt/fitness2
# copy deploy/.env.example here as .env (scp from your PC, or paste it), then:
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 32)|" .env   # hex is URL-safe
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
PW=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2)
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://fitness:${PW}@db:5432/fitness|" .env
chmod 600 .env
```

Check `.env`: `WEB_HOST`, `ADMIN_HOST`, `COOKIE_SECURE=true`, DATABASE_URL password equals POSTGRES_PASSWORD.

Backup cron (see backup-restore.md):

```bash
(crontab -l 2>/dev/null; echo '15 3 * * * /opt/fitness2/backup.sh >> /opt/fitness2/backups/backup.log 2>&1') | crontab -
```

DNS: `fit2.chairops.online` and `ad2.chairops.online` -> `206.189.185.233` (Cloudflare DNS-only). Ports 80 and 443 must be open. The old project must be removed first (old-project-removal.md): its Caddy holds ports 80/443.

## First deploy

Push to `main` (or re-run the Deploy workflow). The workflow copies `docker-compose.yml`, `Caddyfile`, `deploy.sh`, `backup.sh` and starts the stack. Verify:

```bash
curl -s https://fit2.chairops.online/api/health   # {"status":"ok","db":"ok"}
```

Manual fallback (images already in GHCR, packages private):

```bash
echo "<GHCR_TOKEN>" | docker login ghcr.io -u chairo1 --password-stdin
/opt/fitness2/deploy.sh <TAG>
docker logout ghcr.io
```

## Create the first admin

```bash
cd /opt/fitness2
docker compose exec api create-admin --email you@example.com --password 'LongPassword123'
```

The password ends up in the shell history. Prefix the command with a space (works when `HISTCONTROL=ignorespace`/`ignoreboth`) or clear it afterwards with `history -c && history -w`.

Login at `https://ad2.chairops.online`.

## Deploy a new version

```bash
cd /opt/fitness2
./deploy.sh <TAG>      # e.g. a git sha or v1.0.0
```

The script sets `TAG` in `.env`, pulls images, runs `docker compose up -d`, waits up to 90 s for `https://fit2.chairops.online/api/health`, then checks `https://ADMIN_HOST/` answers non-5xx, then removes old images (keeps the current, previous and `latest` tags) and prunes dangling ones. If the check fails it prints the last 100 log lines and exits 1.

If `Caddyfile` or `docker-compose.yml` changed and you deploy by hand, copy them to the server first with `cat > file` over ssh (CI does this on every deploy). `deploy.sh` then runs `caddy reload` (and `docker compose restart caddy` if reload fails), because a changed bind-mounted Caddyfile is not picked up otherwise. The TAG may only contain letters, digits, `.`, `_`, `-`.

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
