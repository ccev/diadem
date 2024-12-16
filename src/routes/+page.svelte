<script lang="ts">
	import { GeoJSON, GeolocateControl, MapLibre, Marker, SymbolLayer } from 'svelte-maplibre';
	import { fade, slide } from 'svelte/transition';
	import PokemonPopup from '@/components/ui/popups/PokemonPopup.svelte';
	import PokestopPopup from '@/components/ui/popups/PokestopPopup.svelte';
	import {
		addMapObject, clickFeatureHandler,
		clickMapHandler,
		delMapObject,
		getCurrentSelectedData,
		getCurrentSelectedObjType,
		getMapObjects,
		OBJ_TYPE_POKEMON,
		OBJ_TYPE_POKESTOP
	} from '@/components/ui/popups/mapObjects.svelte';
	import SearchFab from '@/components/ui/fab/SearchFab.svelte';
	import LocateFab from '@/components/ui/fab/LocateFab.svelte';
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { closeModal, isModalOpen } from '@/lib/modal.svelte';
	import Card from '@/components/ui/Card.svelte';
	import {getUserSettings} from '@/lib/userSettings.svelte';
	import maplibre from 'maplibre-gl';

	const style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
	let map: maplibregl.Map | undefined = $state()

	const uicons = "https://raw.githubusercontent.com/whitewillem/PogoAssets/refs/heads/main/uicons-outline/"

	let mapObjectsGeoJson: maplibre.GeoJSONSource["_data"] = {
		 type: "FeatureCollection",
		 features: []
	 }

	async function updatePokemon() {
		const bounds = map?.getBounds()
		if (!bounds) return

		const body = {
			minLat: bounds.getSouth(),
			minLon: bounds.getWest(),
			maxLat: bounds.getNorth(),
			maxLon: bounds.getEast()
		}
		fetch("/pokemon", { method: "POST",  body: JSON.stringify(body)})
			.then(r => {
				r.json()
					.then(pokemonList => {
						for (const key in getMapObjects()) {
							if (key.startsWith("pokemon-")) {
								delMapObject(key)
							}
						}
						for (const pokemon of pokemonList) {
							addMapObject("pokemon-" + pokemon.id, pokemon)
						}
					})
			})
	}

	let inputElement: HTMLInputElement | undefined = $state()
	$effect(() => {
		isModalOpen
		inputElement?.focus()
	})

	let loadedImages: string[] = []

	async function addMapImage(id: string, url: string) {
		if (!map) return
		if (loadedImages.includes(id)) return
		loadedImages.push(id)

		const image = await map.loadImage(url)
		map.addImage(id, image.data)
	}

	async function onMapLoad(map: maplibre.Map) {
		map.addSource("mapObjects", {
			type: "geojson",
			data: mapObjectsGeoJson
		})
		await updatePokemon()
	}

	$effect(() => {
		getMapObjects

		mapObjectsGeoJson.features = Object.values(getMapObjects()).map(obj => {
			return {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [obj.lon, obj.lat]
				},
				properties: {
					image: obj?.pokemon_id ?? "0",
					id: "pokemon-" + obj.id,
					type: "pokemon"
					// image: "cat",
				},
				id: "pokemon-" + obj.id
			}
		})

		// addMapImage("cat", "https://upload.wikimedia.org/wikipedia/commons/7/7c/201408_cat.png").then(() => {
		// 	map?.getSource("mapObjects")?.setData(mapObjectsGeoJson)
		// })

		// addMapImage(mapObjectsGeoJson.features[1].properties.pokemon_id, mapObjectsGeoJson.features[1].properties.image)
		// 	.then(map?.getSource("mapObjects")?.setData(mapObjectsGeoJson))

		Promise.all(mapObjectsGeoJson.features.map(f => {
			return addMapImage(f.properties?.image, uicons + "pokemon/" + f.properties?.image + ".png")
		})).then(() => {
			map?.getSource("mapObjects")?.setData(mapObjectsGeoJson)
		})

		// try {
		// 	map?.loadImage('https://upload.wikimedia.org/wikipedia/commons/7/7c/201408_cat.png').then(im => {
		// 		if (!map?.hasImage("cat")) map?.addImage("cat", im.data)
		// 	})
		//
		//
		//
		// 	 if (!map?.getSource("mapObjects")) {
		// 		 map?.addSource("mapObjects", {
		// 			 type: "geojson",
		// 			 data: {
		// 				 type: "FeatureCollection",
		// 				 features: [
		// 					 {
		// 						 type: "Feature",
		// 						 geometry: {
		// 							 type: "Point",
		// 							 coordinates: [10.684622, 53.870822]
		// 						 },
		// 						 properties: {
		// 							 image: "test",
		// 						 }
		// 					 }
		// 				 ]
		// 			 }
		// 		 })
		// 	 }
		//
		// 	map?.getSource("mapObjects")?.setData({
		// 		type: "FeatureCollection",
		// 		features
		// 	})
		// 	console.log(map?.getSource("mapObjects"))
		// } catch (e) {
		// 	console.error(e)
		// }
	})

</script>

{#if isModalOpen()}
	<div
		transition:slide={{duration: 50}}
		class="absolute z-30 top-2 w-full"
	>
		<Card class="mx-2">
			<input
				bind:this={inputElement}
				class="h-8 w-full ring-1" role="text"
			>
		</Card>
	</div>
	<button
		transition:fade={{duration: 50}}
		class="absolute z-20 top-0 h-full w-full backdrop-blur-[1px] backdrop-brightness-95"
		onclick={() => closeModal()}
		aria-label="Close Modal"
	></button>
{/if}

<div
	class="absolute z-10 bottom-2 w-full flex flex-col pointer-events-none"
	class:items-end={!getUserSettings().isLeftHanded}
>
	<div
		class="mx-2 space-y-1.5 mb-2"
	>
		<SearchFab />
		<LocateFab {map} />

	</div>


	{#if getCurrentSelectedObjType()}
		<div
			class="w-full max-w-[32rem] mb-2 z-10"
			style="pointer-events: all"
			transition:slide={{duration: 50}}
		>
			{#if getCurrentSelectedObjType() === OBJ_TYPE_POKEMON}
				<PokemonPopup data={getCurrentSelectedData()} />
			{:else if getCurrentSelectedObjType() === OBJ_TYPE_POKESTOP}
				<PokestopPopup data={getCurrentSelectedData()} />
			{/if}
		</div>
	{/if}

	<BottomNav page="/" />
</div>

<MapLibre
	bind:map
	center={[10.686771743624869, 53.867700846809676]}
	zoom={15}
	class="h-screen overflow-hidden"
	style={style}
	onclick={clickMapHandler}
	attributionControl={false}
	onmoveend={() => updatePokemon()}
	onload={onMapLoad}
>
	<SymbolLayer
		id="mapObjects"
		source="mapObjects"
		hoverCursor="pointer"
		layout={{
			'icon-image': ["get", "image"],
			'icon-size': 0.25,
			"icon-overlap": "always",
			"icon-allow-overlap": true
		}}
		onclick={clickFeatureHandler}
	/>

	<Marker
		lngLat={[10.683876260911497, 53.86879553625915]}
	>
		<button
			class="h-6 w-6 cursor-pointer bg-cover"
			style="background-image: url({uicons}/pokestop/0.png)"
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


