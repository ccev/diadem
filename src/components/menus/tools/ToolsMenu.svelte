<script lang="ts">
	import { Binoculars, ChartColumnBig, Earth } from "lucide-svelte";
	import { FillLayer, GeoJSON, MapLibre } from "svelte-maplibre";
	import { getDefaultMapStyle } from "@/lib/services/themeMode";
	import { MapObjectLayerId } from "@/lib/map/layers";
	import * as turf from "@turf/turf";
	import ToolLink from "@/components/menus/tools/ToolLink.svelte";
	import { openCoverageMap } from "@/lib/features/coverageMap.svelte";
</script>

<div class="space-y-2">
	<ToolLink
		Icon={Binoculars}
		title="Scout"
		description="Scan any location"
	>
		<div></div>
	</ToolLink>

	<ToolLink
		Icon={ChartColumnBig}
		title="Stats"
		description="Shiny odds, active raids and more"
	>
		<div></div>
	</ToolLink>

	<ToolLink
		Icon={Earth}
		title="Coverage Map"
		description="Overview all scanned areas"
		onclick={openCoverageMap}
	>
		{@const polygon = turf.polygon([[
			[9.994384304516842, 53.55800731621986],
			[10.002945058009459, 53.56370662027439],
			[9.98345834699893, 53.561085432938086],
			[9.994384304516842, 53.55800731621986],
		]])}
		<MapLibre
			class="absolute! top-0 right-0 h-full w-1/2"
			center={[9.979, 53.563]}
			zoom={12}
			style={getDefaultMapStyle().url}
			attributionControl={false}
			interactive={false}
			zoomOnDoubleClick={false}
		>
			<GeoJSON
				id="tools-coveragemap"
				data={{
					type: 'FeatureCollection',
					features: [polygon]
				}}
			>
				<FillLayer
					id={MapObjectLayerId.POLYGON_FILL}
					paint={{
					  'fill-color': "rgba(255, 0, 0, 20%)"
					}}
					hoverCursor="pointer"
				/>
			</GeoJSON>
		</MapLibre>
	</ToolLink>

<!--	<Card class="px-6 py-6 relative overflow-hidden text-lg">-->
<!--		<MapLibre-->
<!--			class="absolute! top-0 right-0 h-full w-1/2"-->
<!--			center={[9.979, 53.563]}-->
<!--			zoom={12}-->
<!--			style={getDefaultMapStyle().url}-->
<!--			attributionControl={false}-->
<!--			interactive={false}-->
<!--			zoomOnDoubleClick={false}-->
<!--		>-->
<!--			<GeoJSON-->
<!--				id="tools-coveragemap"-->
<!--				data={{-->
<!--					type: 'FeatureCollection',-->
<!--					features: [polygon]-->
<!--				}}-->
<!--			>-->
<!--				<FillLayer-->
<!--					id={MapObjectLayerId.POLYGON_FILL}-->
<!--					paint={{-->
<!--					  'fill-color': "rgba(255, 0, 0, 20%)"-->
<!--					}}-->
<!--					hoverCursor="pointer"-->
<!--				/>-->
<!--			</GeoJSON>-->
<!--		</MapLibre>-->
<!--		<div class="absolute top-0 right-0 bg-linear-to-r from-background to-background/50 w-1/2 h-full">-->

<!--		</div>-->
<!--		&lt;!&ndash;		<MapPin class="absolute top-1/2 -translate-y-1/2 -right-10 text-muted size-32 stroke-1" />&ndash;&gt;-->
<!--		<div class="flex items-center gap-2 w-full font-semibold relative">-->
<!--			<Map class="size-4.5" />-->
<!--			<span>Coverage Map</span>-->
<!--			&lt;!&ndash;			<ArrowRight class="size-4 ml-auto" />&ndash;&gt;-->
<!--		</div>-->
<!--		<p class="text-muted-foreground relative">-->
<!--			Explore all covered areas-->
<!--		</p>-->
<!--	</Card>-->
<!--	<Card class="p-4 relative overflow-hidden">-->
<!--		<Radar class="absolute top-1/2 -translate-y-1/2 -right-10 text-muted size-32 stroke-1" />-->
<!--		<div class="flex items-center gap-2 w-full font-semibold relative">-->
<!--			<Binoculars class="size-4.5" />-->
<!--			<span>Scout</span>-->
<!--			&lt;!&ndash;			<ArrowRight class="size-4 ml-auto" />&ndash;&gt;-->
<!--		</div>-->
<!--		<p class="text-muted-foreground relative">-->
<!--			Scan any location-->
<!--		</p>-->
<!--	</Card>-->
<!--	<Card class="p-4 relative overflow-hidden">-->
<!--		<Notebook class="absolute top-1/2 -translate-y-1/2 -right-10 text-muted size-32 stroke-1" />-->
<!--		<div class="flex items-center gap-2 w-full font-semibold">-->
<!--			<ChartColumnBig class="size-4.5" />-->
<!--			<span>Stats</span>-->
<!--			&lt;!&ndash;			<ArrowRight class="size-4 ml-auto" />&ndash;&gt;-->
<!--		</div>-->
<!--		<p class="text-muted-foreground">-->
<!--			Shiny odds, active raids and more-->
<!--		</p>-->
<!--	</Card>-->
</div>
