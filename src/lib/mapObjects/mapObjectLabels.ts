import { ClientMapObjectType, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export const mapObjectLabels: Record<MapObjectType, () => string> = {
	[MapObjectType.POKEMON]: () => "Pokémon",
	[MapObjectType.POKESTOP]: () => "Pokéstops",
	[MapObjectType.GYM]: () => "Gyms",
	[MapObjectType.STATION]: () => "Power Spots",
	[MapObjectType.S2_CELL]: () => "S2 Cells",
	[MapObjectType.NEST]: () => "Nests",
	[MapObjectType.SPAWNPOINT]: () => "Spawnpoints",
	[MapObjectType.ROUTE]: () => "Routes",
	[MapObjectType.TAPPABLE]: () => "Ground Items"
};

export function mapObjectLabel(type: MapObjectType | ClientMapObjectType) {
	switch (type) {
		case MapObjectType.POKEMON:
			return "Pokémon";
		case MapObjectType.POKESTOP:
			return "Pokéstop";
		case MapObjectType.GYM:
			return "Gym";
		case MapObjectType.STATION:
			return "Power Spot";
		case MapObjectType.S2_CELL:
			return "S2 Cell";
		case MapObjectType.NEST:
			return "Nest";
		case MapObjectType.SPAWNPOINT:
			return "Spawnpoint";
		case MapObjectType.ROUTE:
			return "Route";
		case MapObjectType.TAPPABLE:
			return "Ground Item";
		case ClientMapObjectType.LOCATION:
			return "Location";
	}
}
