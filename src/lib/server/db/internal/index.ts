import { getServerConfig } from "@/lib/services/config/config.server";
import { getDbUri } from "@/lib/services/config/dbUri.server";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// set the timezone to Z to avoid problems with better-auth token expiry timezone
const client = mysql.createPool({ uri: getDbUri(getServerConfig().internalDb), timezone: "Z" });

export const db = drizzle(client, { schema, mode: "default" });
