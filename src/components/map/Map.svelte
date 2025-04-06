<script lang="ts">
	import { isModalOpen } from '@/lib/modal.svelte.js';
	import {
		clickFeatureHandler,
		clickMapHandler, getCurrentSelectedData,
		getMapObjects, getMapObjectsSnapshot, openPopup,
		updateAllMapObjects, updateCurrentPath
	} from '@/lib/mapObjects/mapObjects.svelte.js';
	import { GeoJSON, Layer, type LayerClickInfo, MapLibre, Marker, SymbolLayer } from 'svelte-maplibre';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import maplibre, { GeoJSONSource } from 'maplibre-gl';
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import type { Feature, FeatureCollection } from 'geojson';
	import { getCurrentUiconSetDetails, getIconPokemon, getIconPokestop, getIconForMap } from '@/lib/uicons.svelte';
	import {getLoadedImages} from '@/lib/utils.svelte';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { setContextMenuEvent, setIsContextMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
	import { getDirectLinkCoordinates, setDirectLinkCoordinates } from '@/lib/directLinks.svelte';
	import type { UiconSet } from '@/lib/types/config';
	import { getMapFeatures } from '@/lib/mapSprites';
	import {
		AGGRESSIVE_UPDATE_TIME,
		UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM,
		UPDATE_MAP_OBJECT_INTERVAL_TIME
	} from '@/lib/constants';

	let {
		map = $bindable(),
	}: {
		map: maplibre.Map | undefined
	} = $props()

	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition))

	let mapObjectsGeoJson: FeatureCollection = $derived({
		type: "FeatureCollection",
		features: getMapFeatures(getMapObjects(), getCurrentSelectedData())
	})
	// TODO performance: when currentSelected is updated, only update what's needed and not the whole array

	const sessionImageUrls: string[] = []
	async function addMapImage(url: string) {
		// TODO come up with a system to update the icon scale evrytime the iconset changes
		if (!map) return
		if (sessionImageUrls.includes(url)) return
		sessionImageUrls.push(url)

		let imageData = getLoadedImages()[url]
		if (!imageData) {
			const image = await map.loadImage(url)
			imageData = image.data
			getLoadedImages()[url] = imageData
		}

		map.addImage(url, imageData)
	}

	async function loadMapObjects(removeOld: boolean = true) {
		if (map) await updateAllMapObjects(map, removeOld)
	}

	let loadMapObjectInterval: undefined | NodeJS.Timeout
	let isLoadMapObjectsRunning: boolean = false

	async function onMapMoveEnd() {
		if (loadMapObjectInterval !== undefined) clearInterval(loadMapObjectInterval)
		loadMapObjects().then()
		if (map) {
			resetUpdateMapObjectsInterval()

			getUserSettings().mapPosition.zoom = map.getZoom()
			getUserSettings().mapPosition.center = map.getCenter()
			updateUserSettings()
		}
	}

	async function runLoadMapObjects() {
		if (isLoadMapObjectsRunning) return
		try {
			isLoadMapObjectsRunning = true
			await loadMapObjects(false)
		} catch (e) {

		} finally {
			isLoadMapObjectsRunning = false
		}
	}

	$effect(() => {
		mapObjectsGeoJson
		untrack(() => {
			// @ts-ignore
			map?.getSource("mapObjects")?.setData(mapObjectsGeoJson)
			Promise.all(mapObjectsGeoJson.features.map(f => {
				return addMapImage(f.properties?.imageUrl)
			})).then()
		})
	})

	async function onMapLoad() {
		if (map) {
			map.on("touchstart", onTouchStart)
			map.on("touchend", clearPressTimer)
			map.on("touchmove", clearPressTimer)
			map.on("touchcancel", clearPressTimer)
			map.on("movestart", onMapMoveStart)

			// tick so feature handler registers first
			tick().then(() => map?.on("click", clickMapHandler))

			const data = getDirectLinkCoordinates()
			if (data && data.lat && data.lon) {
				getUserSettings().mapPosition.center.lat = data.lat
				getUserSettings().mapPosition.center.lng = data.lon
				getUserSettings().mapPosition.zoom = 18
				updateUserSettings()

				map.setCenter({lat: data.lat, lng: data.lon})
				map.setZoom(18)

				setDirectLinkCoordinates(undefined)
			}
		}

		await loadMapObjects(false)
		resetUpdateMapObjectsInterval()
	}

	let pressTimer: NodeJS.Timeout[] = [];
	const longPressDuration = 500;

	function onContextMenu(event: maplibre.MapTouchEvent | maplibre.MapMouseEvent) {
		setContextMenuEvent(event)
		setIsContextMenuOpen(true)
	}

	function clearPressTimer() {
		pressTimer.forEach(t => clearTimeout(t))
		pressTimer = []
	}

	function onTouchStart(e: maplibre.MapTouchEvent) {
		pressTimer.push(setTimeout(() => onContextMenu(e), longPressDuration));
	}

	async function onMapMoveStart() {
		clearPressTimer()
		clearUpdateMapObjectsInterval()

		setIsContextMenuOpen(false)
		if (getUserSettings().loadMapObjectsWhileMoving) {
			loadMapObjectInterval = setInterval(runLoadMapObjects, AGGRESSIVE_UPDATE_TIME)
		}
	}

	let updateMapObjectsInterval: undefined | NodeJS.Timeout = undefined

	function clearUpdateMapObjectsInterval() {
		if (updateMapObjectsInterval) clearInterval(updateMapObjectsInterval)
		updateMapObjectsInterval = undefined
	}

	function resetUpdateMapObjectsInterval() {
		if (!map) return
		if (map.getZoom() < UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM) return
		clearUpdateMapObjectsInterval()
		updateMapObjectsInterval = setInterval(() => updateAllMapObjects(map), UPDATE_MAP_OBJECT_INTERVAL_TIME)
	}

	function onWindowFocus() {
		if (!map) return
		updateAllMapObjects(map)
		resetUpdateMapObjectsInterval()
	}

	onMount(() => {
		updateCurrentPath()
	})

	onDestroy(() => {
		clearUpdateMapObjectsInterval()
		if (loadMapObjectInterval !== undefined) clearInterval(loadMapObjectInterval)
	})
</script>

<svelte:window
	onfocus={onWindowFocus}
	onblur={clearUpdateMapObjectsInterval}
></svelte:window>

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
	<GeoJSON
		id="mapObjects"
		data={mapObjectsGeoJson}
	>
		<SymbolLayer
			id="mapObjectsLayer"
			hoverCursor="pointer"
			layout={{
				"icon-image": ["get", "imageUrl"],
				"icon-overlap": "always",
				"icon-size": ["get", "imageSize"],
				"icon-allow-overlap": true,
				"icon-offset": ["get", "imageOffset"]
			}}
			eventsIfTopMost={true}
			onclick={clickFeatureHandler}
		/>
	</GeoJSON>

	<!--{#each Object.values(getMapObjects()) as pokemon (pokemon.id)}-->
	<!--	<Marker-->
	<!--		lngLat={[pokemon.lon, pokemon.lat]}-->
	<!--	>-->
	<!--		<button-->
	<!--			class="h-6 w-6 hover:scale-125 transition-transform cursor-pointer bg-cover"-->
	<!--			style="background-image: url({uicons}pokemon/{pokemon.pokemon_id}.png)"-->
	<!--			data-object-type={OBJ_TYPE_POKEMON}-->
	<!--			data-object-id="pokemon-{pokemon.id}"-->
	<!--			aria-label="Pokemon {pokemon.id}"-->
	<!--		></button>-->
	<!--	</Marker>-->
	<!--{/each}-->
</MapLibre>