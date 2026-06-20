import { getServerConfig } from "@/lib/services/config/config.server";
import { getDbUri } from "@/lib/services/config/dbUri.server";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// timezone: "Z" pins the connection to UTC so JS Date <-> MySQL DATETIME values
// round-trip consistently. Without it, mysql2 uses local time while better-auth
// compares expiries against a UTC `new Date()`, so short-lived verification rows
// (one-time tokens, etc.) appear pre-expired on servers not running in UTC.
const client = mysql.createPool({ uri: getDbUri(getServerConfig().internalDb), timezone: "Z" });

export const db = drizzle(client, { schema, mode: "default" });
