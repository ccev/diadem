import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";

export enum MapObjectType {
	POKEMON = "pokemon",
	POKESTOP = "pokestop",
	GYM = "gym",
	STATION = "station",
	S2_CELL = "s2cell",
	NEST = "nest",
	SPAWNPOINT = "spawnpoint",
	ROUTE = "route",
	TAPPABLE = "tappable"
}

export type MapData =
	| PokemonData
	| PokestopData
	| GymData
	| StationData
	| NestData
	| SpawnpointData
	| RouteData
	| TappableData;

export type MinorMapObjectType = "s2cell";
export const allMinorMapTypes: MinorMapObjectType[] = ["s2cell"];

export const allMapObjectTypes = Object.values(MapObjectType);
