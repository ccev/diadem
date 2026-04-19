<script lang="ts">
	import { Binoculars, ChartColumnBig, Earth } from "lucide-svelte";
	import { FillLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";
	import { getDefaultMapStyle } from "@/lib/services/themeMode";
	import { CoverageMapLayerId, MapObjectLayerId, MapSourceId } from "@/lib/map/layers";
	import * as turf from "@turf/turf";
	import ToolLink from "@/components/menus/tools/ToolLink.svelte";
	import { getCoverageMapAreas, openCoverageMap } from "@/lib/features/coverageMap.svelte";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { Features } from "@/lib/utils/features";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import {
		getCoords,
		getScoutGeojsons,
		setCurrentScoutCenter,
		setCurrentScoutCoords
	} from "@/lib/features/scout.svelte";
	import { Menu, openMenu, setJustChangedMenus } from "@/lib/ui/menus.svelte";
	import { getMap } from "@/lib/map/map.svelte";
	import { Coords } from "@/lib/utils/coordinates";
	import { featureCollection } from "@turf/turf";
	import * as m from "@/lib/paraglide/messages";
</script>

<div class="space-y-2">
	{#if hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT) && getConfig().tools.scout}
		<ToolLink
			Icon={Binoculars}
			title={m.tool_scout_title()}
			description={m.tool_scout_description()}
			onclick={() => {
				const map = getMap();
				if (!map) return;
				setJustChangedMenus();
				setCurrentScoutCoords([Coords.infer(map.getCenter())]);
				setCurrentScoutCenter(Coords.infer(map.getCenter()));
				openMenu(Menu.SCOUT);
			}}
		>
			{@const coords = getCoords(
				new Coords(
					(getConfig().mapPositions.scoutLat ?? 53.563) - 0.01,
					(getConfig().mapPositions.scoutLon ?? 9.979) + 0.04
				),
				2
			)}
			{@const [smallPoints, bigPoints] = getScoutGeojsons(coords, 2)}
			<MapLibre
				class="absolute! top-0 right-0 h-full w-1/2"
				center={[
					getConfig().mapPositions.scoutLon ?? 9.979,
					getConfig().mapPositions.scoutLat ?? 53.563
				]}
				zoom={getConfig().mapPositions.scoutZoom ?? 10.5}
				filterLayers={(l) => l.type !== "symbol"}
				style={getDefaultMapStyle().url}
				attributionControl={false}
				interactive={true}
				zoomOnDoubleClick={false}
			>
				<GeoJSON id="scout-small" data={featureCollection(smallPoints)}>
					<FillLayer
						paint={{
							"fill-color": ["get", "fillColor"],
							"fill-opacity": 0.5
						}}
					/>
					<LineLayer
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": ["get", "strokeColor"], "line-width": 2 }}
					/>
				</GeoJSON>
				<GeoJSON id="scout-big" data={featureCollection(bigPoints)}>
					<FillLayer
						paint={{
							"fill-color": ["get", "fillColor"],
							"fill-opacity": 0.5
						}}
					/>
					<LineLayer
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": ["get", "strokeColor"], "line-width": 2 }}
					/>
				</GeoJSON>
			</MapLibre>
		</ToolLink>
	{/if}

	{#if isSupportedFeature("koji") && getConfig().tools.coverageMap}
		<ToolLink
			Icon={Earth}
			title={m.tool_coverage_map_title()}
			description={m.tool_coverage_map_description()}
			onclick={() => openCoverageMap()}
		>
			<MapLibre
				class="absolute! top-0 right-0 h-full w-1/2"
				center={[
					getConfig().mapPositions.coverageLon ?? 9.979,
					getConfig().mapPositions.coverageLat ?? 53.563
				]}
				zoom={getConfig().mapPositions.coverageZoom ?? 5.5}
				filterLayers={(l) => l.type !== "symbol"}
				style={getDefaultMapStyle().url}
				attributionControl={false}
				interactive={false}
				zoomOnDoubleClick={false}
			>
				<GeoJSON id="tools-coveragemap" data={getCoverageMapAreas()}>
					<FillLayer
						paint={{
							"fill-color": ["get", "fillColor"],
							"fill-opacity": 0.5
						}}
					/>
					<LineLayer
						layout={{ "line-cap": "round", "line-join": "round" }}
						paint={{ "line-color": ["get", "strokeColor"], "line-width": 2 }}
					/>
				</GeoJSON>
			</MapLibre>
		</ToolLink>
	{/if}
</div>
