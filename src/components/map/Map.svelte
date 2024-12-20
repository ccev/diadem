<script lang="ts">
	import { isModalOpen } from '@/lib/modal.svelte.js';
	import {
		clickFeatureHandler,
		clickMapHandler,
		getMapObjects,
		updateAllMapObjects
	} from '@/lib/mapObjects/mapObjects.svelte.js';
	import { GeoJSON, Layer, MapLibre, Marker, SymbolLayer } from 'svelte-maplibre';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import maplibre, { GeoJSONSource } from 'maplibre-gl';
	import { tick, untrack } from 'svelte';
	import type { FeatureCollection } from 'geojson';
	import { getCurrentUiconSetDetails, getIconPokemon, getIconPokestop, getIcon } from '@/lib/uicons.svelte';
	import {getLoadedImages} from '@/lib/utils.svelte';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';

	let {
		map = $bindable()
	}: {
		map: maplibre.Map | undefined
	} = $props()

	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition))

	let mapObjectsGeoJson: FeatureCollection = $derived({
		type: "FeatureCollection",
		features: Object.values(getMapObjects()).map(obj => {
			return {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [obj.lon, obj.lat]
				},
				properties: {
					imageUrl: getIcon(obj),
					id: obj.mapId,
					type: obj.type
				},
				id: obj.mapId
			}
		})
	})

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

	async function onMapMoveStart() {
		if (getUserSettings().loadMapObjectsWhileMoving) {
			loadMapObjectInterval = setInterval(runLoadMapObjects, 200)
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
		await loadMapObjects()

		await tick()
		if (!map) return
		map.on("click", clickMapHandler)
		map.on("touchstart", onTouchStart)
		map.on("touchend", onTouchEnd)
		map.on("touchmove", onTouchMove)
	}

	let pressTimer: undefined | NodeJS.Timeout;
	const longPressDuration = 500;
	let div: HTMLDivElement
	let isContextMenuOpen: boolean = $state(false)
	let contextMenuPos: {x: number, y: number} = $state({x: 0, y: 0})

	function onContextMenu(event: maplibre.MapTouchEvent | maplibre.MapMouseEvent) {
		isContextMenuOpen = true
		contextMenuPos = event.point
	}

	function onTouchStart(e: maplibre.MapTouchEvent) {
		pressTimer = setTimeout(() => onContextMenu(e), longPressDuration);
	}

	function onTouchEnd() {
		clearTimeout(pressTimer);
	}

	function onTouchMove() {
		clearTimeout(pressTimer);
	}
</script>

<MapLibre
	bind:map
	center={[initialMapPosition.center.lng, initialMapPosition.center.lat]}
	zoom={initialMapPosition.zoom}
	class="h-screen overflow-hidden"
	style={getUserSettings().mapStyle.url}
	attributionControl={false}
	interactive={!isModalOpen()}
	onmoveend={onMapMoveEnd}
	onmovestart={onMapMoveStart}
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
				"icon-size": getCurrentUiconSetDetails("pokemon")?.scale ?? 0.25,
				"icon-allow-overlap": true
			}}
			eventsIfTopMost={true}
			onclick={clickFeatureHandler}
		/>
	</GeoJSON>

	<Marker
		lngLat={[10.683876260911497, 53.86879553625915]}
	>
		<button
			class="h-6 w-6 cursor-pointer bg-cover"
			style="background-image: url({getIconPokestop({})}/)"
			data-object-type="pokestop"
			data-object-id="pokestop-0"
			aria-label="Pokestop"
		></button>
	</Marker>

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