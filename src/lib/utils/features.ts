import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Polygon } from "geojson";

enum ExtraFeature {
	ALL = "*",

	POKEMON_IV = "pokemon_iv",
	POKEMON_PVP = "pokemon_pvp",
	POKEMON_ALL = "pokemon*",

	QUEST = "quest",
	INVASION = "invasion",
	LURE = "lure",
	CONTEST = "contest",
	KECLEON = "kecleon",
	GOLDEN_POKESTOP = "golden_pokestop",
	POKESTOP_ALL = "pokestop*",

	RAID = "raid",
	GYM_ALL = "gym*",

	MAX_BATTLE = "max_battle",
	STATION_ALL = "station*",

	SCOUT = "scout",
	WEATHER = "weather",
	COVERAGE_MAP = "coverage_map",
	WAYFARER_MAP = "wayfarer_map",
	SEARCH = "search",

	MAP_OBJECT_ALL = "map_object*",
	MINOR_MAP_OBJECT_ALL = "minor_map_object*",
	TOOL_ALL = "tool*",
	UI_ALL = "ui*"
}

export const Features = { ...MapObjectType, ...ExtraFeature };
export type FeaturesKey = MapObjectType | ExtraFeature;

export const featureFamily: Record<MapObjectType, FeaturesKey[]> = {
	[MapObjectType.POKEMON]: [
		Features.POKEMON,
		Features.POKEMON_IV,
		Features.POKEMON_PVP,
		Features.POKEMON_ALL
	],
	[MapObjectType.POKESTOP]: [
		Features.POKESTOP,
		Features.QUEST,
		Features.INVASION,
		Features.LURE,
		Features.CONTEST,
		Features.KECLEON,
		Features.GOLDEN_POKESTOP,
		Features.POKESTOP_ALL
	],
	[MapObjectType.GYM]: [Features.GYM, Features.RAID, Features.GYM_ALL],
	[MapObjectType.STATION]: [Features.STATION, Features.MAX_BATTLE, Features.STATION_ALL],
	[MapObjectType.NEST]: [Features.NEST],
	[MapObjectType.TAPPABLE]: [Features.TAPPABLE],
	[MapObjectType.S2_CELL]: [Features.S2_CELL],
	[MapObjectType.SPAWNPOINT]: [Features.SPAWNPOINT],
	[MapObjectType.ROUTE]: [Features.ROUTE]
};

export const featureWildcardChildren: Partial<Record<FeaturesKey, FeaturesKey[]>> = {
	[Features.POKEMON_ALL]: [Features.POKEMON, Features.POKEMON_IV, Features.POKEMON_PVP],
	[Features.POKESTOP_ALL]: [
		Features.POKESTOP,
		Features.QUEST,
		Features.INVASION,
		Features.LURE,
		Features.CONTEST,
		Features.KECLEON,
		Features.GOLDEN_POKESTOP
	],
	[Features.GYM_ALL]: [Features.GYM, Features.RAID],
	[Features.STATION_ALL]: [Features.STATION, Features.MAX_BATTLE],
	[Features.MINOR_MAP_OBJECT_ALL]: [
		Features.NEST,
		Features.TAPPABLE,
		Features.S2_CELL,
		Features.SPAWNPOINT,
		Features.ROUTE
	],
	[Features.MAP_OBJECT_ALL]: [
		Features.POKEMON_ALL,
		Features.POKESTOP_ALL,
		Features.GYM_ALL,
		Features.STATION_ALL,
		Features.MINOR_MAP_OBJECT_ALL
	],
	[Features.TOOL_ALL]: [Features.SCOUT, Features.WAYFARER_MAP, Features.COVERAGE_MAP],
	[Features.UI_ALL]: [Features.SEARCH, Features.WEATHER]
};

function expandWildcard(wildcard: FeaturesKey, acc = new Set<FeaturesKey>()): Set<FeaturesKey> {
	for (const child of featureWildcardChildren[wildcard] ?? []) {
		acc.add(child);
		if (featureWildcardChildren[child]) expandWildcard(child, acc);
	}
	return acc;
}

export const featureWildcardAncestors: Partial<Record<FeaturesKey, FeaturesKey[]>> = {};
for (const wildcard of Object.keys(featureWildcardChildren) as FeaturesKey[]) {
	for (const descendant of expandWildcard(wildcard)) {
		(featureWildcardAncestors[descendant] ??= []).push(wildcard);
	}
}

export const featureImplies: Partial<Record<FeaturesKey, FeaturesKey[]>> = {
	[Features.POKEMON_PVP]: [Features.POKEMON_IV]
};

export type PermArea = {
	name: string;
	features: FeaturesKey[];
	polygon: Polygon;
};

export type Perms = {
	everywhere: FeaturesKey[];
	areas: PermArea[];
};
