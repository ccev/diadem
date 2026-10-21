import { shouldDisplayNest } from "@/lib/features/filterLogic/nest";
import type { FilterNest } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import {
	DbMapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { fetchTalonflame, type TalonflameResponse } from "@/lib/server/api/talonflame";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import {
	area,
	booleanIntersects,
	booleanPointInPolygon,
	bboxPolygon,
	feature,
	featureCollection,
	intersect,
	point,
	pointOnFeature
} from "@turf/turf";

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

	protected getFilterWhere(filter: FilterNest | undefined): { sql: string; values: unknown[] } {
		if (!filter?.enabled) return { sql: "", values: [] };

		const filters = filter.filters.filter((f) => f.enabled);
		if (filters.length === 0) return { sql: "", values: [] };

		const clauses: string[] = [];
		const values: unknown[] = [];

		for (const filterset of filters) {
			for (const pokemon of filterset.pokemon ?? []) {
				clauses.push("pokemon_id = ?");
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
		if (!getServerConfig().talonflame?.url) {
			return super.query(bounds, filter, polygon, since, limit);
		}

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const params = new URLSearchParams({
			bbox: [bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat].join(","),
			limit: String(actualLimit)
		});
		const filtersets = filter?.enabled ? filter.filters.filter((f) => f.enabled) : [];
		if (filtersets.length) {
			const species = [
				...new Set(filtersets.flatMap((f) => f.pokemon?.map((p) => p.pokemon_id) ?? []))
			].sort((a, b) => a - b);
			if (!species.length) return { data: [], examined: 0, snapshot: true };
			params.set("pokemon", species.join(","));
		}
		const response = await fetchTalonflame<TalonflameResponse>(`?${params}`);
		return this.talonflameData(response, polygon, bounds);
	}

	async querySingle(id: string, thisFetch = fetch): Promise<MinMapObject<NestData>[]> {
		if (!getServerConfig().talonflame?.url) return super.querySingle(id);
		const response = await fetchTalonflame<TalonflameResponse>(
			`?id=${encodeURIComponent(id)}`,
			thisFetch
		);
		return this.talonflameData(response, null).data;
	}

	private talonflameData(
		response: TalonflameResponse,
		permission: PermittedPolygon,
		bounds?: Bounds
	): MapObjectResponse<MinMapObject<NestData>> {
		if (response.limitReached)
			return {
				data: [],
				examined: response.examined,
				limitReached: true,
				snapshot: true,
				revision: response.revision
			};
		const data: MinMapObject<NestData>[] = [];
		for (const nest of response.data) {
			let region = feature(nest.geometry);
			if (permission) {
				const clipped = intersect(featureCollection([region, permission]));
				if (!clipped) continue;
				region = clipped;
			}
			if (
				bounds &&
				bounds.minLon <= bounds.maxLon &&
				!booleanIntersects(
					region,
					bboxPolygon([bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat])
				)
			)
				continue;
			const anchor = booleanPointInPolygon(point([nest.lon, nest.lat]), region)
				? [nest.lon, nest.lat]
				: pointOnFeature(region).geometry.coordinates;
			const coordinates =
				region.geometry.type === "Polygon"
					? [region.geometry.coordinates]
					: region.geometry.coordinates;
			const { geometry: _, ...metadata } = nest;
			data.push({
				...metadata,
				lat: anchor[1],
				lon: anchor[0],
				polygon: coordinates.map((rings) => rings.map((ring) => ring.map(([x, y]) => ({ x, y })))),
				m2: permission ? area(region) : nest.m2,
				active: 1,
				pokemon_avg: null,
				pokemon_ratio: null,
				pokemon_count: null,
				discarded: null,
				updated: null
			});
		}
		return { data, examined: response.examined, snapshot: true, revision: response.revision };
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
