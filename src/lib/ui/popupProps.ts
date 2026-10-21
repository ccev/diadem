import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
import { getPopupPropsPokemon } from "@/components/ui/popups/pokemon/PokemonPopup.svelte";
import { getPopupPropsPokestop } from "@/components/ui/popups/pokestop/PokestopPopup.svelte";
import { getPopupPropsGym } from "@/components/ui/popups/gym/GymPopup.svelte";
import { getPopupPropsStation } from "@/components/ui/popups/station/StationPopup.svelte";
import { getPopupPropsNest } from "@/components/ui/popups/nest/NestPopup.svelte";
import { getPopupPropsBiome } from "@/components/ui/popups/biome/BiomePopup.svelte";
import { getPopupPropsTappable } from "@/components/ui/popups/tappable/TappablePopup.svelte";
import { getPopupPropsSpawnpoint } from "@/components/ui/popups/spawnpoint/SpawnpointPopup.svelte";
import { getPopupPropsRoute } from "@/components/ui/popups/route/RoutePopup.svelte";
import { getPopupPropsLocation } from "@/components/ui/popups/location/LocationPopup.svelte";
import { ClientMapObjectType, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

const propMap: Partial<Record<MapData["type"], (data: MapData) => MapObjectPopupProps>> = {
	[MapObjectType.POKEMON]: getPopupPropsPokemon,
	[MapObjectType.POKESTOP]: getPopupPropsPokestop,
	[MapObjectType.NEST]: getPopupPropsNest,
	[MapObjectType.BIOME]: getPopupPropsBiome,
	[MapObjectType.TAPPABLE]: getPopupPropsTappable,
	[MapObjectType.SPAWNPOINT]: getPopupPropsSpawnpoint,
	[MapObjectType.GYM]: getPopupPropsGym,
	[MapObjectType.STATION]: getPopupPropsStation,
	[MapObjectType.ROUTE]: getPopupPropsRoute,
	[ClientMapObjectType.LOCATION]: getPopupPropsLocation
};

export function getPopupProps(data: MapData) {
	return propMap[data.type]?.(data);
}
