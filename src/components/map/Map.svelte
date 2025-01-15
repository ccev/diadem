<script lang="ts">
	import { isModalOpen } from '@/lib/modal.svelte.js';
	import {
		clickFeatureHandler,
		clickMapHandler,
		getMapObjects,
		updateAllMapObjects, updateCurrentPath
	} from '@/lib/mapObjects/mapObjects.svelte.js';
	import { GeoJSON, Layer, MapLibre, Marker, SymbolLayer } from 'svelte-maplibre';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import maplibre, { GeoJSONSource } from 'maplibre-gl';
	import { onMount, tick, untrack } from 'svelte';
	import type { FeatureCollection } from 'geojson';
	import { getCurrentUiconSetDetails, getIconPokemon, getIconPokestop, getIcon } from '@/lib/uicons.svelte';
	import {getLoadedImages} from '@/lib/utils.svelte';
	import ContextMenu from '@/components/ui/contextmenu/ContextMenu.svelte';
	import { setContextMenuEvent, setIsContextMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
	import { getDirectLinkCoordinates, setDirectLinkCoordinates } from '@/lib/directLinks.svelte';
	import type { UiconSet } from '@/lib/types/config';

	let {
		map = $bindable(),
	}: {
		map: maplibre.Map | undefined
	} = $props()

	const initialMapPosition = JSON.parse(JSON.stringify(getUserSettings().mapPosition))

	let mapObjectsGeoJson: FeatureCollection = $derived({
		type: "FeatureCollection",
		features: Object.values(getMapObjects()).map(obj => {
			const userIconSet = getCurrentUiconSetDetails(obj.type)
			let scale: number = 0.25
			let offsetY: number = 0
			let offsetX: number = 0

			if (userIconSet) {
				const modifier = userIconSet[obj.type]
				const baseModifier = userIconSet.base
				if (modifier && typeof modifier === "object") {
					scale = modifier?.scale ?? baseModifier?.scale ?? scale
					offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY
					offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX
				}
			}

			return {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [obj.lon, obj.lat]
				},
				properties: {
					imageUrl: getIcon(obj),
					id: obj.mapId,
					type: obj.type,
					imageSize: scale,
					// imageOffset: [offsetX, offsetY]
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
		clearTimeout(pressTimer);
		setIsContextMenuOpen(false)
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
		if (map) {
			map.on("touchstart", onTouchStart)
			map.on("touchend", onTouchEnd)
			map.on("touchmove", onTouchMove)

			// tick so feature handler registers first
			tick().then(() => map.on("click", clickMapHandler))

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
	}

	let pressTimer: undefined | NodeJS.Timeout;
	const longPressDuration = 500;

	function onContextMenu(event: maplibre.MapTouchEvent | maplibre.MapMouseEvent) {
		setContextMenuEvent(event)
		setIsContextMenuOpen(true)
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

	onMount(() => {
		updateCurrentPath()
	})
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
				"icon-size": ["get", "imageSize"],
				"icon-allow-overlap": true,
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