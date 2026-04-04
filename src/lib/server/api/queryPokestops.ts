import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type {
	AnyFilter,
	FilterContest,
	FilterInvasion,
	FilterLure,
	FilterPokestop,
	FilterPokestopPlain,
	FilterQuest
} from "@/lib/features/filters/filters";
import { LIMIT_POKESTOP } from "@/lib/constants";
import { query } from "@/lib/server/db/external/internalQuery";
import {
	INCIDENT_DISPLAY_CONTEST,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAYS_INVASION
} from "@/lib/utils/pokestopUtils";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { buildSpatialFilter } from "@/lib/server/api/spatialFilter";

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
) {
	const spatial = buildSpatialFilter(polygon, bounds, "Point(pokestop.lon, pokestop.lat)");

	let sqlQuery =
		"SELECT * FROM pokestop " +
		"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
		"WHERE " +
		spatial.sql +
		" AND deleted = 0 ";

	// TODO: use internal filter methods over building sql
	// const conditions: string[] = [];
	const values: any[] = [...spatial.values];
	//
	// if (filter && !filter.pokestopPlain.enabled) {
	// 	if (filter.contest.enabled) {
	// 		conditions.push(
	// 			`incident.display_type = ${INCIDENT_DISPLAY_CONTEST} AND incident.expiration > UNIX_TIMESTAMP()`
	// 		);
	// 	}
	// 	if (filter.goldPokestop.enabled) {
	// 		conditions.push(
	// 			`incident.display_type = ${INCIDENT_DISPLAY_GOLD} AND incident.expiration > UNIX_TIMESTAMP()`
	// 		);
	// 	}
	// 	if (filter.kecleon.enabled) {
	// 		conditions.push(
	// 			`incident.display_type = ${INCIDENT_DISPLAY_KECLEON} AND incident.expiration > UNIX_TIMESTAMP()`
	// 		);
	// 	}
	// 	if (filter.lure.enabled) {
	// 		for (const filterset of filter.lure.filters) {
	// 			if (filterset.items !== undefined) {
	// 				let condition = "lure_expire_timestamp > UNIX_TIMESTAMP() AND lure_id IN ";
	//
	// 				// no sql injection pls
	// 				const items = filterset.items.filter((i) => i >= 500 && i < 600);
	// 				condition += "(" + items.join(",") + ")";
	// 				conditions.push(condition);
	// 			}
	// 		}
	// 		if (filter.lure.filters.length === 0) {
	// 			conditions.push("lure_id != 0 AND lure_expire_timestamp > UNIX_TIMESTAMP()");
	// 		}
	// 	}
	// 	if (filter.quest.enabled) {
	// 		const questFilters = filter.quest.filters.filter((f) => f.enabled);
	// 		if (questFilters.length === 0)
	// 			conditions.push("alternative_quest_rewards IS NOT NULL OR quest_rewards IS NOT NULL");
	// 	}
	// 	if (filter.invasion.enabled) {
	// 		conditions.push(
	// 			`incident.display_type IN (${INCIDENT_DISPLAYS_INVASION.join(",")}) AND incident.expiration > UNIX_TIMESTAMP()`
	// 		);
	// 	}
	// }
	//
	// if (conditions.length > 0) {
	// 	sqlQuery += "AND (";
	// 	sqlQuery += conditions.join(" OR ");
	// 	sqlQuery += ") ";
	// }

	sqlQuery += `LIMIT ${LIMIT_POKESTOP}`;

	const result = await query<PokestopData[]>(sqlQuery, values);
	if (result.result) {
		for (const pokestop of result.result) {
			processRawPokestop(pokestop);
		}
	}

	return [result, undefined];
}
