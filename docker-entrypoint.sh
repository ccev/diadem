#!/bin/sh
set -e

# actually doing anything needs --force otherwise it will never actually work in Docker because it's an interactive command
# and there's no pty. the comment (and logid) that was here previously were dumb and bad and (i assume)
# claude-written. malte, please feel feee to remove this comment whenever you see it
# - sylvie

# Only push when the schema is missing, since drizzle-kit push isn't idempotent against MariaDB - claude

if [ "${SKIP_DB_PUSH:-}" = "true" ]; then
    echo "Skipping database push (SKIP_DB_PUSH=true)"
elif node --input-type=module -e '
import { readFileSync } from "node:fs";
import toml from "toml";
import mysql from "mysql2/promise";
const db = toml.parse(readFileSync("./src/lib/server/config.toml", "utf8")).server.internalDb;
const c = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password, database: db.database });
const [rows] = await c.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = ?", [db.database, "user"]);
await c.end();
process.exit(rows[0].n > 0 ? 0 : 1);
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
