import type { ClientMapObjectType, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
import type { GymData } from "$lib/types/mapObjectData/gym";
import type { PokestopData } from "$lib/types/mapObjectData/pokestop";
import type { StationData } from "$lib/types/mapObjectData/station";

export type NearbyLocationObject = (PokestopData | GymData | StationData) & { distance: number };

export type LocationData = {
	id: "selected";
	mapId: "location-selected";
	type: ClientMapObjectType.LOCATION;
	lat: number;
	lon: number;
	zoom?: number;
	isCurrentLocation: boolean;
	address?: string;
	isAddressLoading: boolean;
	isNearbyLoading: boolean;
	nearbyPermissions: MapObjectType[];
	nearby: NearbyLocationObject[];
	spawnpoints: number;
};
