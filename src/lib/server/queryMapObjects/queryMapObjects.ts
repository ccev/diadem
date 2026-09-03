import type { AnyFilter } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	type MapObjectQuery,
	type MapObjectResponse
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { isFortApiEnabled } from "@/lib/server/api/golbatFortApi";
import { ApiGymQuery } from "@/lib/server/queryMapObjects/queryGymApi";
import { ApiPokestopQuery } from "@/lib/server/queryMapObjects/queryPokestopApi";
import { ApiStationQuery } from "@/lib/server/queryMapObjects/queryStationApi";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import { NestQuery } from "@/lib/server/queryMapObjects/queryNest";
import { PokemonQuery } from "@/lib/server/queryMapObjects/queryPokemon";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import { RouteQuery } from "@/lib/server/queryMapObjects/queryRoute";
import { SpawnpointQuery } from "@/lib/server/queryMapObjects/querySpawnpoint";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import { TappableQuery } from "@/lib/server/queryMapObjects/queryTappable";
import type { FeaturePermissionContext, PermittedPolygon } from "@/lib/services/user/checkPerm";
import { error } from "@sveltejs/kit";

const registry: Partial<Record<MapObjectType, MapObjectQuery<any, any>>> = {
	[MapObjectType.GYM]: new GymQuery(),
	[MapObjectType.POKESTOP]: new PokestopQuery(),
	[MapObjectType.POKEMON]: new PokemonQuery(),
	[MapObjectType.STATION]: new StationQuery(),
	[MapObjectType.NEST]: new NestQuery(),
	[MapObjectType.SPAWNPOINT]: new SpawnpointQuery(),
	[MapObjectType.ROUTE]: new RouteQuery(),
	[MapObjectType.TAPPABLE]: new TappableQuery()
};

// Used instead of the SQL classes while the Golbat fort API is detected (golbatFortApi.ts)
const fortApiRegistry: Partial<Record<MapObjectType, MapObjectQuery<any, any>>> = {
	[MapObjectType.GYM]: new ApiGymQuery(),
	[MapObjectType.POKESTOP]: new ApiPokestopQuery(),
	[MapObjectType.STATION]: new ApiStationQuery()
};

export function getQuery(type: MapObjectType): MapObjectQuery<any, any> {
	if (isFortApiEnabled()) {
		const apiQuery = fortApiRegistry[type];
		if (apiQuery) return apiQuery;
	}
	const query = registry[type];
	if (!query) error(404);
	return query;
}

export async function queryMapObjects<Data extends MapData>(
	type: MapObjectType,
	bounds: Bounds,
	filter: AnyFilter | undefined,
	polygon: PermittedPolygon = null,
	since?: number,
	limit?: number,
	context?: FeaturePermissionContext
): Promise<MapObjectResponse<Data>> {
	if (filter !== undefined && !filter.enabled) {
		return { examined: 0, data: [] };
	}

	return getQuery(type).getMultiple(bounds, filter, polygon, since, limit, context);
}

export async function querySingleMapObject(
	type: MapObjectType,
	id: string,
	thisFetch: typeof fetch = fetch,
	context?: FeaturePermissionContext
) {
	return getQuery(type).getSingle(id, thisFetch, context);
}
