<script lang="ts">
	import { CircleLayer, FillLayer, GeoJSON, LineLayer, MapLibre, Marker, SymbolLayer } from "svelte-maplibre";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
	import { onDestroy, onMount, tick } from "svelte";
	import { getDirectLinkObject, openMapObject } from "@/lib/features/directLinks.svelte.js";
	import { clickMapHandler, openPopup, updateCurrentPath } from "@/lib/mapObjects/interact";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import * as m from "@/lib/paraglide/messages";
	import { clearUpdateMapObjectsInterval, resetUpdateMapObjectsInterval } from "@/lib/map/mapObjectsInterval";
	import { getMap, handleRotatePitchDisable, setMap } from "@/lib/map/map.svelte";
	import { clearPressTimer, onContextMenu } from "@/lib/ui/contextmenu.svelte.js";
	import { clearSessionImageUrls } from "@/lib/map/featuresManage.svelte";
	import { loadMapObjectInterval } from "@/lib/map/loadMapObjects";
	import {
		onMapMove,
		onMapMoveEnd,
		onMapMoveStart,
		onMapStyleDataLoading, onMapStyleLoad,
		onTouchStart,
		onWindowFocus
	} from "@/lib/map/events";
	import maplibre from "maplibre-gl";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import DebugMenu from "@/components/map/DebugMenu.svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import { addMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import MarkerCurrentLocation from "@/components/map/MarkerCurrentLocation.svelte";
	import MarkerContextMenu from "@/components/map/MarkerContextMenu.svelte";
	import { getCurrentScoutData } from "@/lib/features/scout.svelte.js";
	import { Coords } from "@/lib/utils/coordinates";
	import { isAnyModalOpen } from "@/lib/ui/modal.svelte.js";
	import {
		getCurrentSelectedFiltersetIsShared,
		openFiltersetModal
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { filtersetPageReset } from "@/lib/features/filters/filtersetPages.svelte";
	import { getOpenedMenu, Menu, openMenu } from "@/lib/ui/menus.svelte";
	import { CoverageMapLayerId, MapObjectLayerId, MapSourceId, RoutePathLayerId } from "@/lib/map/layers";
	import { MapObjectFeatureType } from "@/lib/map/featuresGen.svelte";
	import MarkerSearchedLocation from "@/components/map/MarkerSearchedLocation.svelte";
	import { getCurrentLocation } from "@/lib/map/geolocate.svelte";
	import { getFixedBounds } from "@/lib/mapObjects/mapBounds";
	import { getCoverageMapAreas, getIsCoverageMapActive } from "@/lib/features/coverageMap.svelte";
	import { featureCollection } from "@turf/turf";
	import { getKojiGeofences } from "@/lib/features/koji";
	import { getMapStyle, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { getConfig } from "@/lib/services/config/config";

	let map: maplibre.Map | undefined = $state(undefined);

	// lat/lon/zoom params
	const params = new URLSearchParams(window.location.search);

	const userSettings = getUserSettings();
	const lat = Number(params.get("lat") ?? undefined);
	const lon = Number(params.get("lon") ?? undefined);
	const zoom = Number(params.get("zoom") ?? undefined);

	if (Number.isFinite(lat)) {
		userSettings.mapPosition.center.lat = lat;
	}

	if (Number.isFinite(lon)) {
		userSettings.mapPosition.center.lng = lon;
	}

	if (Number.isFinite(zoom)) {
		userSettings.mapPosition.zoom = zoom;
	}

	history.replaceState({}, "", window.location.origin + window.location.pathname);
	updateUserSettings();

	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition));

	async function onMapLoad() {
		if (map) {
			setMap(map);

			map.on("touchstart", onTouchStart);
			map.on("touchend", clearPressTimer);
			map.on("touchmove", clearPressTimer);
			map.on("touchcancel", clearPressTimer);
			map.on("movestart", onMapMoveStart);
			map.on("move", onMapMove);
			map.on("styledataloading", onMapStyleDataLoading);

			handleRotatePitchDisable()

			// tick so feature handler registers first
			tick().then(() => map?.on("click", clickMapHandler));
		}
	}

	// update initial map objects only once every required part has been loaded
	let isInitUpdatedMapObjects = false;
	$effect(() => {
		const map = getMap();
		if (
			!isInitUpdatedMapObjects &&
			map
			&& hasLoadedFeature(LoadedFeature.REMOTE_LOCALE, LoadedFeature.MASTER_FILE, LoadedFeature.ICON_SETS, LoadedFeature.USER_DETAILS)
		) {
			const directLinkData = getDirectLinkObject();
			if (directLinkData) {
				if (directLinkData.id) {
					openMapObject(directLinkData)
				} else if ('noPermission' in directLinkData && directLinkData.noPermission) {
					openToast(m.direct_link_no_permission({ type: m["pogo_" + directLinkData.type]() }), 5000);
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
				.catch(e => console.error(e));
		}
	});

	onMount(() => {
		setMap(undefined);
		clearSessionImageUrls();
		updateCurrentPath();
	});

	onDestroy(() => {
		clearUpdateMapObjectsInterval();
		if (loadMapObjectInterval !== undefined) clearInterval(loadMapObjectInterval);
	});
</script>

<svelte:window
	onfocus={onWindowFocus}
	onblur={clearUpdateMapObjectsInterval}
></svelte:window>

<DebugMenu />

<MapLibre
	bind:map
	center={[initialMapPosition.center.lng, initialMapPosition.center.lat]}
	zoom={initialMapPosition.zoom}
	class="h-screen overflow-hidden"
	style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
	attributionControl={false}
	interactive={!isAnyModalOpen()}
	onmoveend={onMapMoveEnd}
	onload={onMapLoad}
	oncontextmenu={onContextMenu}
	minZoom={getConfig().general.minZoom}
	maxZoom={getConfig().general.maxZoom}
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

	<GeometryLayer
		id={MapSourceId.COVERAGE_MAP_AREAS}
		data={getCoverageMapAreas()}
		show={getIsCoverageMapActive}
		fillId={CoverageMapLayerId.POLYGON_FILL}
		strokeId={CoverageMapLayerId.POLYGON_STROKE}
	/>

	<GeoJSON
		id={MapSourceId.ROUTE_PATHS}
		data={{
			type: 'FeatureCollection',
			features: []
		}}
	>
		<LineLayer
			id={RoutePathLayerId.LINE}
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
			paint={{
				'line-color': ['case', ['get', 'isSelected'], '#FF6600', '#888888'],
				'line-width': ['case', ['get', 'isSelected'], 4, 2],
				'line-opacity': ['case', ['get', 'isSelected'], 0.9, 0.4]
			}}
			hoverCursor="pointer"
		/>
	</GeoJSON>

	<GeoJSON
		id={MapSourceId.MAP_OBJECTS}
		data={{
			type: 'FeatureCollection',
			features: []
		}}
	>
		<FillLayer
			id={MapObjectLayerId.POLYGON_FILL}
			paint={{
			  'fill-color': [
				  'case',
				  ['get', 'isSelected'],
				  ['get', 'selectedFill'],
				  ['get', 'fillColor']
				]
			}}
			hoverCursor="pointer"
		/>
		<LineLayer
			id={MapObjectLayerId.POLYGON_STROKE}
			layout={{ 'line-cap': 'round', 'line-join': 'round' }}
			paint={{ 'line-color': ["get", "strokeColor"], 'line-width': 1 }}
			hoverCursor="pointer"
		/>
		<CircleLayer
			id={MapObjectLayerId.CIRCLES}
			hoverCursor="pointer"
			filter={["==", ["get", "type"], MapObjectFeatureType.CIRCLE]}
			paint={{
				"circle-radius": [
					"*",
					["get", "radius"],
					["get", "selectedScale"],
					getUserSettings().mapIconSize
				],
				'circle-color': ["get", "fillColor"],
				'circle-stroke-width': 1,
				'circle-stroke-color': ["get", "strokeColor"]
			}}
			eventsIfTopMost={true}
		/>
		<SymbolLayer
			id={MapObjectLayerId.ICONS}
			hoverCursor="pointer"
			filter={["==", ["get", "type"], MapObjectFeatureType.ICON]}
			layout={{
				"icon-image": ["get", "imageUrl"],
				"icon-overlap": "always",
				"icon-size": [
					"*",
					["get", "imageSize"],
					["get", "selectedScale"],
					getUserSettings().mapIconSize
				],
				"icon-allow-overlap": true,
				"icon-offset": ["get", "imageOffset"],
				"text-field": ["case", ["has", "routeCount"], ["to-string", ["get", "routeCount"]], ""],
				"text-offset": [0, 1.5],
				"text-size": 12,
				"text-allow-overlap": true,
				"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
			}}
			paint={{
				"text-color": "#ffffff",
				"text-halo-color": "#000000",
				"text-halo-width": 1.5
			}}
			eventsIfTopMost={true}
		/>
	</GeoJSON>

	<!--{#if getMap()}-->
	<!--{@const fixedBounds = getFixedBounds(8)}-->

	<!--<Marker lngLat={[fixedBounds.minLon, fixedBounds.minLat]}>-->
	<!--	<div class="size-4 bg-red-400"></div>-->
	<!--</Marker>-->

	<!--<Marker lngLat={[fixedBounds.maxLon, fixedBounds.maxLat]}>-->
	<!--	<div class="size-4 bg-red-400"></div>-->
	<!--</Marker>-->
	<!--{/if}-->


	<MarkerCurrentLocation />
	<MarkerContextMenu />
	<MarkerSearchedLocation />
</MapLibre>