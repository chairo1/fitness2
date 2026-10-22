#!/bin/sh
set -e
# @fit/db is a pnpm symlink; its prisma CLI sits two levels up in the same virtual-store node_modules.
DB="$(realpath /app/node_modules/@fit/db)"
node "$DB/../../prisma/build/index.js" migrate deploy --schema "$DB/prisma/schema.prisma"
node "$DB/dist/prisma/seed.js"
exec node /app/dist/main.js
