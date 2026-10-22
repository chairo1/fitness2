# Backup and restore

Nightly `pg_dump` at 03:15 server time. Files: `/opt/fitness2/backups/fitness-YYYY-MM-DD.sql.gz`. The last 7 days are kept. There is no off-server copy; download one sometimes.

## Install the cron job

```bash
chmod +x /opt/fitness2/backup.sh
crontab -e
```

Add this line:

```
15 3 * * * /opt/fitness2/backup.sh >> /opt/fitness2/backups/backup.log 2>&1
```

## Run a backup now

```bash
/opt/fitness2/backup.sh
ls -lh /opt/fitness2/backups
tail /opt/fitness2/backups/backup.log
```

If the dump fails, the script deletes the partial file and exits non-zero.

## Check a backup

```bash
gunzip -t /opt/fitness2/backups/fitness-2026-10-22.sql.gz && echo OK
zcat /opt/fitness2/backups/fitness-2026-10-22.sql.gz | head
```

## Restore

This replaces the current data. Stop api and web first so nothing writes.

```bash
cd /opt/fitness2
docker compose stop api web
docker compose exec -T db psql -U fitness -d postgres -c "DROP DATABASE IF EXISTS fitness WITH (FORCE);"
docker compose exec -T db psql -U fitness -d postgres -c "CREATE DATABASE fitness OWNER fitness;"
gunzip -c backups/fitness-2026-10-22.sql.gz | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U fitness -d fitness
docker compose up -d
```

Check:

```bash
docker compose ps
curl -fsS https://fit2.chairops.online/api/health
```

## Download a backup to your PC

```bash
scp root@206.189.185.233:/opt/fitness2/backups/fitness-2026-10-22.sql.gz .
```
