<script lang="ts">
	import { isModalOpen } from '@/lib/modal.svelte.js';
	import {
		clickFeatureHandler,
		clickMapHandler,
		getMapObjects,
		updateAllMapObjects
	} from '@/lib/mapObjects/mapObjects.svelte.js';
	import { GeoJSON, MapLibre, Marker, SymbolLayer } from 'svelte-maplibre';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import maplibre from 'maplibre-gl';
	import { tick, untrack } from 'svelte';
	import type { FeatureCollection } from 'geojson';
	import { getIconPokemon, getIconPokestop } from '@/lib/uicons.svelte';

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
					imageUrl: getIconPokemon(obj),
					id: "pokemon-" + obj.id,
					type: "pokemon"
					// image: "cat",
				},
				id: "pokemon-" + obj.id
			}
		})
	})

	let loadedImages: string[] = []

	async function addMapImage(id: string, url: string) {
		if (!map) return
		if (loadedImages.includes(id)) return
		loadedImages.push(id)

		const image = await map.loadImage(url)
		map.addImage(id, image.data)
	}

	async function loadMapObjects() {
		if (!map) return
		await updateAllMapObjects(map.getBounds())
	}

	async function onMapMoveEnd() {
		loadMapObjects().then()
		if (map) {
			getUserSettings().mapPosition.zoom = map.getZoom()
			getUserSettings().mapPosition.center = map.getCenter()
			updateUserSettings()
		}
	}

	$effect(() => {
		mapObjectsGeoJson
		untrack(() => {
			Promise.all(mapObjectsGeoJson.features.map(f => {
				return addMapImage(f.properties?.imageUrl, f.properties?.imageUrl)
			})).then(() => {
				map?.getSource("mapObjects")?.setData(mapObjectsGeoJson)
			})
		})
	})

	async function onMapLoad() {
		await loadMapObjects()

		// register this handler after layer handlers, so it can be prevented
		await tick()
		map.on("click", clickMapHandler)
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
	onload={onMapLoad}
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
			"icon-size": 0.25,
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
			style="background-image: url({getIconPokestop()}/)"
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