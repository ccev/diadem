import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Polygon } from "geojson";

enum NonMapObjectFeature {
	ALL = "*",
	SCOUT = "scout",
	WEATHER = "weather",
	QUEST = "quest",
	LURE = "lure",
	INVASION = "invasion",
	SHOWCASE = "showcase",
	KECLEON = "kecleon",
	GOLD_POKESTOP = "goldPokestop",
	RAID = "raid",
	DEFENDER = "defender",
	DYNAMAX = "dynamax"
}

export const Features = { ...MapObjectType, ...NonMapObjectFeature };
export type FeaturesKey = MapObjectType | NonMapObjectFeature;

export type PermArea = {
	name: string;
	features: FeaturesKey[];
	polygon: Polygon;
};

export type Perms = {
	everywhere: FeaturesKey[];
	areas: PermArea[];
};
