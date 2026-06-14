import { getShareTitle } from "@/lib/features/shareTexts";
import { allMapObjectTypes } from "@/lib/mapObjects/mapObjectTypes";
import { querySingleMapObject } from "@/lib/server/queryMapObjects/queryMapObjects";
import { getConfig } from "@/lib/services/config/config";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import { initAllIconSets } from "@/lib/services/uicons.svelte.js";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const log = getLogger("directlink");
export const ssr = true;

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!allMapObjectTypes.includes(params.directLink)) {
		error(400);
	}

	const start = performance.now();

	const [mapObject, ..._] = await Promise.all([
		querySingleMapObject(params.directLink, params.id, fetch),
		initAllIconSets(fetch),
		loadRemoteLocale(getConfig().general.defaultLocale, fetch)
	]);

	log.info(
		"[%s] Prepared direct link / time: %dms / found: %s",
		params.directLink,
		(performance.now() - start).toFixed(1),
		Boolean(mapObject)
	);

	if (!mapObject) {
		return {
			type: params.directLink,
			id: undefined,
			title: undefined
		};
	}

	const title = getShareTitle(mapObject);

	return {
		type: mapObject.type,
		id: mapObject.id,
		title
	};
};
