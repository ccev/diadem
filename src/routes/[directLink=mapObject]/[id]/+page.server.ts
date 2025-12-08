import type { PageServerLoad } from "./$types";
import { getConfig, setConfig } from "@/lib/services/config/config";
import { initAllIconSets } from "@/lib/services/uicons.svelte";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import { querySingleMapObject } from "@/lib/server/api/querySingleMapObject";
import { makeMapObject } from "@/lib/mapObjects/makeMapObject";
import { getLogger } from "@/lib/server/logging";

const log = getLogger("directlink");
export const ssr = true;

export const load: PageServerLoad = async ({ params, fetch }) => {
	const start = performance.now();

	const configResponse = await fetch("/api/config");
	setConfig(await configResponse.json());

	const results = await Promise.all([
		querySingleMapObject(params.directLink, params.id, fetch), // bypassing permissions :S
		initAllIconSets(fetch),
		loadRemoteLocale(getConfig().general.defaultLocale, fetch)
	]);

	let data: MapData | { type: MapObjectType } = results[0].result[0] ?? { type: params.directLink };
	data = makeMapObject(data, params.directLink);
	log.info(
		"[%s] Prepared direct link / time: %dms / found: %s",
		params.directLink,
		(performance.now() - start).toFixed(1),
		Boolean(results[0].result[0])
	);
	return data;
};
