import type { AnyFilter } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MapData, MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
	type MapObjectResponse,
	type MapObjectQuery
} from "@/lib/server/queryMapObjects/MapObjectQuery";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import { PokemonQuery } from "@/lib/server/queryMapObjects/queryPokemon";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import { NestQuery } from "@/lib/server/queryMapObjects/queryNest";
import { SpawnpointQuery } from "@/lib/server/queryMapObjects/querySpawnpoint";
import { RouteQuery } from "@/lib/server/queryMapObjects/queryRoute";
import { TappableQuery } from "@/lib/server/queryMapObjects/queryTappable";
import { error } from "@sveltejs/kit";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";

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

export function getQuery(type: MapObjectType): MapObjectQuery<any, any> {
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
	limit?: number
): Promise<MapObjectResponse<Data>> {
	if (filter !== undefined && !filter.enabled) {
		return { examined: 0, data: [] };
	}

	return getQuery(type).getMultiple(bounds, filter, polygon, since, limit);
}

export async function querySingleMapObject(
	type: MapObjectType,
	id: string,
	thisFetch: typeof fetch = fetch
) {
	return getQuery(type).getSingle(id, thisFetch);
}
