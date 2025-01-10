import { getConfig } from '@/lib/config';
import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

type UiconSet = {
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
	uiconSet: {[key in MapObjectType]: UiconSet}
	isLeftHanded: boolean,
	isDarkMode: boolean | null,
	loadMapObjectsWhileMoving: boolean
	loadMapObjectsPadding: number,
	languageTag: string | "auto",
}

export function getDefaultUserSettings() {
	const defaultIconSet = {
		id: getConfig().uiconSets[0].id,
		url: getConfig().uiconSets[0].url,
	}

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
			pokemon: defaultIconSet,
			pokestop: defaultIconSet,
			gym: defaultIconSet,
			station: defaultIconSet
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
