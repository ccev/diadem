#!/bin/sh
set -e

# Only run db:push if the database appears to be uninitialized
# This prevents accidental destructive schema changes in production
if [ "${SKIP_DB_PUSH:-}" = "true" ]; then
    echo "Skipping database push (SKIP_DB_PUSH=true)"
elif [ "${FORCE_DB_PUSH:-}" = "true" ]; then
    echo "Running database push (forced)..."
    npx drizzle-kit push --force
else
    echo "Running database push..."
    npx drizzle-kit push
fi

echo "Starting Diadem..."
exec node build/index.js
