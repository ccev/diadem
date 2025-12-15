import { parse } from "toml";
import type { Config } from "@/lib/services/config/configTypes";
import fs from "node:fs";
import { getLogger } from "@/lib/server/logging";

const configFile = fs.readFileSync("./src/lib/server/config.toml", "utf8");
const config: Config = parse(configFile);

const log = getLogger("config")
log.debug("Loaded config: %o", config)

export function getServerConfig() {
	return config.server;
}

export function getClientConfig() {
	return config.client;
}

export function isAuthRequired() {
	return config.server.auth.enabled && !config.server.auth.optional;
}