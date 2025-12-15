import { defineConfig } from "drizzle-kit";
import { getServerConfig } from "./src/lib/services/config/config.server";
import { getDbUri } from "./src/lib/services/config/dbUri.server";

export default defineConfig({
	schema: "./src/lib/server/db/internal/schema.ts",
	dialect: "mysql",
	dbCredentials: { url: getDbUri(getServerConfig().internalDb) },
	verbose: true,
	strict: true
});
