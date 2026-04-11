<script lang="ts">
	import { CircleLayer, FillLayer, GeoJSON, LineLayer } from "svelte-maplibre";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
	import { onDestroy, onMount, tick } from "svelte";
	import { getDirectLinkObject, openMapObject } from "@/lib/features/directLinks.svelte.js";
	import { clickMapHandler, updateCurrentPath } from "@/lib/mapObjects/interact";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import * as m from "@/lib/paraglide/messages";
	import {
		clearUpdateMapObjectsInterval,
		resetUpdateMapObjectsInterval
	} from "@/lib/map/mapObjectsInterval";
	import { getMap, setMap } from "@/lib/map/map.svelte";
	import { clearPressTimer, onContextMenu } from "@/lib/ui/contextmenu.svelte.js";
	import { loadMapObjectInterval } from "@/lib/map/loadMapObjects";
	import { onMapMoveEnd, onMapMoveStart, onTouchStart, onWindowFocus } from "@/lib/map/events";
	import maplibre from "maplibre-gl";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import DebugMenu from "@/components/map/DebugMenu.svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import MarkerCurrentLocation from "@/components/map/MarkerCurrentLocation.svelte";
	import MarkerContextMenu from "@/components/map/MarkerContextMenu.svelte";
	import { getCurrentScoutData } from "@/lib/features/scout.svelte.js";
	import {
		getCurrentSelectedFiltersetIsShared,
		openFiltersetModal
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { filtersetPageReset } from "@/lib/features/filters/filtersetPages.svelte";
	import { getOpenedMenu, Menu, openMenu } from "@/lib/ui/menus.svelte";
	import { MapObjectLayerId, MapSourceId } from "@/lib/map/layers";
	import MarkerSearchedLocation from "@/components/map/MarkerSearchedLocation.svelte";
	import MapObjectIconLayer from "@/components/map/MapObjectIconLayer.svelte";
	import { FeatureTypes } from "@/lib/map/render/featureTypes";
	import MapCommon from "@/components/map/MapCommon.svelte";
	import { getMapPositionFromUrlParams } from "@/components/map/mapPositionParams";
	import { Coords } from "@/lib/utils/coordinates";

	let {
		map = $bindable()
	}: {
		map?: maplibre.Map | undefined;
	} = $props();

	const [center, zoom] = getMapPositionFromUrlParams();
	const userSettings = getUserSettings();
	if (center) {
		userSettings.mapPosition.center.lat = center.lat;
		userSettings.mapPosition.center.lng = center.lon;
	}
	if (zoom) {
		userSettings.mapPosition.zoom = zoom;
	}
	if (center || zoom) {
		updateUserSettings();
	}

	const mapPosition = $state.snapshot(getUserSettings().mapPosition);

	async function onMapLoad(map: maplibre.Map) {
		setMap(map);

		map.on("moveend", onMapMoveEnd);
		map.on("contextmenu", onContextMenu);
		map.on("touchstart", onTouchStart);
		map.on("touchend", clearPressTimer);
		map.on("touchmove", clearPressTimer);
		map.on("touchcancel", clearPressTimer);
		map.on("movestart", onMapMoveStart);

		// tick so feature handler registers first
		tick().then(() => map?.on("click", clickMapHandler));
	}

	// update initial map objects only once every required part has been loaded
	let isInitUpdatedMapObjects = false;
	$effect(() => {
		const map = getMap();
		if (
			!isInitUpdatedMapObjects &&
			map &&
			hasLoadedFeature(
				LoadedFeature.REMOTE_LOCALE,
				LoadedFeature.MASTER_FILE,
				LoadedFeature.ICON_SETS,
				LoadedFeature.USER_DETAILS
			)
		) {
			const directLinkData = getDirectLinkObject();
			if (directLinkData) {
				if (directLinkData.id) {
					openMapObject(directLinkData);
				} else if ("noPermission" in directLinkData && directLinkData.noPermission) {
					openToast(
						m.direct_link_no_permission({ type: m["pogo_" + directLinkData.type]() }),
						5000
					);
				} else {
					openToast(m.direct_link_not_found({ type: m["pogo_" + directLinkData.type]() }), 5000);
				}
			}

			if (getCurrentSelectedFiltersetIsShared()) {
				openMenu(Menu.FILTERS);
				filtersetPageReset();
				tick().then(openFiltersetModal);
			}

			isInitUpdatedMapObjects = true;
			updateAllMapObjects(false)
				.then(() => {
					resetUpdateMapObjectsInterval();
				})
				.catch((e) => console.error(e));
		}
	});

	onMount(() => {
		isInitUpdatedMapObjects = false;
		setMap(undefined);
		updateCurrentPath();
	});

	onDestroy(() => {
		clearUpdateMapObjectsInterval();
		if (loadMapObjectInterval !== undefined) clearInterval(loadMapObjectInterval);
	});
</script>

<svelte:window onfocus={onWindowFocus} onblur={clearUpdateMapObjectsInterval} />

<DebugMenu />

<MapCommon
	bind:map
	onload={onMapLoad}
	initialCenter={Coords.infer(mapPosition.center)}
	initialZoom={mapPosition.zoom}
>
	<GeometryLayer id={MapSourceId.SELECTED_WEATHER} reactive={false} />
	<GeometryLayer
		show={() => getOpenedMenu() === Menu.SCOUT}
		id={MapSourceId.SCOUT_BIG_POINTS}
		data={getCurrentScoutData().bigPoints}
	/>
	<GeometryLayer
		show={() => getOpenedMenu() === Menu.SCOUT}
		id={MapSourceId.SCOUT_SMALL_POINTS}
		data={getCurrentScoutData().smallPoints}
	/>

	<GeoJSON
		id={MapSourceId.MAP_OBJECTS}
		data={{
			type: "FeatureCollection",
			features: []
		}}
	>
		<FillLayer
			id={MapObjectLayerId.POLYGON_FILL}
			paint={{
				"fill-color": ["case", ["get", "isSelected"], ["get", "selectedFill"], ["get", "fillColor"]]
			}}
			hoverCursor="pointer"
		/>
		<LineLayer
			id={MapObjectLayerId.POLYGON_STROKE}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{ "line-color": ["get", "strokeColor"], "line-width": 1 }}
			hoverCursor="pointer"
		/>
		<CircleLayer
			id={MapObjectLayerId.CIRCLES}
			hoverCursor="pointer"
			filter={["==", ["get", "type"], FeatureTypes.CIRCLE]}
			paint={{
				"circle-radius": [
					"*",
					["get", "radius"],
					["get", "selectedScale"],
					getUserSettings().mapIconSize
				],
				"circle-color": ["get", "fillColor"],
				"circle-stroke-width": 1,
				"circle-stroke-color": ["get", "strokeColor"]
			}}
			eventsIfTopMost={true}
		/>
		<MapObjectIconLayer
			id={MapObjectLayerId.ICONS}
			hoverCursor="pointer"
			filter={["==", ["get", "type"], FeatureTypes.ICON]}
			eventsIfTopMost={true}
		/>
	</GeoJSON>

	<MarkerCurrentLocation />
	<MarkerContextMenu />
	<MarkerSearchedLocation />
</MapCommon>
