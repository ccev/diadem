<script lang="ts">
	import { FillLayer, GeoJSON, LineLayer } from "svelte-maplibre";
	import { type FeatureCollection, type GeoJSON as GeoJsonType } from "geojson";
	import { CoverageMapLayerId, type MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getMap, getMapStyleVersion } from "@/lib/map/map.svelte";
	import maplibre from "maplibre-gl";
	import { tick } from "svelte";

	let {
		id,
		data = undefined,
		reactive = true,
		show = true,
		fillId = undefined,
		strokeId = undefined,
		map = undefined,
		hoverCursor = undefined
	}: {
		id: MapSourceId;
		data?: FeatureCollection;
		reactive?: Readonly<boolean>;
		show?: boolean | (() => boolean);
		fillId?: any;
		strokeId?: any;
		map?: maplibre.Map;
		hoverCursor?: string;
	} = $props();

	let lastWasEmpty = true;

	// svelte-ignore state_referenced_locally values are never updated
	const makeEffect = reactive && data;

	if (makeEffect) {
		$effect(() => {
			if (!map) map = getMap();
			if (!map) return;

			getMapStyleVersion();
			if (data.features.length === 0 && lastWasEmpty) return;

			lastWasEmpty = data.features.length === 0;
			updateMapGeojsonSource(map, id, data);
		});
	}
</script>

<GeoJSON
	{id}
	data={data ?? {
		type: "FeatureCollection",
		features: []
	}}
>
	{#if typeof show === "function" ? show() : show}
		<FillLayer
			id={fillId}
			{hoverCursor}
			paint={{
				"fill-color": ["get", "fillColor"],
				"fill-opacity": 0.5
			}}
		/>
		<LineLayer
			id={strokeId}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{ "line-color": ["get", "strokeColor"], "line-width": 2 }}
		/>
	{/if}
</GeoJSON>
