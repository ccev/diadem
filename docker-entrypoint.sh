#!/bin/sh
set -e

# drizzle-kit push needs --force because the container has no interactive TTY.
# Only skip when the current auth schema exists; older installs may have just the legacy user table.

if [ "${SKIP_DB_PUSH:-}" = "true" ]; then
    echo "Skipping database push (SKIP_DB_PUSH=true)"
elif [ "${FORCE_DB_PUSH:-}" = "true" ]; then
    echo "Running database push (FORCE_DB_PUSH=true)..."
    npx drizzle-kit push --force
elif node --input-type=module -e '
import { readFileSync } from "node:fs";
import toml from "toml";
import mysql from "mysql2/promise";
const db = toml.parse(readFileSync("./src/lib/server/config.toml", "utf8")).server.internalDb;
const c = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password, database: db.database });
const requiredTables = ["user", "session", "account", "verification"];
const [rows] = await c.query(
  "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name IN (?)",
  [db.database, requiredTables]
);
await c.end();
process.exit(Number(rows[0].n) === requiredTables.length ? 0 : 1);
' 2>/dev/null; then
    echo "Database schema already initialized, skipping push."
else
    echo "Initializing database schema..."
    npx drizzle-kit push --force
fi

if [ "${DIADEM_TARGET:-}" = "dev" ]; then
    echo "Starting Diadem in dev mode..."
    exec pnpm exec vite dev --host "${HOST:-0.0.0.0}" --port "${PORT:-3900}"
else
    echo "Starting Diadem..."
    exec node build/index.js
fi
