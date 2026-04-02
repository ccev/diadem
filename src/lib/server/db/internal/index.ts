import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getDbUri } from "@/lib/services/config/dbUri.server";

const client = mysql.createPool(getDbUri(getServerConfig().internalDb));

export const db = drizzle(client, { schema, mode: "default" });
