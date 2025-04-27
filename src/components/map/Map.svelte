<script lang="ts">
	import { isModalOpen } from '@/lib/modal.svelte.js';
	import {
		getMapObjects
	} from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import { GeoJSON, MapLibre, SymbolLayer } from 'svelte-maplibre';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import maplibre from 'maplibre-gl';
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import type { FeatureCollection, Point } from 'geojson';
	import { getLoadedImages } from '@/lib/utils.svelte';
	import { setContextMenuEvent, setIsContextMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
	import { getDirectLinkCoordinates, setDirectLinkCoordinates } from '@/lib/directLinks.svelte';
	import { getFlattenedFeatures, type IconProperties, updateFeatures, updateSelected } from '@/lib/mapObjects/mapFeaturesGen.svelte.js';
	import {
		AGGRESSIVE_UPDATE_TIME,
		UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM,
		UPDATE_MAP_OBJECT_INTERVAL_TIME
	} from '@/lib/constants';
	import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { clickFeatureHandler, clickMapHandler, updateCurrentPath } from '@/lib/mapObjects/interact';
	import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
	import Card from '@/components/ui/Card.svelte';
	import * as m from "@/lib/paraglide/messages"

	let {
		map = $bindable(),
	}: {
		map: maplibre.Map | undefined
	} = $props()

	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition))

	// let mapObjectsGeoJson: FeatureCollection = $derived({ type: "FeatureCollection", features: getMapFeatures(getMapObjects()) })
	let mapObjectsGeoJson: FeatureCollection<Point, IconProperties> = $state({ type: "FeatureCollection", features: [] })
	// let mapObjectsGeoJson: FeatureCollection = $derived.by(() => {
	// 	console.log("geojson derive")
	// 	getCurrentSelectedData()
	// 	getMapObjects()
	// 	return { type: "FeatureCollection", features: getFlattenedFeatures() }
	// })
	$effect(() => {
		updateSelected(getCurrentSelectedData())
		mapObjectsGeoJson = { type: "FeatureCollection", features: getFlattenedFeatures() }
	})
	$effect(() => {
		updateFeatures(getMapObjects())
		mapObjectsGeoJson = { type: "FeatureCollection", features: getFlattenedFeatures() }
	})

	const sessionImageUrls: string[] = []
	async function addMapImage(url: string) {
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

	function isWebglSupported() {
		if (window.WebGLRenderingContext) {
			const canvas = document.createElement('canvas');
			try {
				const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
				if (context && typeof context.getParameter == 'function') {
					return true;
				}
			} catch (e) {
			}
			return null;
		}
		return false;
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
				"icon-size": ["*", ["get", "imageSize"],  ["get", "imageSelectedScale"]],
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