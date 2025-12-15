import { getConfig } from "@/lib/services/config/config";
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import type {
	FilterGym,
	FilterPokemon,
	FilterPokestop,
	FilterS2Cell,
	FilterStation
} from "@/lib/features/filters/filters";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
import { browser } from "$app/environment";
import { getDefaultMapStyle } from "@/lib/services/themeMode";

type UiconSetUS = {
	id: string;
	url: string;
};

export type UserSettings = {
	mapPosition: {
		center: {
			lat: number;
			lng: number;
		};
		zoom: number;
	};
	mapStyle: {
		id: string;
		url: string;
	};
	uiconSet: { [key in MapObjectType]: UiconSetUS };
	isLeftHanded: boolean;
	themeMode: "dark" | "light" | "system";
	loadMapObjectsWhileMoving: boolean;
	loadMapObjectsPadding: number;
	showDebugMenu: boolean;
	mapIconSize: number;
	filters: {
		pokemon: FilterPokemon;
		pokestopMajor: FilterPokestop;
		gymMajor: FilterGym;
		stationMajor: FilterStation;
		s2cell: FilterS2Cell;
	};
};

export function getDefaultUserSettings(): UserSettings {
	const defaultMapStyle = getDefaultMapStyle()

	return {
		mapPosition: {
			center: {
				lat: 53.86762990550971,
				lng: 10.687758976519007
			},
			zoom: 15
		},
		mapStyle: {
			id: defaultMapStyle.id,
			url: defaultMapStyle.url
		},
		uiconSet: {
			pokemon: getDefaultIconSet("pokemon"),
			pokestop: getDefaultIconSet("pokestop"),
			gym: getDefaultIconSet("gym"),
			station: getDefaultIconSet("station")
		},
		isLeftHanded: false,
		themeMode: "system",
		loadMapObjectsWhileMoving: false,
		loadMapObjectsPadding: 20,
		showDebugMenu: false,
		mapIconSize: 1,
		filters: {
			pokemon: { category: "pokemon", ...defaultFilter() },
			pokestopMajor: {
				category: "pokestopMajor",
				...defaultFilter(),
				pokestopPlain: { category: "pokestopPlain", ...defaultFilter() },
				quest: { category: "quest", ...defaultFilter() },
				invasion: { category: "invasion", ...defaultFilter() },
				contest: { category: "contest", ...defaultFilter() },
				kecleon: { category: "kecleon", ...defaultFilter() },
				goldPokestop: { category: "goldPokestop", ...defaultFilter() },
				lure: { category: "lure", ...defaultFilter() },
				route: { category: "route", ...defaultFilter() }
			},
			gymMajor: {
				category: "gymMajor",
				...defaultFilter(),
				gymPlain: { category: "gymPlain", ...defaultFilter() },
				raid: { category: "raid", ...defaultFilter() }
			},
			stationMajor: {
				category: "stationMajor",
				...defaultFilter(),
				stationPlain: { category: "stationPlain", ...defaultFilter() },
				maxBattle: { category: "maxBattle", ...defaultFilter() }
			},
			s2cell: { category: "s2cell", ...defaultFilter() }
		}
	};
}

function defaultFilter() {
	return {
		enabled: true,
		filters: []
	};
}

export function getDefaultIconSet(type: MapObjectType) {
	let iconSet = getConfig().uiconSets.find((s) => s[type]?.default);

	if (!iconSet) {
		iconSet = getConfig().uiconSets.find((s) => s.base?.default);
	}
	if (!iconSet) {
		iconSet = getConfig().uiconSets[0];
	}

	return {
		id: iconSet.id,
		url: iconSet.url
	};
}

// @ts-ignore
let userSettings: UserSettings = $state({});

export async function getUserSettingsFromServer() {
	const response = await fetch("/api/user/settings");
	const dbUserSettings: { error?: string; result: UserSettings } = await response.json();

	// User has existing user settings, merge with defaults, then update
	if (!dbUserSettings.error && Object.keys(dbUserSettings.result).length > 0) {
		// TODO: only overwrite map position if current position is default
		setUserSettings(dbUserSettings.result);
		updateUserSettings();
	}
}

export function setUserSettings(newUserSettings: UserSettings) {
	// @ts-ignore
	userSettings = deepMerge(getDefaultUserSettings(), newUserSettings);
}

export function getUserSettings() {
	return userSettings;
}

export function updateUserSettings() {
	const serializedUserSettings = JSON.stringify(userSettings);

	if (browser && window.localStorage) {
		localStorage.setItem("userSettings", serializedUserSettings);
	}

	if (getUserDetails().details) {
		fetch("/api/user/settings", { method: "POST", body: serializedUserSettings }).then();
	}
}

function deepMerge(defaultObj: { [key: string]: any }, newObj: { [key: string]: any }) {
	const result = { ...defaultObj };
	for (const key in newObj) {
		if (newObj[key] instanceof Object && !(newObj[key] instanceof Array) && key in defaultObj) {
			result[key] = deepMerge(defaultObj[key], newObj[key]);
		} else {
			result[key] = newObj[key];
		}
	}
	return result;
}
