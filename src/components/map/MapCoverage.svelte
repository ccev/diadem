<script lang="ts">
	import maplibre from "maplibre-gl";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import { CoverageMapLayerId, MapSourceId } from "@/lib/map/layers";
	import {
		coverageMapClickHandler,
		getCoverageMapAreas,
		setCoverageMap
	} from "@/lib/features/coverageMap.svelte";
	import MapCommon from "@/components/map/MapCommon.svelte";
	import { getMapPositionFromUrlParams } from "@/components/map/mapPositionParams";
	import { getConfig } from "@/lib/services/config/config";
	import { Coords } from "@/lib/utils/coordinates";

	let {
		map = $bindable()
	}: {
		map?: maplibre.Map | undefined;
	} = $props();

	const [paramCenter, paramZoom] = getMapPositionFromUrlParams();
	const config = getConfig()?.mapPositions;
	let configCenter =
		config?.coverageMapLat && config?.coverageMapLon
			? new Coords(config.coverageMapLat, config.coverageMapLon)
			: undefined;
</script>

<MapCommon
	bind:map
	initialCenter={paramCenter ?? configCenter ?? new Coords(51.516855, -0.0805)}
	initialZoom={paramZoom ?? config?.coverageMapZoom ?? 10}
	onload={(map) => {
		setCoverageMap(map);
		map.on("click", coverageMapClickHandler);
	}}
>
	<GeometryLayer
		id={MapSourceId.COVERAGE_MAP_AREAS}
		data={getCoverageMapAreas()}
		fillId={CoverageMapLayerId.POLYGON_FILL}
		strokeId={CoverageMapLayerId.POLYGON_STROKE}
		reactive={false}
		{map}
		hoverCursor="pointer"
	/>
</MapCommon>
