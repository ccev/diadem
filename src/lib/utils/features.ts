import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Polygon } from "geojson";

enum NonMapObjectFeature {
	ALL = "*",
	SCOUT = "scout"
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