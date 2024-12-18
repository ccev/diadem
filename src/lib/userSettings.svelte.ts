import { getConfig } from '@/lib/config';
import { untrack } from 'svelte';

// TODO client-side config

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
	uiconSet: {
		id: string
		url: string
	}
	isLeftHanded: boolean,
	isDarkMode: boolean | null
}

const defaultUserSettings = {
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
		id: getConfig().uiconSets[0].id,
		url: getConfig().uiconSets[0].url,
	},
	isLeftHanded: false,
	isDarkMode: false
}

let userSettings: UserSettings = $state(defaultUserSettings)

export function setUserSettings(newUserSettings: UserSettings) {
	userSettings =  deepMerge(defaultUserSettings, newUserSettings)
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
