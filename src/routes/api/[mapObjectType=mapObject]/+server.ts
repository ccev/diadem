import { json } from "@sveltejs/kit";
import { checkFeatureInBounds, hasFeatureAnywhere } from "@/lib/services/user/checkPerm";

import { noPermResult } from "@/lib/server/api/results";
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import {
	queryGyms,
	queryMapObjects,
	queryPokemon,
	queryPokestops,
	queryStations
} from "@/lib/server/api/queryMapObjects";
import type { MapObjectRequestData } from "@/lib/mapObjects/updateMapObject";

export async function POST({ request, locals, params }) {
	if (!hasFeatureAnywhere(locals.perms, params.mapObjectType)) return json(noPermResult());

	const data: MapObjectRequestData = await request.json();
	const bounds = checkFeatureInBounds(locals.perms, params.mapObjectType, data);
	const type = params.mapObjectType as MapObjectType;

	return json(await queryMapObjects(type, bounds, data.filter));
}
