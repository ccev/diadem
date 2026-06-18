import type { Config } from "@/lib/services/config/configTypes";
import fs from "node:fs";
import { parse } from "toml";

const configFile = fs.readFileSync("./src/lib/server/config.toml", "utf8");
const config: Config = parse(configFile);

export function getServerConfig() {
	return config.server;
}

export function getClientConfig() {
	const push = config.server.push;
	return {
		...config.client,
		push: push?.enabled
			? { enabled: true, vapidPublicKey: push.vapidPublicKey }
			: { enabled: false, vapidPublicKey: "" }
	} satisfies Config["client"];
}
