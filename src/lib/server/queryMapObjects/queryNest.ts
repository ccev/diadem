import { shouldDisplayNest } from "@/lib/features/filterLogic/nest";
import type { FilterNest } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { fetchTalonflame, type TalonflameResponse } from "@/lib/server/api/talonflame";
import {
	DbMapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import {
	area,
	bboxPolygon,
	booleanIntersects,
	booleanPointInPolygon,
	feature,
	featureCollection,
	intersect,
	point,
	pointOnFeature
} from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";

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

	private getFilteredPokemonIds(filter: FilterNest | undefined): number[] | undefined {
		if (!filter?.enabled) return;

		const enabledFilters = filter.filters.filter((filterset) => filterset.enabled);
		if (!enabledFilters.length) return;

		const pokemonIds = enabledFilters.flatMap((filterset) =>
			(filterset.pokemon ?? []).map((pokemon) => pokemon.pokemon_id)
		);
		return [...new Set(pokemonIds)].sort((a, b) => a - b);
	}

	protected getFilterWhere(filter: FilterNest | undefined): { sql: string; values: unknown[] } {
		const pokemonIds = this.getFilteredPokemonIds(filter);
		if (!pokemonIds) return { sql: "", values: [] };
		if (!pokemonIds.length) return { sql: "1 = 0", values: [] };

		return {
			sql: `pokemon_id IN (${pokemonIds.map(() => "?").join(", ")})`,
			values: pokemonIds
		};
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
		const pokemonIds = this.getFilteredPokemonIds(filter);
		if (pokemonIds) {
			if (!pokemonIds.length) return { data: [], examined: 0, snapshot: true };
			params.set("pokemon", pokemonIds.join(","));
		}

		const response = await fetchTalonflame<TalonflameResponse>(`?${params}`);
		return this.mapTalonflameResponse(response, polygon, bounds);
	}

	async querySingle(id: string, thisFetch = fetch): Promise<MinMapObject<NestData>[]> {
		if (!getServerConfig().talonflame?.url) return super.querySingle(id);

		const response = await fetchTalonflame<TalonflameResponse>(
			`?id=${encodeURIComponent(id)}`,
			thisFetch
		);
		return this.mapTalonflameResponse(response, null).data;
	}

	private mapTalonflameResponse(
		response: TalonflameResponse,
		permission: PermittedPolygon,
		bounds?: Bounds
	): MapObjectResponse<MinMapObject<NestData>> {
		if (response.limitReached) return { ...response, data: [] };

		// Wrapped bounds cross the antimeridian and are handled by the upstream API.
		let viewport: Feature<Polygon> | undefined;
		if (bounds && bounds.minLon <= bounds.maxLon) {
			viewport = bboxPolygon([bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat]);
		}

		const data: MinMapObject<NestData>[] = [];
		for (const { geometry, ...nest } of response.data) {
			let nestPolygon = feature(geometry);
			if (permission) {
				const clippedPolygon = intersect(featureCollection([nestPolygon, permission]));
				if (!clippedPolygon) continue;
				nestPolygon = clippedPolygon;
			}
			if (viewport && !booleanIntersects(nestPolygon, viewport)) continue;

			let { lon, lat, m2 } = nest;
			if (!booleanPointInPolygon(point([lon, lat]), nestPolygon)) {
				[lon, lat] = pointOnFeature(nestPolygon).geometry.coordinates;
			}
			if (permission) {
				m2 = area(nestPolygon);
			}

			let coordinates: MultiPolygon["coordinates"];
			if (nestPolygon.geometry.type === "Polygon") {
				coordinates = [nestPolygon.geometry.coordinates];
			} else {
				coordinates = nestPolygon.geometry.coordinates;
			}

			data.push({
				...nest,
				lat,
				lon,
				polygon: coordinates.map((rings) => rings.map((ring) => ring.map(([x, y]) => ({ x, y })))),
				m2,
				active: 1,
				pokemon_avg: null,
				pokemon_ratio: null,
				pokemon_count: null,
				discarded: null,
				updated: null
			});
		}
		return { ...response, data };
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
