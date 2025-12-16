<script lang="ts">
	import { GeoJSON, MapLibre, SymbolLayer } from "svelte-maplibre";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte.js";
	import { onDestroy, onMount, tick } from "svelte";
	import { getDirectLinkObject } from "@/lib/features/directLinks.svelte.js";
	import { clickFeatureHandler, clickMapHandler, openPopup, updateCurrentPath } from "@/lib/mapObjects/interact";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import Card from "@/components/ui/Card.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { isWebglSupported } from "@/lib/map/utils";
	import { clearUpdateMapObjectsInterval, resetUpdateMapObjectsInterval } from "@/lib/map/mapObjectsInterval";
	import { getMap, setMap } from "@/lib/map/map.svelte";
	import { clearPressTimer, onContextMenu } from "@/lib/ui/contextmenu.svelte.js";
	import { clearSessionImageUrls } from "@/lib/map/featuresManage.svelte";
	import { loadMapObjectInterval } from "@/lib/map/loadMapObjects";
	import {
		onMapMove,
		onMapMoveEnd,
		onMapMoveStart,
		onMapStyleDataLoading,
		onTouchStart,
		onWindowFocus
	} from "@/lib/map/events";
	import maplibre from "maplibre-gl";
	import { getS2CellGeojson } from "@/lib/mapObjects/s2cells.svelte.js";
	import GeometryLayer from "@/components/map/GeometryLayer.svelte";
	import DebugMenu from "@/components/map/DebugMenu.svelte";
	import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte.js";
	import { openToast } from "@/lib/ui/toasts.svelte.js";
	import { addMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import MarkerCurrentLocation from "@/components/map/MarkerCurrentLocation.svelte";
	import MarkerContextMenu from "@/components/map/MarkerContextMenu.svelte";
	import { getCurrentScoutData } from "@/lib/features/scout.svelte.js";
	import { Coords } from "@/lib/utils/coordinates";
	import { isAnyModalOpen, openModal } from "@/lib/ui/modal.svelte.js";
	import {
		getCurrentSelectedFiltersetIsShared,
		openFiltersetModal
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { filtersetPageReset } from "@/lib/features/filters/filtersetPages.svelte";
	import { openMenu } from "@/lib/ui/menus.svelte";
	import { MapSourceId } from "@/lib/map/layers";

	let map: maplibre.Map | undefined = $state(undefined);
	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition));

	async function onMapLoad() {
		if (map) {
			setMap(map);

			map.on('touchstart', onTouchStart);
			map.on('touchend', clearPressTimer);
			map.on('touchmove', clearPressTimer);
			map.on('touchcancel', clearPressTimer);
			map.on('movestart', onMapMoveStart);
			map.on('move', onMapMove);
			map.on('styledataloading', onMapStyleDataLoading)

			// tick so feature handler registers first
			tick().then(() => map?.on('click', clickMapHandler));
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
					addMapObjects([directLinkData], directLinkData.type, 1)
					openPopup(directLinkData)

					if (!map.getBounds().contains(Coords.infer(directLinkData).maplibre())) {
						getUserSettings().mapPosition.center.lat = directLinkData.lat;
						getUserSettings().mapPosition.center.lng = directLinkData.lon;
						getUserSettings().mapPosition.zoom = 18;
						updateUserSettings();

						map.setCenter({ lat: directLinkData.lat, lng: directLinkData.lon });
						map.setZoom(18);
					}
				} else {
					openToast(m.direct_link_not_found({ type: m['pogo_' + directLinkData.type]() }), 5000);
				}
			}

			if (getCurrentSelectedFiltersetIsShared()) {
				openMenu("filters")
				filtersetPageReset()
				tick().then(openFiltersetModal)
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

{#if isWebglSupported()}
	<MapLibre
		bind:map
		center={[initialMapPosition.center.lng, initialMapPosition.center.lat]}
		zoom={initialMapPosition.zoom}
		class="h-screen overflow-hidden"
		style={getUserSettings().mapStyle.url}
		attributionControl={false}
		interactive={!isAnyModalOpen()}
		onmoveend={onMapMoveEnd}
		onload={onMapLoad}
		oncontextmenu={onContextMenu}
	>
		<GeometryLayer id={MapSourceId.S2_CELLS} data={getS2CellGeojson()} />
		<GeometryLayer id={MapSourceId.SELECTED_WEATHER} reactive={false} />
		<GeometryLayer id={MapSourceId.SCOUT_BIG_POINTS} data={getCurrentScoutData().bigPoints} />
		<GeometryLayer id={MapSourceId.SCOUT_SMALL_POINTS} data={getCurrentScoutData().smallPoints} />

		<GeoJSON
			id={MapSourceId.MAP_OBJECTS}
			data={{
				type: 'FeatureCollection',
				features: []
			}}
		>
			<SymbolLayer
				id="mapObjectsLayer"
				hoverCursor="pointer"
				layout={{
					"icon-image": ["get", "imageUrl"],
					"icon-overlap": "always",
					"icon-size":[
						"*",
						["get", "imageSize"],
						["get", "imageSelectedScale"],
						getUserSettings().mapIconSize
					],
					"icon-allow-overlap": true,
					"icon-offset": ["get", "imageOffset"]
				}}
				eventsIfTopMost={true}
				onclick={clickFeatureHandler}
			/>
		</GeoJSON>

		<MarkerCurrentLocation />
		<MarkerContextMenu />
	</MapLibre>
{:else}
	<div class="mx-auto w-fit">
		<Card class="m-4 p-4 w-fit">
			{#if isWebglSupported() === null}
				{m.webgl_disabled_error()}
			{:else}
				{m.webgl_unsupported_error()}
			{/if}
		</Card>
	</div>
{/if}