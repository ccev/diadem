import { getMap } from "@/lib/map/map.svelte";
import { MapObjectLayerId } from "@/lib/map/layers";
import { isFeatureIcon, type MapObjectFeature } from "@/lib/map/render/featureTypes";
import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import { MapObjectType, type MapData } from "@/lib/mapObjects/mapObjectTypes";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { getRouteEndpointFort } from "@/lib/utils/routeUtils";
import type { MapMouseEvent } from "maplibre-gl";

export function getMapObjectAtPoint(point: MapMouseEvent["point"]) {
	const map = getMap();
	if (!map) return;
	const features = map.queryRenderedFeatures(point, {
		layers: Object.values(MapObjectLayerId).filter((id) => map.getLayer(id))
	});

	const mapFeatures = features as unknown as MapObjectFeature[];
	const feature =
		mapFeatures.find(
			(feature) =>
				!("isModifierUnderlay" in feature.properties) || !feature.properties.isModifierUnderlay
		) ?? mapFeatures[0];

	if (feature) {
		let data: MapData | undefined = getMapObjects()[feature.properties.id];
		if (!data && isFeatureIcon(feature) && feature.properties.routeEndpointFortId) {
			data = getRouteEndpointFort(
				Object.values(getMapObjects()).filter(
					(object): object is RouteData => object.type === MapObjectType.ROUTE
				),
				feature.properties.routeEndpointFortId
			);
		}
		return data;
	}
}
