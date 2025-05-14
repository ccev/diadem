<script lang="ts">
	import { FillLayer, GeoJSON, LineLayer } from 'svelte-maplibre';
	import { type GeoJSON as GeoJsonType } from 'geojson';

	let {
		id,
		data
	}: {
		id: string,
		data: GeoJsonType
	} = $props()
</script>

<GeoJSON
	{id}
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
		paint={{ 'line-color': ["get", "strokeColor"], 'line-width': 2 }}
	/>

</GeoJSON>