import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
import type { MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';
import type { LayerClickInfo } from 'svelte-maplibre';
import type {Feature} from "geojson"

export const OBJ_TYPE_POKEMON = "pokemon"
export const OBJ_TYPE_POKESTOP = "pokestop"

type MapData = PokemonData | PokestopData
type ObjectType = "pokemon" | "pokestop"

let currentSelectedObjType: ObjectType | null = $state(null)
let currentSelectedData: MapData | null = $state(null)
let mapObjectsState: {
	[key: string]: MapData
} = $state({})

// temp
mapObjectsState["pokestop-0"] = {id: "0", name: "Pokestop Name", lat: 0, lon: 0}


export function getCurrentSelectedObjType() {
	return currentSelectedObjType
}

export function getCurrentSelectedData() {
	return currentSelectedData
}

export function closePopup() {
	currentSelectedData = null
	currentSelectedObjType = null
}

export function getCurrentPath() {
	if (!currentSelectedData) {
		return "/"
	}
	return `/${currentSelectedObjType}/${currentSelectedData.id}`
}

export function clickMapHandler(event: MapMouseEvent) {
	// @ts-ignore
	if (event.originalEvent.target?.dataset.objectType) {
		// @ts-ignore
		currentSelectedData = mapObjectsState[event.originalEvent.target.dataset.objectId]
		// @ts-ignore
		currentSelectedObjType = event.originalEvent.target.dataset.objectType

		history.replaceState(null, "", getCurrentPath());
	} else {
		closePopup()
		history.replaceState(null, "", "/")
	}
}

export function clickFeatureHandler(event: LayerClickInfo<Feature>) {
	console.log(event)
	if (event.features) {
		const props = event.features[0].properties
		currentSelectedData = mapObjectsState[props.id]
		currentSelectedObjType = props.type
		history.replaceState(null, "", getCurrentPath());
	}
}

export function getMapObjects() {
	return mapObjectsState
}

export function addMapObject(key: string, data: MapData) {
	mapObjectsState[key] = data
}

export function delMapObject(key: string) {
	delete mapObjectsState[key]
}