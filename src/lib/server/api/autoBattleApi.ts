import { getServerConfig } from "@/lib/services/config/config.server";
import { reverseGeocode } from "@/lib/services/geocoding.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("autoBattle");

type AutoBattleConfig = {
	url: string;
	key: string;
};

function getAutoBattleConfig(): AutoBattleConfig | undefined {
	const config = getServerConfig();

	if (config.evilStar?.autoBattle && config.evilStar.key) {
		return { url: "https://evilstar.co/api/v1/", key: config.evilStar.key };
	}

	if (config.bots?.enableAutoBattle && config.bots.autoBattleHost && config.bots.autoBattleKey) {
		return { url: config.bots.autoBattleHost, key: config.bots.autoBattleKey };
	}
}

export function isAutoBattleConfigured() {
	return Boolean(getAutoBattleConfig());
}

export async function proxyAutoBattleRequest(request: Request, path: string, paid = false) {
	const config = getAutoBattleConfig();
	if (!config) {
		return Response.json({ error: "Auto Battle is not configured" }, { status: 404 });
	}

	const headers = new Headers({ Authorization: `Bearer ${config.key}` });
	const contentType = request.headers.get("Content-Type");
	if (contentType) headers.set("Content-Type", contentType);
	if (paid) headers.set("Idempotency-Key", crypto.randomUUID());
	const body = request.method === "GET" ? undefined : await request.text();
	const url = new URL(path, ensureTrailingSlash(config.url));

	try {
		let response = await fetch(url, {
			method: request.method,
			headers,
			body
		});
		if (response.status === 504) {
			log.warning("Auto Battle request returned 504, retrying once");
			response = await fetch(url, { method: request.method, headers, body });
		}

		return new Response(await response.arrayBuffer(), {
			status: response.status,
			headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
		});
	} catch (error) {
		log.error("Auto Battle request failed", error);
		return Response.json({ error: "Auto Battle service is unavailable" }, { status: 502 });
	}
}

export async function enrichAutoBattleResponse(response: Response) {
	if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json"))
		return response;

	try {
		const data = await response.json();
		const battle = data.battle ?? data;
		if (typeof battle.latitude === "number" && typeof battle.longitude === "number") {
			battle.address = (await reverseGeocode(battle.latitude, battle.longitude)) ?? "Unknown";
		}
		return Response.json(data, { status: response.status });
	} catch (error) {
		log.warning("Unable to enrich Auto Battle response", error);
		return Response.json({ error: "Invalid Auto Battle response" }, { status: 502 });
	}
}

function ensureTrailingSlash(url: string) {
	return url.endsWith("/") ? url : url + "/";
}
