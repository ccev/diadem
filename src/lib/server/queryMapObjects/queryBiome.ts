import type { FilterBiome } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { biomesProvider } from "@/lib/server/provider/biomesProvider";
import {
	MapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { BiomeData } from "@/lib/types/mapObjectData/biome";
import { isDiscoveredBiome } from "@/lib/utils/biomeUtils";
import { getS2CellCenter, getS2CellsInBounds, parseS2CellId } from "@/lib/utils/s2";
import { error } from "@sveltejs/kit";
import { booleanPointInPolygon, point } from "@turf/turf";

export class BiomeQuery extends MapObjectQuery<BiomeData, FilterBiome> {
	protected readonly type = MapObjectType.BIOME;
	protected readonly limit = requestLimits[MapObjectType.BIOME];

	async query(
		bounds: Bounds,
		_filter: FilterBiome | undefined,
		polygon: PermittedPolygon,
		_since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MinMapObject<BiomeData>>> {
		if (!biomesProvider.enabled) return { data: [], examined: 0 };

		if (
			![bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon].every(Number.isFinite) ||
			bounds.minLat < -90 ||
			bounds.maxLat > 90 ||
			bounds.minLat > bounds.maxLat
		) {
			error(400);
		}

		const actualLimit = Math.max(1, Math.min(limit ?? this.limit, this.limit, 50_000));
		const cells = getS2CellsInBounds(bounds, 16, actualLimit);
		if (!cells) return { data: [], examined: actualLimit, limitReached: true };

		const permittedCells = cells.filter((cell) => {
			const { lat, lon } = getS2CellCenter(cell);
			return (
				(!polygon || booleanPointInPolygon(point([lon, lat]), polygon)) &&
				(!context || context.isAllowedAt(this.type, lat, lon))
			);
		});
		const profiles = await biomesProvider.getProfiles(permittedCells.map(String));

		return {
			examined: permittedCells.length,
			data: profiles.filter(isDiscoveredBiome).map((profile) => ({
				id: profile.cell_id,
				...getS2CellCenter(BigInt(profile.cell_id)),
				profile
			}))
		};
	}

	async querySingle(
		id: string,
		thisFetch: typeof fetch = fetch
	): Promise<MinMapObject<BiomeData>[]> {
		if (!biomesProvider.enabled) return [];

		const cell = parseS2CellId(id, 16);
		if (cell === undefined) return [];

		const [profile] = await biomesProvider.getProfiles([id], thisFetch);
		if (!isDiscoveredBiome(profile)) return [];

		return [{ id, ...getS2CellCenter(cell), profile }];
	}
}
