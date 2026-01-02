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
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';

export async function queryPokestops(bounds: Bounds, filter: FilterPokestop | undefined) {
	const boundsFilter = "WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND deleted = 0 "
	const boundsValues = [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]

	let sqlQuery = "" +
		"SELECT * FROM pokestop " +
		"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " + boundsFilter

	const conditions: string[] = []
	const values: any[] = [...boundsValues]

	if (filter && !filter.pokestopPlain.enabled) {
		if (filter.contest.enabled) {
			conditions.push(`incident.display_type = ${INCIDENT_DISPLAY_CONTEST} AND incident.expiration > UNIX_TIMESTAMP()`)
		}
		if (filter.goldPokestop.enabled) {
			conditions.push(`incident.display_type = ${INCIDENT_DISPLAY_GOLD} AND incident.expiration > UNIX_TIMESTAMP()`)
		}
		if (filter.kecleon.enabled) {
			conditions.push(`incident.display_type = ${INCIDENT_DISPLAY_KECLEON} AND incident.expiration > UNIX_TIMESTAMP()`)
		}
		if (filter.lure.enabled) {
			for (const filterset of filter.lure.filters) {
				if (filterset.items !== undefined) {
					conditions.push("lure_id IN ? AND lure_expire_timestamp > UNIX_TIMESTAMP()")
				}
			}
			if (filter.lure.filters.length === 0) {
				conditions.push("lure_id != 0 AND lure_expire_timestamp > UNIX_TIMESTAMP()")
			}
		}
		if (filter.quest.enabled) {
			const questFilters = filter.quest.filters.filter(f => f.enabled)
			if (questFilters.length === 0) conditions.push("alternative_quest_rewards IS NOT NULL OR quest_rewards IS NOT NULL")
			// TODO quest filters
		}
		if (filter.invasion.enabled) {
			const invasionFilters = filter.invasion.filters.filter(f => f.enabled)
			if (invasionFilters.length > 0) conditions.push(
				`incident.display_type IN (${INCIDENT_DISPLAYS_INVASION.join(",")}) AND incident.expiration > UNIX_TIMESTAMP()`
			)
			// TODO quest filters
		}
	}

	if (conditions.length > 0) {
		sqlQuery += "AND ("
		sqlQuery += conditions.join(" OR ")
		sqlQuery += ") "
	}

	sqlQuery += `LIMIT ${LIMIT_POKESTOP}`

	return [await query<PokestopData[]>(sqlQuery, values), undefined]
}

