<script lang="ts">
	import MarkerCurrentLocation from "@/components/map/MarkerCurrentLocation.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import type { RouteData } from "@/lib/types/mapObjectData/route";
	import { getMapStyle, mapStyleForTheme, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { getRouteColor, getRouteCoordinates } from "@/lib/utils/routeUtils";
	import type { Feature, FeatureCollection, LineString, Point } from "geojson";
	import * as maplibre from "maplibre-gl";
	import MapAttribution from "@/components/map/MapAttribution.svelte";
	import { watch } from "runed";
	import { CircleLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";

	let { route }: { route: RouteData } = $props();

	const ACCESS_MAP_ID = "accessRouteMap";
	const FIT_PADDING = 24;
	let bindMap: maplibre.Map | undefined = $state(undefined);

	function makeRouteData() {
		const coordinates = getRouteCoordinates(route);
		const bounds = new maplibre.LngLatBounds();
		for (const coordinate of coordinates) bounds.extend(coordinate as [number, number]);

		return {
			bounds,
			features: {
				type: "FeatureCollection" as const,
				features: [
					{
						type: "Feature",
						geometry: { type: "LineString", coordinates },
						properties: { strokeColor: getRouteColor(route) }
					} satisfies Feature<LineString>,
					{
						type: "Feature",
						geometry: { type: "Point", coordinates: [route.start.lon, route.start.lat] },
						properties: { endpoint: true, fillColor: getRouteColor(route) }
					} satisfies Feature<Point>,
					{
						type: "Feature",
						geometry: { type: "Point", coordinates: [route.end.lon, route.end.lat] },
						properties: { endpoint: true, fillColor: getRouteColor(route) }
					} satisfies Feature<Point>
				]
			} satisfies FeatureCollection<LineString | Point>
		};
	}

	function updateRouteMap(map: maplibre.Map) {
		const data = makeRouteData();
		map.fitBounds(data.bounds, { padding: FIT_PADDING, duration: 0, maxZoom: 17 });
		map.getSource<maplibre.GeoJSONSource>(ACCESS_MAP_ID)?.setData(data.features);
	}

	watch(
		() => [bindMap, route],
		() => {
			if (bindMap) updateRouteMap(bindMap);
		}
	);
</script>

<div data-base-ui-swipe-ignore class="h-46 w-full overflow-hidden rounded-lg border border-border">
	<MapLibre
		bind:map={bindMap}
		center={[route.lon, route.lat]}
		zoom={15}
		style={getMapStyle(
			mapStyleForTheme("satellite") ?? mapStyleFromId(getUserSettings().mapStyle.id)
		)}
		class="size-full rounded-lg overflow-hidden"
		attributionControl={false}
		interactive={true}
		zoomOnDoubleClick={true}
		minZoom={0}
		maxZoom={getConfig().general.maxZoom}
		onload={updateRouteMap}
	>
		<GeoJSON
			id={ACCESS_MAP_ID}
			data={{ type: "FeatureCollection", features: [] } as FeatureCollection}
		>
			<LineLayer
				id="accessRouteMapLine"
				filter={["==", ["geometry-type"], "LineString"]}
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{
					"line-color": ["coalesce", ["get", "strokeColor"], "#6366f1"],
					"line-opacity": 0.9,
					"line-width": 5
				}}
			/>
			<CircleLayer
				id="accessRouteMapEndpoints"
				filter={["==", ["get", "endpoint"], true]}
				paint={{
					"circle-radius": 6,
					"circle-color": ["coalesce", ["get", "fillColor"], "#6366f1"],
					"circle-stroke-color": "#ffffff",
					"circle-stroke-width": 2
				}}
			/>
		</GeoJSON>

		<MarkerCurrentLocation />
		<MapAttribution map={bindMap} />
	</MapLibre>
</div>
