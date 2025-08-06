<script lang="ts">
	import { isModalOpen } from '@/lib/modal.svelte.js';
	import { GeoJSON, MapLibre, Marker, SymbolLayer } from 'svelte-maplibre';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import { onDestroy, onMount, tick } from 'svelte';
	import { getDirectLinkCoordinates, setDirectLinkCoordinates } from '@/lib/directLinks.svelte';
	import { clickFeatureHandler, clickMapHandler, updateCurrentPath } from '@/lib/mapObjects/interact';
	import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
	import Card from '@/components/ui/basic/Card.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { isWebglSupported } from '@/lib/map/utils';
	import { clearUpdateMapObjectsInterval, resetUpdateMapObjectsInterval } from '@/lib/map/mapObjectsInterval';
	import { getMap, setMap } from '@/lib/map/map.svelte';
	import { clearPressTimer, onContextMenu } from '@/lib/map/contextmenu.svelte';
	import { clearSessionImageUrls, getMapObjectsGeoJson } from '@/lib/map/featuresManage.svelte';
	import { loadMapObjectInterval } from '@/lib/map/loadMapObjects';
	import { onMapMove, onMapMoveEnd, onMapMoveStart, onTouchStart, onWindowFocus } from '@/lib/map/events';
	import maplibre from 'maplibre-gl';
	import FrameRateControl from '@/lib/map/framerate';
	import { getS2CellGeojson } from '@/lib/mapObjects/s2cells.svelte.js';
	import S2CellLayer from '@/components/map/S2CellLayer.svelte';
	import { getSelectedWeatherS2Cells } from '@/lib/mapObjects/weather.svelte';
	import DebugMenu from '@/components/map/DebugMenu.svelte';
	import { getAnimateLocationMarker, getCurrentLocation } from '@/lib/map/geolocate.svelte';
	import { hasLoadedFeature, LoadedFeature } from '@/lib/initialLoad.svelte';

	let map: maplibre.Map | undefined = $state(undefined);
	let debugRerender: boolean = $state(true);
	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition));

	async function onMapLoad() {
		if (map) {
			setMap(map);
			if (getUserSettings().showDebugMenu) {
				map.addControl(new FrameRateControl({}));
				map.on('moveend', () => {
					debugRerender = false;
					tick().then(() => debugRerender = true);
				});
			}

			map.on('touchstart', onTouchStart);
			map.on('touchend', clearPressTimer);
			map.on('touchmove', clearPressTimer);
			map.on('touchcancel', clearPressTimer);
			map.on('movestart', onMapMoveStart);
			map.on('move', onMapMove);

			// tick so feature handler registers first
			tick().then(() => map?.on('click', clickMapHandler));

			const data = getDirectLinkCoordinates();
			if (data && data.lat && data.lon) {
				getUserSettings().mapPosition.center.lat = data.lat;
				getUserSettings().mapPosition.center.lng = data.lon;
				getUserSettings().mapPosition.zoom = 18;
				updateUserSettings();

				map.setCenter({ lat: data.lat, lng: data.lon });
				map.setZoom(18);

				setDirectLinkCoordinates(undefined);
			}
		}
	}

	// update initial map objects only once every required part has been loaded
	let isInitUpdatedMapObjects = false;
	$effect(() => {
		if (
			!isInitUpdatedMapObjects &&
			getMap()
			&& hasLoadedFeature(LoadedFeature.REMOTE_LOCALE, LoadedFeature.MASTER_FILE, LoadedFeature.ICON_SETS)
		) {
			isInitUpdatedMapObjects = true;
			updateAllMapObjects(false).then(() => resetUpdateMapObjectsInterval()).catch(e => console.error(e));
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

{#if getUserSettings().showDebugMenu}
	<DebugMenu rerender={debugRerender} />
{/if}

{#if isWebglSupported()}
	<MapLibre
		bind:map
		center={[initialMapPosition.center.lng, initialMapPosition.center.lat]}
		zoom={initialMapPosition.zoom}
		class="h-screen overflow-hidden"
		style={getUserSettings().mapStyle.url}
		attributionControl={false}
		interactive={!isModalOpen()}
		onmoveend={onMapMoveEnd}
		onload={onMapLoad}
		oncontextmenu={onContextMenu}
	>
		<S2CellLayer id="s2cells" data={getS2CellGeojson()} />
		<S2CellLayer id="selectedWeatherLayer" data={getSelectedWeatherS2Cells()} />

		<GeoJSON
			id="mapObjects"
			data={getMapObjectsGeoJson()}
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

		{#if getCurrentLocation()}
			<Marker lngLat={getCurrentLocation()}>
				<div class="relative w-4 h-4 rounded-full bg-sky-500 outline-white outline-4">
					{#if getAnimateLocationMarker()}
						<div
							class="absolute left-1/2 top-1/2 -translate-1/2 bg-sky-500/75 w-5 h-5 rounded-full duration-1500 animate-ping"
						></div>
					{/if}
				</div>
			</Marker>
		{/if}
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