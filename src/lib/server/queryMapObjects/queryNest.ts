import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { FilterNest } from "@/lib/features/filters/filters";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import { shouldDisplayNest } from "@/lib/features/filterLogic/nest";

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
