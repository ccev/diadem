<script lang="ts">
	import { FillLayer, GeoJSON, LineLayer } from "svelte-maplibre";
	import type { FeatureCollection, Polygon } from "geojson";
	import { MapSourceId } from "@/lib/map/layers";

	let {
		data
	}: {
		data: FeatureCollection<Polygon>
	} = $props();
</script>

<GeoJSON
	id={MapSourceId.MAP_FENCES}
	{data}
>
	<FillLayer
		paint={{
			'fill-color': ["get", "fillColor"],
			'fill-opacity': 0.5,
		}}
	/>
	<LineLayer
		layout={{ 'line-cap': 'round', 'line-join': 'round' }}
		paint={{
			'line-color': ["get", "strokeColor"],
			'line-width': 2
		}}
	/>
</GeoJSON>
