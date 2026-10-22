#!/usr/bin/env bash
# Usage: ./deploy.sh <TAG>   (installed in /opt/fitness2)
set -euo pipefail

TAG="${1:?usage: deploy.sh TAG}"
cd /opt/fitness2

[ -f .env ] || { echo ".env not found in /opt/fitness2" >&2; exit 1; }

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

echo "Waiting for https://${WEB_HOST}/api/health (max 90s)..."
deadline=$((SECONDS + 90))
until curl -fsS -o /dev/null "https://${WEB_HOST}/api/health"; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "Health check failed after 90s. Recent logs:" >&2
    docker compose logs --tail=100 >&2
    exit 1
  fi
  sleep 3
done

echo "Deploy OK: ${TAG}"
docker image prune -f
