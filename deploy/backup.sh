#!/usr/bin/env bash
# Nightly Postgres backup. Cron (root):
# 15 3 * * * /opt/fitness2/backup.sh >> /opt/fitness2/backups/backup.log 2>&1
set -euo pipefail

cd /opt/fitness2
BACKUP_DIR=/opt/fitness2/backups
OUT="$BACKUP_DIR/fitness-$(date +%F).sql.gz"
mkdir -p "$BACKUP_DIR"

# Remove the partial file if anything fails (pipefail catches a failed pg_dump).
cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    rm -f "$OUT"
    echo "$(date -Is) backup FAILED"
  fi
}
trap cleanup EXIT

docker compose exec -T db pg_dump -U fitness fitness | gzip > "$OUT"

find "$BACKUP_DIR" -name 'fitness-*.sql.gz' -type f -mtime +7 -delete
echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
