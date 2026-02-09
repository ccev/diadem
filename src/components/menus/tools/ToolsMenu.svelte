<script lang="ts">
	import { Binoculars, ChartColumnBig, Earth } from "lucide-svelte";
	import { FillLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";
	import { getDefaultMapStyle } from "@/lib/services/themeMode";
	import { CoverageMapLayerId, MapObjectLayerId, MapSourceId } from "@/lib/map/layers";
	import * as turf from "@turf/turf";
	import ToolLink from "@/components/menus/tools/ToolLink.svelte";
	import { getCoverageMapAreas, getIsCoverageMapActive, openCoverageMap } from "@/lib/features/coverageMap.svelte";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { Features } from "@/lib/utils/features";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
</script>

<div class="space-y-2">
	{#if hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT) && getConfig().tools.scout}
		<ToolLink
			Icon={Binoculars}
			title="Scout"
			description="Scan any location"
		>
			<div></div>
		</ToolLink>
	{/if}

	{#if getConfig().tools.stats}
		<ToolLink
			Icon={ChartColumnBig}
			title="Stats"
			description="Shiny odds, active raids and more"
		>
			<div></div>
		</ToolLink>
	{/if}

	{#if isSupportedFeature("koji") && getConfig().tools.coverageMap}
		<ToolLink
			Icon={Earth}
			title="Coverage Map"
			description="Overview all scanned areas"
			onclick={openCoverageMap}
		>
			<MapLibre
				class="absolute! top-0 right-0 h-full w-1/2"
				center={[
				getConfig().mapPositions.coverageLat ?? 9.979,
				getConfig().mapPositions.coverageLon ?? 53.563
			]}
				zoom={getConfig().mapPositions.coverageZoom ?? 5.5}
				filterLayers={l => l.type !== "symbol"}
				style={getDefaultMapStyle().url}
				attributionControl={false}
				interactive={false}
				zoomOnDoubleClick={false}
			>
				<GeoJSON
					id="tools-coveragemap"
					data={getCoverageMapAreas()}
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
			</MapLibre>
		</ToolLink>
	{/if}
</div>
