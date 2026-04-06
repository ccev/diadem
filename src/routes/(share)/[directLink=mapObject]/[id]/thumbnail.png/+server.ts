import type { RequestHandler } from "./$types";
import { generateThumbnail } from "@/lib/server/thumbnails/generateThumbnail";
import { render } from "svelte/server";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { querySingleMapObject } from "@/lib/server/queryMapObjects/queryMapObjects";
import { getIconForMap, getIconPokemon, initAllIconSets } from "@/lib/services/uicons.svelte";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import { allMapObjectTypes, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import MapObject from "@/components/thumbnail/MapObject.svelte";
import { fetchStaticMapBase64, imageUrlToBase64 } from "@/lib/server/thumbnails/thumbnailUtils";
import { Coords } from "@/lib/utils/coordinates";
import { getDefaultIconSet } from "@/lib/services/userSettings.svelte";
import { getStationPokemon } from "@/lib/utils/stationUtils";
import { error } from "@sveltejs/kit";

const log = getLogger("thumbnail");

export const GET: RequestHandler = async ({ params, fetch }) => {
	if (!allMapObjectTypes.includes(params.directLink)) error(400);

	const [data, ..._] = await Promise.all([
		querySingleMapObject(params.directLink, params.id, fetch), // bypassing permissions :S
		initAllIconSets(fetch),
		loadRemoteLocale(getClientConfig().general.defaultLocale, fetch)
	]);

	if (!data) error(404);

	log.info("Generating thumbnail for %s", params.directLink);

	let iconType = data.type;
	if (data.type === MapObjectType.NEST) {
		iconType = MapObjectType.POKEMON;
	}

	let iconset = getDefaultIconSet(iconType).id;
	let iconUrl = getIconForMap(data, iconset);
	let staticMapIcon = iconUrl;

	let fullImage = false;
	if ((data.type === MapObjectType.POKESTOP || data.type === MapObjectType.GYM) && data.url) {
		iconUrl = data.url;
		fullImage = true;
	} else if (data.type === MapObjectType.STATION && data.battle_pokemon_id) {
		iconset = getDefaultIconSet(MapObjectType.POKEMON).id;
		iconUrl = getIconPokemon(getStationPokemon(data), iconset);
	}

	const isSpawnpoint = data.type === MapObjectType.SPAWNPOINT;

	const [staticmap, icon] = await Promise.all([
		fetchStaticMapBase64(fetch, {
			zoom: 15,
			coords: Coords.infer(data),
			width: 500,
			height: 336,
			data,
			iconUrl: staticMapIcon
		}),
		isSpawnpoint ? Promise.resolve(null) : imageUrlToBase64(fetch, iconUrl)
	]);

	log.debug("Got static map and icon for thumbnail");
	return await generateThumbnail(
		render(MapObject, { props: { staticmap, icon, data, fullImage } })
	);
};
