import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export function makeMapObject<T extends Partial<MapData>>(data: T, type: MapObjectType): T {
	data.type = type;
	data.mapId = type + "-" + data.id;
	return data;
}