<script lang="ts">
	import MarkerCurrentLocation from "@/components/map/MarkerCurrentLocation.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getMapStyle, mapStyleForTheme, mapStyleFromId } from "@/lib/utils/mapStyle";
	import type { Feature, FeatureCollection, MultiPolygon } from "geojson";
	import maplibre from "maplibre-gl";
	import { watch } from "runed";
	import { FillLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";

	type PolygonPoint = { x: number; y: number };
	type AccessPolygon = PolygonPoint[][] | PolygonPoint[][][];

	let {
		polygon,
		fillColor,
		strokeColor
	}: {
		polygon: AccessPolygon;
		fillColor: string;
		strokeColor: string;
	} = $props();

	const ACCESS_MAP_ID = "accessPolygonMap";
	const ACCESS_MAP_MIN_ZOOM = 15;
	const FIT_PADDING = 24;
	let bindMap: maplibre.Map | undefined = $state(undefined);

	function isMultiPolygon(polygon: AccessPolygon): polygon is PolygonPoint[][][] {
		return Array.isArray(polygon[0]?.[0]);
	}

	function closeRing(ring: [number, number][]) {
		const first = ring[0];
		const last = ring.at(-1);
		if (!first || !last || (first[0] === last[0] && first[1] === last[1])) return ring;

		return [...ring, first];
	}

	function toRing(ring: PolygonPoint[]) {
		return closeRing(ring.map((point) => [point.x, point.y] as [number, number]));
	}

	function toMultiPolygonCoordinates(polygon: AccessPolygon): MultiPolygon["coordinates"] {
		if (isMultiPolygon(polygon)) return polygon.map((poly) => poly.map(toRing));

		return [polygon.map(toRing)];
	}

	function resolveColor(color: string) {
		if (!color.startsWith("--")) return color;

		return getComputedStyle(document.documentElement).getPropertyValue(color) || "transparent";
	}

	function getPolygonBounds(coordinates: MultiPolygon["coordinates"]) {
		const bounds = new maplibre.LngLatBounds();
		let hasCoordinates = false;

		for (const poly of coordinates) {
			for (const ring of poly) {
				for (const coordinate of ring) {
					bounds.extend(coordinate as [number, number]);
					hasCoordinates = true;
				}
			}
		}

		return hasCoordinates ? bounds : undefined;
	}

	function getPolygonCenter() {
		const bounds = getPolygonBounds(toMultiPolygonCoordinates(polygon));
		return bounds?.getCenter().toArray() ?? [0, 0];
	}

	function fitPolygon(map: maplibre.Map, bounds: maplibre.LngLatBounds | undefined) {
		if (!bounds) {
			map.setCenter([0, 0]);
			map.setMinZoom(ACCESS_MAP_MIN_ZOOM);
			return;
		}

		map.setMinZoom(0);
		map.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 });
		map.setMinZoom(Math.max(0, Math.min(ACCESS_MAP_MIN_ZOOM, map.getZoom() - 0.5)));
	}

	function makePolygonData() {
		const coordinates = toMultiPolygonCoordinates(polygon);
		const polygonFeature: Feature<MultiPolygon> = {
			type: "Feature",
			geometry: {
				type: "MultiPolygon",
				coordinates
			},
			properties: {
				fillColor: resolveColor(fillColor),
				strokeColor: resolveColor(strokeColor)
			}
		};

		return {
			bounds: getPolygonBounds(coordinates),
			features: {
				type: "FeatureCollection" as const,
				features: [polygonFeature]
			} satisfies FeatureCollection<MultiPolygon>
		};
	}

	function updatePolygonMap(map: maplibre.Map) {
		const polygonData = makePolygonData();

		fitPolygon(map, polygonData.bounds);

		const source = map.getSource<maplibre.GeoJSONSource>(ACCESS_MAP_ID);
		source?.setData(polygonData.features);
	}

	watch(
		() => [bindMap, polygon, fillColor, strokeColor],
		() => {
			if (!bindMap) return;
			updatePolygonMap(bindMap);
		}
	);
</script>

<div data-base-ui-swipe-ignore class="w-full h-46 border border-border rounded-lg overflow-hidden">
	<MapLibre
		bind:map={bindMap}
		center={getPolygonCenter()}
		zoom={ACCESS_MAP_MIN_ZOOM}
		style={getMapStyle(
			mapStyleForTheme("satellite") ?? mapStyleFromId(getUserSettings().mapStyle.id)
		)}
		class="size-full"
		attributionControl={false}
		interactive={true}
		zoomOnDoubleClick={true}
		minZoom={0}
		maxZoom={getConfig().general.maxZoom}
		onload={updatePolygonMap}
	>
		<GeoJSON
			id={ACCESS_MAP_ID}
			data={{ type: "FeatureCollection", features: [] } as FeatureCollection}
		>
			<FillLayer
				id="accessPolygonMapPolygonFill"
				paint={{ "fill-color": ["coalesce", ["get", "fillColor"], "transparent"] }}
			/>
			<LineLayer
				id="accessPolygonMapPolygonStroke"
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{
					"line-color": ["coalesce", ["get", "strokeColor"], "transparent"],
					"line-width": 1
				}}
			/>
		</GeoJSON>

		<MarkerCurrentLocation />
	</MapLibre>
</div>
