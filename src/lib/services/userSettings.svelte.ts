import { getConfig } from "@/lib/services/config/config";
import type {
	FilterGym,
	FilterNest,
	FilterPokemon,
	FilterPokestop,
	FilterRoute,
	FilterS2Cell,
	FilterSpawnpoint,
	FilterStation,
	FilterTappable
} from "@/lib/features/filters/filters";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
import { browser } from "$app/environment";
import { getDefaultMapStyle } from "@/lib/services/themeMode";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { AnySearchEntry } from "@/lib/services/search.svelte";

export type UiconSetUS = {
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
	uiconSet: {
		pokemon: UiconSetUS;
		pokestop: UiconSetUS;
		gym: UiconSetUS;
		station: UiconSetUS;
		tappable: UiconSetUS;
	};
	isLeftHanded: boolean;
	themeMode: "dark" | "light" | "system";
	loadMapObjectsWhileMoving: boolean;
	loadMapObjectsPadding: number;
	showDebugMenu: boolean;
	mapIconSize: number;
	searchRange: number;
	filters: {
		pokemon: FilterPokemon;
		pokestop: FilterPokestop;
		gym: FilterGym;
		station: FilterStation;
		s2cell: FilterS2Cell;
		nest: FilterNest;
		spawnpoint: FilterSpawnpoint;
		route: FilterRoute;
		tappable: FilterTappable;
	};
	recentSearches: AnySearchEntry[];
};

export function getDefaultUserSettings(): UserSettings {
	const general = getConfig().general;
	const defaultMapStyle = getDefaultMapStyle();

	return {
		mapPosition: {
			center: {
				lat: general.defaultLat ?? 51.516855,
				lng: general.defaultLon ?? -0.0805
			},
			zoom: general.defaultZoom ?? 15
		},
		mapStyle: {
			id: defaultMapStyle.id,
			url: defaultMapStyle.url
		},
		uiconSet: {
			pokemon: getDefaultIconSet(MapObjectType.POKEMON),
			pokestop: getDefaultIconSet(MapObjectType.POKESTOP),
			gym: getDefaultIconSet(MapObjectType.GYM),
			station: getDefaultIconSet(MapObjectType.STATION),
			tappable: getDefaultIconSet(MapObjectType.TAPPABLE)
		},
		isLeftHanded: false,
		themeMode: "system",
		loadMapObjectsWhileMoving: false,
		loadMapObjectsPadding: 20,
		showDebugMenu: false,
		mapIconSize: 1,
		searchRange: 20_000,
		filters: {
			pokemon: { category: "pokemon", ...defaultFilter() },
			pokestop: {
				category: "pokestop",
				...defaultFilter(),
				pokestopPlain: { category: "pokestopPlain", ...defaultFilter() },
				quest: { category: "quest", ...defaultFilter() },
				invasion: { category: "invasion", ...defaultFilter() },
				contest: { category: "contest", ...defaultFilter() },
				kecleon: { category: "kecleon", ...defaultFilter() },
				goldPokestop: { category: "goldPokestop", ...defaultFilter() },
				lure: { category: "lure", ...defaultFilter() }
			},
			gym: {
				category: "gym",
				...defaultFilter(true),
				gymPlain: { category: "gymPlain", ...defaultFilter(true) },
				raid: { category: "raid", ...defaultFilter(true) }
			},
			station: {
				category: "station",
				...defaultFilter(),
				stationPlain: { category: "stationPlain", ...defaultFilter() },
				maxBattle: { category: "maxBattle", ...defaultFilter() }
			},
			// s2cell: { category: "s2cell", ...defaultFilter() },
			s2cell: {
				category: "s2cell",
				enabled: false,
				filters: [
					{
						level: 14,
						id: "s2celldefault",
						title: { message: "s2_cells" },
						enabled: true,
						icon: { isUserSelected: false }
					}
				]
			},
			nest: { category: "nest", ...defaultFilter() },
			spawnpoint: { category: "spawnpoint", ...defaultFilter() },
			route: { category: "route", ...defaultFilter() },
			tappable: { category: "tappable", ...defaultFilter() }
		},
		recentSearches: []
	};
}

function defaultFilter(enabled: boolean = false) {
	return {
		enabled,
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
