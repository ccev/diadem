import { getConfig } from "@/lib/config/config";
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import type {
	FilterCategory,
	FilterContest,
	FilterGymMajor,
	FilterGymPlain,
	FilterInvasion,
	FilterLure,
	FilterPokemon,
	FilterPokestopMajor,
	FilterPokestopPlain,
	FilterQuest,
	FilterRaid,
	FilterS2Cell,
	FilterStationMajor
} from "@/lib/filters/filters";
import { getUserDetails } from "@/lib/user/userDetails.svelte";

type UiconSetUS = {
	id: string;
	url: string;
};

type UserSettings = {
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
	isDarkMode: boolean | null;
	loadMapObjectsWhileMoving: boolean;
	loadMapObjectsPadding: number;
	showDebugMenu: boolean;
	languageTag: string | "auto";
	filters: {
		pokemonMajor: FilterPokemon;
		pokestopMajor: FilterPokestopMajor;
		pokestopPlain: FilterPokestopPlain;
		quest: FilterQuest;
		invasion: FilterInvasion;
		contest: FilterContest;
		lure: FilterLure;
		gymMajor: FilterGymMajor;
		gymPlain: FilterGymPlain;
		raid: FilterRaid;
		stationMajor: FilterStationMajor;
		s2cell: FilterS2Cell;
	};
};

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

export function getDefaultUserSettings(): UserSettings {
	return {
		mapPosition: {
			center: {
				lat: 53.86762990550971,
				lng: 10.687758976519007
			},
			zoom: 15
		},
		mapStyle: {
			id: getConfig().mapStyles[0].id,
			url: getConfig().mapStyles[0].url
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
		languageTag: "auto",
		showDebugMenu: false,
		filters: {
			pokemonMajor: { category: "pokemonMajor", type: "all" },
			pokestopMajor: { category: "pokestopMajor", type: "all" },
			pokestopPlain: { category: "pokestopPlain", type: "all" },
			quest: { category: "quest", type: "all" },
			invasion: { category: "invasion", type: "all" },
			contest: { category: "contest", type: "all" },
			lure: { category: "lure", type: "all" },
			gymMajor: { category: "gymMajor", type: "all" },
			gymPlain: { category: "gymPlain", type: "all" },
			raid: { category: "raid", type: "all" },
			stationMajor: { category: "stationMajor", type: "all" },
			s2cell: { category: "s2cell", type: "none", filters: { levels: [15] } }
		}
	};
}

// @ts-ignore
let userSettings: UserSettings = $state({});

export async function getUserSettingsFromServer() {
	const response = await fetch("/api/user/settings");
	const dbUserSettings: { error?: string; result: UserSettings } = await response.json();

	if (!dbUserSettings.error && Object.keys(dbUserSettings.result).length > 0) {
		setUserSettings(dbUserSettings.result);
		updateUserSettings();
		return true;
	}

	return false;
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
	localStorage.setItem("userSettings", serializedUserSettings);

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
