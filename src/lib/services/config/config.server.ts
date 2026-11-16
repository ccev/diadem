import type { Config } from "@/lib/services/config/configTypes";
import fs from "node:fs";
import { parse } from "toml";
import { liveStatsSchema, readLoadSchema } from "./readLoadConfig";

const configFile = fs.readFileSync("./src/lib/server/config.toml", "utf8");
const config: Config = parse(configFile);
// Reject malformed tuning at startup rather than silently disabling bounds or deadlines.
config.server.readLoad = readLoadSchema.parse(config.server.readLoad ?? {});
config.server.liveStats = liveStatsSchema.parse(config.server.liveStats ?? {});

export function getServerConfig() {
	return config.server;
}

export function getClientConfig() {
	return config.client;
}
