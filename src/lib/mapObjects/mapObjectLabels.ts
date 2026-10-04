import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import * as m from "@/lib/i18n/messages.svelte";

export const mapObjectLabels: Record<MapObjectType, () => string> = {
	[MapObjectType.POKEMON]: m.pogo_pokemon,
	[MapObjectType.POKESTOP]: m.pogo_pokestops,
	[MapObjectType.GYM]: m.pogo_gyms,
	[MapObjectType.STATION]: m.pogo_stations,
	[MapObjectType.S2_CELL]: m.s2_cells,
	[MapObjectType.NEST]: m.nests,
	[MapObjectType.SPAWNPOINT]: m.spawnpoints,
	[MapObjectType.ROUTE]: m.routes,
	[MapObjectType.TAPPABLE]: m.tappables
};
