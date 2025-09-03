import type { PageLoad } from "./$types";
import { getConfig, setConfig } from "@/lib/services/config/config";
import { initAllIconSets } from "@/lib/services/uicons.svelte";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import { querySingleMapObject } from "@/lib/server/api/querySingleMapObject";

export const ssr = true;

export const load: PageLoad = async ({ params, fetch }) => {
	const configResponse = await fetch("/api/config");
	setConfig(await configResponse.json());

	const results = await Promise.all([
		querySingleMapObject(params.directLink, params.id, fetch),
		initAllIconSets(fetch),
		loadRemoteLocale(getConfig().general.defaultLocale, fetch)
	]);

	let data: MapData | { type: MapObjectType } = results[0].result[0] ?? { type: params.directLink };
	data.type = params.directLink;
	return data;
};
