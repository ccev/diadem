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

export async function queryPokestops(bounds: Bounds, filter: FilterPokestop) {
	let sqlQuery = "" +
		"SELECT * FROM pokestop " +
		"LEFT JOIN incident ON incident.pokestop_id = pokestop.id " +
		"WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND deleted = 0 "

	const conditions: string[] = []
	const values: any[] = [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon]

	if (!filter.pokestopPlain.enabled) {
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
			if (invasionFilters.length === 0) conditions.push(
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
	return await query(sqlQuery, values);
}

export async function queryPokestopsOld(bounds: Bounds, filter: FilterPokestop) {
	const sqlQueries: string[] = [];
	const sqlValues: any[] = [];
	const incidentConditions: string[] = []

	if (filter.pokestopPlain.enabled) sqlQueries.push(buildPokestopPlainQuery(bounds, sqlValues, filter.pokestopPlain))
	if (filter.quest.enabled) sqlQueries.push(buildQuestQuery(bounds, sqlValues, filter.quest))
	if (filter.lure.enabled) sqlQueries.push(buildLureQuery(bounds, sqlValues, filter.lure))
	if (filter.contest.enabled) {
		incidentConditions.push("display_type = 9 AND expiration > UNIX_TIMESTAMP() ")
	}
	// if (filter.contest.enabled) {
	// 	sqlQueries.push(buildSubQuery(bounds, sqlValues) + "AND")
	// }

	if (sqlQueries.length === 0 && filter.enabled) {
		sqlQueries.push(buildSubQuery(bounds, sqlValues))
	}

	const unionQuery = sqlQueries.join(" UNION ")

	let sqlQuery = `SELECT * FROM (${unionQuery}) AS pokestop LEFT JOIN incident ON incident.pokestop_id = pokestop.id `;

	if (incidentConditions.length > 0) {
		sqlQuery += "WHERE " + incidentConditions.join("OR")
	}

	sqlQuery += `LIMIT ${LIMIT_POKESTOP}`
	return await query(sqlQuery, sqlValues);
}

function buildSubQuery(bounds: Bounds, sqlValues: any[]) {
	let sqlQuery =
		"SELECT * FROM pokestop " +
		"WHERE lat BETWEEN ? AND ? " +
		"AND lon BETWEEN ? AND ? " +
		"AND deleted = 0 ";
	sqlValues.push(bounds.minLat)
	sqlValues.push(bounds.maxLat)
	sqlValues.push(bounds.minLon)
	sqlValues.push(bounds.maxLon)
	return sqlQuery;
}

function buildPokestopPlainQuery(bounds: Bounds, sqlValues: any[], filter: FilterPokestopPlain) {
	let sqlQuery = buildSubQuery(bounds, sqlValues);
	for (const filterset of filter.filters) {
		if (filterset.isSponsored !== undefined) {
			sqlQuery += "AND sponsor_id ";
			filterset.isSponsored ? (sqlQuery += "> 0 ") : (sqlQuery += "== 0 ");
		}
		if (filterset.powerUpLevel !== undefined) {
			sqlQuery += "AND power_up_level BETWEEN ? AND ? ";
			sqlValues.push(filterset.powerUpLevel.min);
			sqlValues.push(filterset.powerUpLevel.max);
		}
		if (filterset.isArScanEligible !== undefined) {
			sqlQuery += "AND ar_scan_eligible ";
			filterset.isArScanEligible ? (sqlQuery += "== 1 ") : (sqlQuery += "!= 1 ");
		}
		if (filterset.hasDetatils !== undefined) {
			sqlQuery += "AND name IS NOT NULL ";
		}
	}
	return sqlQuery;
}

function buildQuestQuery(bounds: Bounds, sqlValues: any[], filter: FilterQuest) {
	let sqlQuery = buildSubQuery(bounds, sqlValues);
	for (const filterset of filter.filters) {
		if (filterset.ar !== undefined) {
			if (filterset.ar === "ar" || filterset.ar === "all") {
				sqlQuery += "AND quest_target IS NOT NULL "
			}
			if (filterset.ar === "noar" || filterset.ar === "all") {
				sqlQuery += "AND alternative_quest_target IS NOT NULL "
			}
		}
		// other stuff has to be filtered in frontend
	}
	return sqlQuery;
}

function buildLureQuery(bounds: Bounds, sqlValues: any[], filter: FilterLure) {
	let sqlQuery = buildSubQuery(bounds, sqlValues);
	for (const filterset of filter.filters) {
		if (filterset.items !== undefined) {
			sqlQuery += "AND lure_id IN ? ";
			sqlValues.push(filterset.items);
		}
	}
	if (filter.filters.length === 0) sqlQuery += "AND lure_id != 0 "
	sqlQuery += "AND lure_expire_timestamp > UNIX_TIMESTAMP()"
	return sqlQuery;
}

function buildContestQuery(bounds: Bounds, sqlValues: any[], filter: FilterContest) {
	let sqlQuery = buildSubQuery(bounds, sqlValues);
	sqlQuery += "AND (SELECT COUNT(*) FROM incident where incident.pokestop_id = id AND display_type = 9 AND expiration > UNIX_TIMESTAMP()) > 0"
	return sqlQuery
}
