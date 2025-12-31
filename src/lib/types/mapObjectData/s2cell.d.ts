import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { CellID } from "s2js/dist/s2/cellid";

export type S2CellData = {
	id: string;
	type: MapObjectType.S2_CELL
	mapId: string
	lat: number;
	lon: number;
	cellId: CellID;
}