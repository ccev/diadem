import { getMap } from "@/lib/map/map.svelte";
import { MapObjectLayerId } from "@/lib/map/layers";
import {
	isFeatureCircle,
	isFeatureIcon,
	type MapObjectFeature
} from "@/lib/map/render/featureTypes";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import { MapObjectType, type MapData } from "@/lib/mapObjects/mapObjectTypes";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { getRouteEndpointFort } from "@/lib/utils/routeUtils";
import type { MapMouseEvent } from "maplibre-gl";

export function getMapObjectAtPoint(
	point: MapMouseEvent["point"],
	{ quickActions = false }: { quickActions?: boolean } = {}
) {
	const map = getMap();
	if (!map) return;
	const features = map.queryRenderedFeatures(point, {
		layers: Object.values(MapObjectLayerId).filter((id) => map.getLayer(id))
	});

	const mapObjects = getMapObjects();
	let mapFeatures = features as unknown as MapObjectFeature[];
	if (quickActions) {
		mapFeatures = mapFeatures.filter((feature) => {
			switch (mapObjects[feature.properties.id]?.type) {
				case MapObjectType.BIOME:
				case MapObjectType.S2_CELL:
					return false;
				case MapObjectType.NEST:
					return isFeatureCircle(feature);
				default:
					return true;
			}
		});
	}
	const feature =
		mapFeatures.find(
			(feature) =>
				!("isModifierUnderlay" in feature.properties) || !feature.properties.isModifierUnderlay
		) ?? mapFeatures[0];

	if (feature) {
		let data: MapData | undefined = mapObjects[feature.properties.id];
		if (!data && isFeatureIcon(feature) && feature.properties.routeEndpointFortId) {
			data = getRouteEndpointFort(
				Object.values(mapObjects).filter(
					(object): object is RouteData => object.type === MapObjectType.ROUTE
				),
				feature.properties.routeEndpointFortId
			);
		}
		return data;
	}
}
