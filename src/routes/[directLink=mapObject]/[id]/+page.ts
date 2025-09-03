import type { PageLoad } from "./$types";
import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/features/directLinks.svelte.js";
import { getOneMapObject } from "@/lib/mapObjects/getOneMapObject";
import { getConfig, setConfig } from "@/lib/services/config/config";
import { initAllIconSets } from "@/lib/services/uicons.svelte";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";

export const ssr = true;

export const load: PageLoad = async ({ params, fetch }) => {
	if (browser) {
		const data = await getOneMapObject(params.directLink, params.id, fetch);
		setDirectLinkObject(params.id, params.directLink, data);
	} else {
		// Loading required services for ssr (for social media previews)
		// TODO: bypass permissions
		const configResponse = await fetch("/api/config");
		setConfig(await configResponse.json());

		const results = await Promise.all([
			getOneMapObject(params.directLink, params.id, fetch),
			initAllIconSets(fetch),
			loadRemoteLocale(getConfig().general.defaultLocale, fetch),
		]);

		let data: MapData | { type: MapObjectType } = results[0] ?? { type: params.directLink };
		data.type = params.directLink
		return data
	}
	return undefined
};
