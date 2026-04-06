import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { LIMIT_POKESTOP } from "@/lib/constants";
import { queryJoined } from "@/lib/server/db/external/internalQuery";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";
import { FIELDS_INCIDENT, FIELDS_POKESTOP } from "@/lib/mapObjects/queryFields";
import type { MapObjectResponse } from "@/lib/server/api/queryMapObjects";

export function processRawPokestop(pokestop: PokestopData) {
	if (pokestop.showcase_focus && (pokestop.showcase_expiry ?? 0) > currentTimestamp()) {
		pokestop.contest_focus = JSON.parse(pokestop.showcase_focus);

		if (pokestop.contest_focus?.type === "pokemon") {
			pokestop.contest_focus.pokemon_form = getNormalizedForm(
				pokestop.contest_focus.pokemon_id,
				pokestop.contest_focus.pokemon_form
			);
		}
	}

	pokestop.showcase_pokemon_form_id = getNormalizedForm(
		pokestop.showcase_pokemon_id,
		pokestop.showcase_pokemon_form_id
	);

	for (const incident of pokestop.incident) {
		if (!incident || !incident.id) continue;
		incident.slot_1_form = getNormalizedForm(incident.slot_1_pokemon_id, incident.slot_1_form);
		incident.slot_2_form = getNormalizedForm(incident.slot_2_pokemon_id, incident.slot_2_form);
		incident.slot_3_form = getNormalizedForm(incident.slot_3_pokemon_id, incident.slot_3_form);
	}
}

export async function queryPokestops(
	bounds: Bounds,
	filter: FilterPokestop | undefined,
	polygon: Feature<Polygon | MultiPolygon> | null = null
): Promise<MapObjectResponse<PokestopData>> {
	const spatial = buildSpatialFilter(polygon, bounds, "Point(pokestop.lon, pokestop.lat)");

	let sqlQuery =
		"SELECT " +
		FIELDS_POKESTOP +
		"," +
		FIELDS_INCIDENT +
		" FROM pokestop " +
		"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
		"WHERE " +
		spatial.sql +
		" AND deleted = 0 ";

	// TODO: use internal filter methods over building sql
	const values: any[] = [...spatial.values];

	sqlQuery += `LIMIT ${LIMIT_POKESTOP}`;

	const result = await queryJoined<PokestopData[]>(sqlQuery, values);
	for (const pokestop of result) {
		processRawPokestop(pokestop);
	}

	return { data: result, examined: result.length };
}
