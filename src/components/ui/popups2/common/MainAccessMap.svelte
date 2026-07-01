<script lang="ts">
	import MarkerCurrentLocation from "@/components/map/MarkerCurrentLocation.svelte";
	import MapObjectIconLayer from "@/components/map/MapObjectIconLayer.svelte";
	import { ensureMapImages } from "@/lib/map/render/images";
	import {
		FeatureTypes,
		getIconFeature,
		isFeatureIcon,
		type MapObjectFeature,
		type MapObjectIconFeature
	} from "@/lib/map/render/featureTypes";
	import { getConfigModifiers } from "@/lib/map/render/renderMapObjects";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getConfig } from "@/lib/services/config/config";
	import type { UiconSetModifierType } from "@/lib/services/config/configTypes";
	import { getUiconSetDetails } from "@/lib/services/uicons.svelte";
	import { getUserSettings, type UserSettings } from "@/lib/services/userSettings.svelte";
	import { getMapStyle, mapStyleForTheme, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { circle } from "@turf/turf";
	import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
	import maplibre from "maplibre-gl";
	import { untrack } from "svelte";
	import { FillLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";
	import { watch } from "runed";

	let {
		lat,
		lon,
		type,
		uiconType,
		icon,
		radius,
		zoom = 17,
		class: class_ = ""
	}: {
		lat: number;
		lon: number;
		type: MapObjectType;
		uiconType: keyof UserSettings["uiconSet"];
		icon: string;
		radius: number;
		zoom?: number;
		class?: string;
	} = $props();

	const ACCESS_MAP_ID = "mainAccessMap";
	let bindMap: maplibre.Map | undefined = $state(undefined);

	function makeAccessData(map: maplibre.Map) {
		const accessCenter: [number, number] = [lon, lat];
		const iconSet = getUiconSetDetails(getUserSettings().uiconSet[uiconType]?.id ?? "");
		const modifiers = getConfigModifiers(iconSet, type);

		const features: MapObjectFeature[] = [
			getIconFeature(ACCESS_MAP_ID, accessCenter, {
				id: ACCESS_MAP_ID,
				imageUrl: icon,
				imageSize: modifiers.scale * 1.5,
				selectedScale: 1,
				imageOffset: [modifiers.offsetX, modifiers.offsetY],
				expires: null
			})
		];

		const radiusFeature = circle(accessCenter, radius, {
			steps: 96,
			units: "meters"
		}) as Feature<Polygon>;

		const iconFeatures = features.filter((feature) => isFeatureIcon(feature)) as MapObjectIconFeature[];

		return {
			accessCenter,
			features: {
				type: "FeatureCollection" as const,
				features: [radiusFeature, ...iconFeatures]
			},
			iconFeatures: {
				type: "FeatureCollection" as const,
				features: iconFeatures
			} satisfies FeatureCollection<Polygon | Point>
		};
	}

	async function updateAccessMap(map: maplibre.Map) {
		const accessData = makeAccessData(map);

		map.setCenter(accessData.accessCenter);

		await ensureMapImages(
			map,
			accessData.iconFeatures.features.map((feature) => feature.properties)
		);

		const source = map.getSource<maplibre.GeoJSONSource>(ACCESS_MAP_ID);
		source?.setData(accessData.features);
	}

	$effect(() => {
		if (!bindMap) return;
		lat;
		lon;
		type;
		icon;
		radius;
		untrack(async () => {
			if (!bindMap) return;
			await updateAccessMap(bindMap);
		});
	});

	$effect(() => {
		if (!bindMap) return
		zoom;
		untrack(() => bindMap?.easeTo({ zoom }))
	})
</script>

<div
	data-vaul-no-drag
	class="w-full h-46 border border-border rounded-lg overflow-hidden {class_}"
>
	<MapLibre
		bind:map={bindMap}
		center={[0, 0]}
		{zoom}
		style={getMapStyle(mapStyleForTheme("satellite") ?? mapStyleFromId(getUserSettings().mapStyle.id))}
		class="size-full"
		attributionControl={false}
		interactive={true}
		zoomOnDoubleClick={true}
		minZoom={15}
		maxZoom={getConfig().general.maxZoom}
		onload={updateAccessMap}
	>
		<GeoJSON id={ACCESS_MAP_ID} data={{ type: "FeatureCollection", features: [] }}>
			<FillLayer
				id="mainAccessMapRadiusFill"
				filter={["==", ["geometry-type"], "Polygon"]}
				paint={{ "fill-color": "rgba(70, 236, 213, 0.4)" }}
			/>
			<LineLayer
				id="mainAccessMapRadiusStroke"
				filter={["==", ["geometry-type"], "Polygon"]}
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{ "line-color": "rgba(70, 236, 213, 0.8)", "line-width": 1.5 }}
			/>
			<MapObjectIconLayer
				id="mainAccessMapIcon"
				filter={["==", ["get", "type"], FeatureTypes.ICON]}
			/>
		</GeoJSON>

		<MarkerCurrentLocation />
	</MapLibre>
</div>
