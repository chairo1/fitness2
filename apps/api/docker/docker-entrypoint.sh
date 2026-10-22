#!/bin/sh
set -e
. /app/bin/db-env.sh
# Keep the short-lived CLI/seed processes lean (prod container is memory-limited).
NODE_OPTIONS="--max-old-space-size=96" node "$PRISMA" migrate deploy --schema "$DB/prisma/schema.prisma"
NODE_OPTIONS="--max-old-space-size=96" node "$DB/dist/prisma/seed.js"
exec node /app/dist/main.js
