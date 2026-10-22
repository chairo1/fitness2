#!/usr/bin/env bash
# Usage: ./deploy.sh <TAG>   (installed in /opt/fitness2)
set -euo pipefail

TAG="${1:?usage: deploy.sh TAG}"
[[ $TAG =~ ^[A-Za-z0-9._-]+$ ]] || { echo "invalid TAG: $TAG" >&2; exit 1; }
cd /opt/fitness2

[ -f .env ] || { echo ".env not found in /opt/fitness2" >&2; exit 1; }

# Remember the currently deployed TAG (kept for rollback when pruning images).
PREV_TAG="$(grep -E '^TAG=' .env | tail -n1 | cut -d= -f2- | tr -d '\r "' || true)"

# Set TAG in .env (replace or append).
if grep -q '^TAG=' .env; then
  sed -i "s|^TAG=.*|TAG=${TAG}|" .env
else
  echo "TAG=${TAG}" >> .env
fi

# Read WEB_HOST without sourcing the file.
WEB_HOST="$(grep -E '^WEB_HOST=' .env | tail -n1 | cut -d= -f2- | tr -d '\r "')"
[ -n "$WEB_HOST" ] || { echo "WEB_HOST missing in .env" >&2; exit 1; }

docker compose pull
docker compose up -d --remove-orphans

# A changed bind-mounted Caddyfile does not recreate the container: validate,
# then reload. An invalid config is never loaded; the old one keeps running.
if ! docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile; then
  echo "Caddyfile validation failed; NOT reloading caddy (old config keeps running)." >&2
  exit 1
fi
if ! docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile; then
  echo "caddy reload failed, restarting caddy" >&2
  docker compose restart caddy
fi

echo "Waiting for https://${WEB_HOST}/api/health (max 90s)..."
deadline=$((SECONDS + 90))
until curl -fsS --max-time 5 -o /dev/null "https://${WEB_HOST}/api/health"; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "Health check failed after 90s. Recent logs:" >&2
    docker compose logs --tail=100 >&2
    exit 1
  fi
  sleep 3
done

# Admin host must answer too (any status below 500; the root may redirect).
echo "Waiting for https://${ADMIN_HOST}/ to answer non-5xx (same 90s budget)..."
until code="$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "https://${ADMIN_HOST}/" || true)";   [[ $code =~ ^[1-4][0-9][0-9]$ ]]; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "Admin host check failed (last status: ${code:-none}). Recent logs:" >&2
    docker compose logs --tail=100 >&2
    exit 1
  fi
  sleep 3
done

echo "Deploy OK: ${TAG}"

# Keep only the current and previous image tags (rollback), drop older ones.
for repo in fitness2-api fitness2-web; do
  docker images --format '{{.Repository}} {{.Tag}}' | while read -r r t; do
    case "$r" in
      */"$repo")
        if [ "$t" != "$TAG" ] && [ "$t" != "${PREV_TAG:-}" ] && [ "$t" != "latest" ]; then
          docker rmi "${r}:${t}" || true
        fi
        ;;
    esac
  done
done || true
docker image prune -f || true
