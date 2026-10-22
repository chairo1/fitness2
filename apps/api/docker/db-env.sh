# Sourced by the entrypoint, create-admin and the build. Single place that resolves @fit/db + prisma CLI.
# @fit/db is a pnpm symlink; the prisma CLI sits two levels up in the same virtual-store node_modules.
APP_ROOT="${APP_ROOT:-/app}"
DB="$(realpath "$APP_ROOT/node_modules/@fit/db")"
PRISMA="$DB/../../prisma/build/index.js"
test -f "$PRISMA" || { echo "prisma CLI not found at $PRISMA" >&2; exit 1; }
test -f "$DB/prisma/schema.prisma" || { echo "schema.prisma not found under $DB" >&2; exit 1; }
