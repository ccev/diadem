import { defineConfig } from "drizzle-kit";
import { getTableName, isTable } from "drizzle-orm";
import { getServerConfig } from "./src/lib/services/config/config.server";
import { getDbUri } from "./src/lib/services/config/dbUri.server";
import * as schema from "./src/lib/server/db/internal/schema";

// Only Diadem's own tables. Other tables in the same database are never altered or dropped, and
// can't trigger drizzle-kit's interactive rename prompt (which fails without a TTY, e.g. in Docker)
const tablesFilter = Object.values(schema).flatMap((value) =>
	isTable(value) ? [getTableName(value)] : []
);

export default defineConfig({
	schema: "./src/lib/server/db/internal/schema.ts",
	dialect: "mysql",
	dbCredentials: { url: getDbUri(getServerConfig().internalDb) },
	tablesFilter,
	verbose: true,
	strict: true
});
