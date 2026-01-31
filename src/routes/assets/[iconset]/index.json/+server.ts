import { error } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("uicons");
const config = getClientConfig();
const CACHE_DURATION = 60 * 60 * 1000;
const indexCache: TTLCache<string, string> = new TTLCache({
	max: config.uiconSets.length,
	ttl: CACHE_DURATION
});

export async function GET({ params, fetch }) {
	const iconSetId = params.iconset;

	const iconSet = config.uiconSets.find((s) => s.id === iconSetId);
	if (!iconSet) {
		error(404, "Unknown Icon Set");
	}

	const cachedIndex = indexCache.get(iconSetId);
	if (cachedIndex) {
		log.info("[%s] Serving cached index.json", iconSetId);
		return new Response(cachedIndex, {
			headers: {
				"Content-Type": "application/json"
			}
		});
	}

	const url = iconSet.url + "/index.json";
	const res = await fetch(url);
	log.info("[%s] Serving fresh index.json", iconSetId);

	if (!res.ok || res.body === null) {
		log.error("Fetching iconset for %s (%s) failed with %s", iconSetId, url, await res.text());
		error(500, "Fetching index.json failed");
	}

	const text = await res.text();

	indexCache.set(iconSetId, text);

	return new Response(text, {
		headers: {
			"Content-Type": "application/json"
		}
	});
}
