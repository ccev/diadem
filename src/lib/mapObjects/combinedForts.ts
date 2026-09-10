import type { AnyFilter } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType, type MapData } from "@/lib/mapObjects/mapObjectTypes";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";

export type FortType = MapObjectType.GYM | MapObjectType.POKESTOP | MapObjectType.STATION;

export const combinedGolbatFortTypes: FortType[] = [
	MapObjectType.GYM,
	MapObjectType.POKESTOP,
	MapObjectType.STATION
];

export type FortsRequestData = Bounds & {
	types: Partial<Record<FortType, { filter?: AnyFilter; filterHash?: string; since?: number }>>;
};

export type FortsTypeResponse = {
	status: 200 | 400 | 401 | 409 | 429;
	filterCached?: "0" | "1";
	result?: MapObjectResponse<MapData>;
};

export type FortsResponse = Partial<Record<FortType, FortsTypeResponse>>;
