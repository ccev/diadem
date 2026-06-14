<script lang="ts">
	import { getSearchedGeomtry } from "@/lib/services/search.svelte";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import { MapSourceId } from "@/lib/map/layers";
	import type { Feature } from "geojson";

	let features: Feature[] = $derived.by(() => {
		const geometry = getSearchedGeomtry();
		if (!geometry) return [];

		return [
			{
				type: "Feature",
				geometry,
				properties: {
					fillColor: "rgba(255, 32, 86, 0.2)",
					strokeColor: "rgba(255, 32, 86, 0.3)"
				}
			}
		];
	});
</script>

<GeometryLayer
	show={Boolean(features.length)}
	id={MapSourceId.SEARCHED_GEOMETRY}
	data={{
		type: "FeatureCollection",
		features
	}}
/>
