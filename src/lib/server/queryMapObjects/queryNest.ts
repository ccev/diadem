import { shouldDisplayNest } from "@/lib/features/filterLogic/nest";
import type { FilterNest } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import {
	DbMapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import {
	buildTalonflameNests,
	type TalonflameGroup,
	type TalonflameMember
} from "@/lib/server/queryMapObjects/talonflameNest";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";

export class NestQuery extends DbMapObjectQuery<NestData, FilterNest> {
	protected readonly type = MapObjectType.NEST;
	protected readonly table = "nests";
	protected readonly fields = [
		"nest_id as id",
		"lat",
		"lon",
		"name",
		"polygon",
		"spawnpoints",
		"m2",
		"active",
		"pokemon_id",
		"pokemon_form AS form",
		"pokemon_avg",
		"pokemon_ratio",
		"pokemon_count",
		"discarded",
		"updated"
	];
	protected readonly limit = requestLimits[MapObjectType.NEST];
	protected readonly idColumn = "nest_id";

	protected readonly extraWhere = ["active = 1", "pokemon_id IS NOT NULL"];

	protected getFilterWhere(
		filter: FilterNest | undefined,
		pokemonColumn = "pokemon_id"
	): { sql: string; values: unknown[] } {
		if (!filter?.enabled) return { sql: "", values: [] };

		const filters = filter.filters.filter((f) => f.enabled);
		if (filters.length === 0) return { sql: "", values: [] };

		const clauses: string[] = [];
		const values: unknown[] = [];

		for (const filterset of filters) {
			for (const pokemon of filterset.pokemon ?? []) {
				clauses.push(`${pokemonColumn} = ?`);
				values.push(pokemon.pokemon_id);
			}
		}

		if (!clauses.length) return { sql: "1 = 0", values: [] };
		return { sql: `(${clauses.join(" OR ")})`, values };
	}

	async query(
		bounds: Bounds,
		filter: FilterNest | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<NestData>>> {
		if (getServerConfig().golbat.nestSource !== "talonflame") {
			return super.query(bounds, filter, polygon, since, limit);
		}

		const spatial = this.buildSpatialFilter(polygon, bounds);
		const species = this.getFilterWhere(filter, "g.pokemon_id");
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const groups = await this.executeQuery<TalonflameGroup[]>(
			this.talonflameSelect +
				` WHERE g.status = 'confirmed' AND g.pokemon_id IS NOT NULL AND n.active = 1
				AND ${spatial.sql}${species.sql ? ` AND ${species.sql}` : ""}
				GROUP BY g.nest_id,g.pokemon_id,g.pokemon_form,g.last_changed
				ORDER BY g.nest_id LIMIT ${actualLimit + 1}`,
			[...spatial.values, ...species.values]
		);
		if (groups.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}
		// Talonflame has no group update timestamp. A species change or split may
		// leave nests.updated untouched, so always fetch current confirmations.
		const data = await this.talonflameMembers(groups, bounds, polygon);
		return { data, examined: data.length };
	}

	async querySingle(id: string): Promise<MinMapObject<NestData>[]> {
		if (getServerConfig().golbat.nestSource !== "talonflame") return super.querySingle(id);
		const groups = await this.executeQuery<TalonflameGroup[]>(
			this.talonflameSelect +
				` WHERE g.nest_id = ? AND g.status = 'confirmed'
				AND g.pokemon_id IS NOT NULL AND n.active = 1
				GROUP BY g.nest_id,g.pokemon_id,g.pokemon_form,g.last_changed`,
			[id]
		);
		return this.talonflameMembers(groups);
	}

	private readonly talonflameSelect = `SELECT CAST(g.nest_id AS CHAR) AS id,
		g.pokemon_id,g.pokemon_form AS form,g.last_changed,
		MIN(n.name) AS name,MIN(n.area_name) AS area_name
		FROM talonflame_nest_groups g
		JOIN talonflame_nest_sources s ON s.group_id = g.nest_id
		JOIN nests n ON n.nest_id = s.source_nest_id`;

	private async talonflameMembers(
		groups: TalonflameGroup[],
		bounds?: Bounds,
		polygon?: PermittedPolygon
	): Promise<MinMapObject<NestData>[]> {
		if (!groups.length) return [];
		const members = await this.executeQuery<TalonflameMember[]>(
			`SELECT CAST(nest_id AS CHAR) AS nest_id,CAST(spawnpoint_id AS CHAR) AS spawnpoint_id
			FROM talonflame_spawnpoint_state
			WHERE nest_id IN (${groups.map(() => "?").join(",")})
			ORDER BY nest_id,spawnpoint_id`,
			groups.map((group) => group.id)
		);
		return buildTalonflameNests(groups, members, bounds, polygon);
	}

	protected buildSpatialFilter(
		polygon: PermittedPolygon,
		bounds: Bounds
	): { sql: string; values: unknown[] } {
		const values: unknown[] = [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat];
		let sql = "MBRIntersects(polygon, ST_Envelope(LineString(Point(?, ?), Point(?, ?))))";
		if (polygon) {
			sql += " AND ST_Intersects(ST_GeomFromGeoJSON(?), polygon)";
			values.push(JSON.stringify(polygon.geometry));
		}
		return { sql, values };
	}

	filter(data: MinMapObject<NestData>, filter: FilterNest, polygon: PermittedPolygon): boolean {
		return shouldDisplayNest(data, filter);
	}

	prepare(data: MinMapObject<NestData>): void {
		const defaultName = getServerConfig().golbat.defaultNestName ?? "Unknown Nest";
		if (data.name === defaultName) {
			data.name = null;
		}
		data.form = getNormalizedForm(data.pokemon_id, data.form);
	}
}
