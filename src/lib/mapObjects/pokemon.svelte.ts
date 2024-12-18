import { addMapObject, delMapObject, getMapObjects } from '@/lib/mapObjects/mapObjects.svelte.js';
import type {LngLatBounds} from 'maplibre-gl';

export async function updatePokemon(bounds: LngLatBounds) {
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