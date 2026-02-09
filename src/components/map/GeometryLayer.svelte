<script lang="ts">
	import { FillLayer, GeoJSON, LineLayer } from "svelte-maplibre";
	import { type FeatureCollection, type GeoJSON as GeoJsonType } from "geojson";
	import { CoverageMapLayerId, type MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getMapStyleVersion } from "@/lib/map/map.svelte";

	let {
		id,
		data = undefined,
		reactive = true,
		show = true,
		fillId = undefined,
		strokeId = undefined
	}: {
		id: string,
		data?: FeatureCollection,
		reactive?: Readonly<boolean>,
		show?: boolean | (() => boolean),
		fillId?: any,
		strokeId?: any
	} = $props();

	let lastWasEmpty = true;

	// svelte-ignore state_referenced_locally values are never updated
	const makeEffect = reactive && data;

	if (makeEffect) {
		$effect(() => {
			getMapStyleVersion()
			if (data.features.length === 0 && lastWasEmpty) return;
			lastWasEmpty = data.features.length === 0;
			updateMapGeojsonSource(id, data);
		});
	}
</script>

<GeoJSON
	{id}
	data={{
		type: 'FeatureCollection',
		features: []
	}}
>
	{#if typeof show === 'function' ? show() : show}
		<FillLayer
			id={fillId}
			paint={{
			  'fill-color': ["get", "fillColor"],
			  'fill-opacity': 0.5,
			}}
		/>
		<LineLayer
			id={strokeId}
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
			paint={{ 'line-color': ["get", "strokeColor"], 'line-width': 2 }}
		/>
	{/if}

</GeoJSON>