import * as fs from 'node:fs';
import type { Config } from './configTypes';
import { parse } from 'toml';
import { getDbUri } from './dbUri.server';

const configFile = fs.readFileSync("./src/lib/server/config.toml", "utf8")
const config: Config = parse(configFile);

export function getInternalDbUri() {
	return getDbUri(config.server.internalDb)
}