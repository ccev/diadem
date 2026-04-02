import type { PageServerLoad } from "./$types";
import { getConfig } from "@/lib/services/config/config";
import { initAllIconSets } from "@/lib/services/uicons.svelte.js";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import { querySingleMapObject } from "@/lib/server/api/querySingleMapObject";
import { makeMapObject } from "@/lib/mapObjects/makeMapObject";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getLogger } from "@/lib/utils/logger";
import { getShareTitle } from "@/lib/features/shareTexts";
import { error } from "@sveltejs/kit";

const log = getLogger("directlink");
export const ssr = true;

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!allMapObjectTypes.includes(params.directLink)) {
		error(400);
	}

	const start = performance.now();

	const results = await Promise.all([
		querySingleMapObject(params.directLink, params.id, fetch),
		initAllIconSets(fetch),
		loadRemoteLocale(getConfig().general.defaultLocale, fetch)
	]);

	let data: MapData | { type: MapObjectType } = results[0].result[0] ?? { type: params.directLink };

	if (!data || !data.id) {
		return {
			type: params.directLink,
			id: undefined,
			title: undefined
		};
	}

	data = makeMapObject(data, params.directLink);

	const title = getShareTitle(data as MapData);

	log.info(
		"[%s] Prepared direct link / time: %dms / found: %s",
		params.directLink,
		(performance.now() - start).toFixed(1),
		Boolean(results[0].result[0])
	);

	return {
		type: data.type,
		id: data.id,
		title
	};
};
