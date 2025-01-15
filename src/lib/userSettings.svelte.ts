import { getConfig } from '@/lib/config';
import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

type UiconSetUS = {
	id: string
	url: string
}

type UserSettings = {
	mapPosition: {
		center: {
			lat: number
			lng: number
		}
		zoom: number
	}
	mapStyle: {
		id: string
		url: string
	}
	uiconSet: {[key in MapObjectType]: UiconSetUS}
	isLeftHanded: boolean,
	isDarkMode: boolean | null,
	loadMapObjectsWhileMoving: boolean
	loadMapObjectsPadding: number,
	languageTag: string | "auto",
}

export function getDefaultIconSet(type: MapObjectType) {
	let iconSet = getConfig().uiconSets.find(s => s[type]?.default)

	if (!iconSet) {
		iconSet = getConfig().uiconSets.find(s => s.base?.default)
	}
	if (!iconSet) {
		iconSet = getConfig().uiconSets[0]
	}

	return {
		id: iconSet.id,
		url: iconSet.url
	}
}

export function getDefaultUserSettings() {
	return {
		mapPosition: {
			center: {
				lat: 53.86762990550971,
				lng: 10.687758976519007,
			},
			zoom: 15
		},
		mapStyle: {
			id: getConfig().mapStyles[0].id,
			url: getConfig().mapStyles[0].url,
		},
		uiconSet: {
			pokemon: getDefaultIconSet("pokemon"),
			pokestop: getDefaultIconSet("pokestop"),
			gym: getDefaultIconSet("gym"),
			station: getDefaultIconSet("station")
		},
		isLeftHanded: false,
		isDarkMode: false,
		loadMapObjectsWhileMoving: false,
		loadMapObjectsPadding: 20,
		languageTag: "auto"
	}
}

// @ts-ignore
let userSettings: UserSettings = $state({})

export function setUserSettings(newUserSettings: UserSettings) {
	// @ts-ignore
	userSettings = deepMerge(getDefaultUserSettings(), newUserSettings)
	console.log(userSettings)
}

export function getUserSettings() {
	return userSettings
}

export function updateUserSettings() {
	localStorage.setItem("userSettings", JSON.stringify(userSettings))
}

function deepMerge(defaultObj: {[key: string]: any}, newObj: {[key: string]: any}) {
	const result = { ...defaultObj };
	for (const key in newObj) {
		if (newObj[key] instanceof Object && key in defaultObj) {
			result[key] = deepMerge(defaultObj[key], newObj[key]);
		} else {
			result[key] = newObj[key]
		}
	}
	return result;
}
