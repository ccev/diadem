<script lang="ts">
	import { Binoculars, Earth, MapPin } from "@lucide/svelte";
	import { FillLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";
	import ToolLink from "@/components/menus/tools/ToolLink.svelte";
	import { getCoverageMapAreas, openCoverageMap } from "@/lib/features/coverageMap.svelte";
	import { openWayfarerMap } from "@/lib/features/wayfarerMap.svelte";
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
	import { getDefaultMapStyle } from "@/lib/services/themeMode";
	import { featureCollection } from "@turf/turf";
</script>

<div class="space-y-2">
	{#if hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT) && getConfig().tools.scout}
		<ToolLink
			Icon={Binoculars}
			title="Scout"
			description="Scan any location"
			onclick={() => {
				const map = getMap();
				if (!map) return;
				setJustChangedMenus();
				setCurrentScoutCoords([Coords.infer(map.getCenter())]);
				setCurrentScoutCenter(Coords.infer(map.getCenter()));
				openMenu(Menu.SCOUT);
			}}
		></ToolLink>
	{/if}

	{#if isSupportedFeature("koji") && getConfig().tools.coverageMap && hasFeatureAnywhere(getUserDetails().permissions, Features.COVERAGE_MAP)}
		<ToolLink
			Icon={Earth}
			title="Coverage Map"
			description="Overview of all scanned areas"
			onclick={() => openCoverageMap()}
		></ToolLink>
	{/if}

	{#if hasFeatureAnywhere(getUserDetails().permissions, Features.WAYFARER_MAP)}
		<ToolLink
			Icon={MapPin}
			title="Wayfarer Map"
			description="Plan your Wayfarer submissions"
			onclick={() => openWayfarerMap()}
		/>
	{/if}
</div>
