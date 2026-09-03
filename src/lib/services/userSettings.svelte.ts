import { browser } from "$app/environment";
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
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getConfig } from "@/lib/services/config/config";
import type { AnySearchEntry } from "@/lib/services/search.svelte";
import { getDefaultMapStyle } from "@/lib/services/themeMode";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
import { encodeRequestBody, getHeaders, parseResponse } from "@/lib/utils/requests";
import { getDefaultGymFilter } from "@/lib/utils/gymUtils";
import { getDefaultPokestopFilter } from "@/lib/utils/pokestopUtils";
import { getDefaultStationFilter } from "@/lib/utils/stationUtils";

export type UiconSetUS = {
	id: string;
	url: string;
};

export enum ExternalMapProvider {
	GOOGLE = "google",
	APPLE = "apple"
}

type ActionState = {
	expanded: boolean;
	dimmed: {
		mapIds: string[];
	};
	radius: {
		mapIds: string[];
		all: boolean;
		extraRadius: boolean;
	};
	timer: {
		mapIds: string[];
		all: boolean;
	};
};

type LegacyUserSettings = Partial<UserSettings> & {
	expandedMapObjects?: MapObjectType[];
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
	enableRotatePitch: boolean;
	mapIconSize: number;
	externalMapProvider: ExternalMapProvider;
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
	actions: Record<MapObjectType, ActionState>;
	recentSearches: AnySearchEntry[];
};

function defaultActionState(): ActionState {
	return {
		expanded: false,
		dimmed: {
			mapIds: []
		},
		radius: {
			mapIds: [],
			all: false,
			extraRadius: false
		},
		timer: {
			mapIds: [],
			all: false
		}
	};
}

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
		enableRotatePitch: true,
		mapIconSize: 1,
		externalMapProvider: ExternalMapProvider.GOOGLE,
		filters: {
			pokemon: { category: "pokemon", ...defaultFilter() },
			pokestop: getDefaultPokestopFilter(),
			gym: getDefaultGymFilter(),
			station: getDefaultStationFilter(),
			// s2cell: { category: "s2cell", ...defaultFilter() },
			s2cell: {
				category: "s2cell",
				enabled: false,
				level: 14,
				wayfarerMode: false
			},
			nest: { category: "nest", ...defaultFilter() },
			spawnpoint: { category: "spawnpoint", ...defaultFilter() },
			route: { category: "route", ...defaultFilter() },
			tappable: { category: "tappable", ...defaultFilter() }
		},
		actions: Object.fromEntries(
			Object.values(MapObjectType).map((type) => [type, defaultActionState()])
		) as UserSettings["actions"],
		recentSearches: []
	};
}

export function defaultFilter(enabled: boolean = false) {
	return {
		enabled,
		filters: []
	};
}

export function getDefaultIconSet(type: MapObjectType) {
	let iconSet = getConfig().uiconSets.find((s) => typeof s[type] === "object" && s[type]?.default);

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
	const response = await fetch("/api/user/settings", { headers: getHeaders() });
	if (!response.ok) return;
	const dbUserSettings = await parseResponse<{ error?: string; result: UserSettings }>(response);

	// User has existing user settings, merge with defaults and keep the local copy in sync.
	if (!dbUserSettings.error && Object.keys(dbUserSettings.result).length > 0) {
		// TODO: only overwrite map position if current position is default
		setUserSettings(dbUserSettings.result);
		if (browser && window.localStorage) {
			localStorage.setItem("userSettings", JSON.stringify(userSettings));
		}
	}
}

export function setUserSettings(newUserSettings: LegacyUserSettings) {
	const mergedUserSettings = deepMerge(getDefaultUserSettings(), newUserSettings);
	userSettings = migrateUserSettings(mergedUserSettings);
}

export function getUserSettings() {
	return userSettings;
}

const SETTINGS_SYNC_DELAY_MS = 2000;
const SETTINGS_ENDPOINT = "/api/user/settings";
const POSITION_ENDPOINT = "/api/user/settings/position";
const KEEPALIVE_MAX_BYTES = 64 * 1024;
const SYNC_TIMEOUT_MS = 15_000;

let syncTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSync: "full" | "position" | undefined;
let lastSyncedUserSettings: string | undefined;
let syncing = false;
let retrying = false;

function persistUserSettingsLocally(): string {
	const serialized = JSON.stringify(userSettings);
	if (browser && window.localStorage) localStorage.setItem("userSettings", serialized);
	return serialized;
}

function scheduleSync(type?: "full" | "position") {
	if (type) retrying = false;
	if (type === "full" || !pendingSync) pendingSync = type ?? pendingSync;
	if (syncTimer || syncing) return;
	syncTimer = setTimeout(syncUserSettings, SETTINGS_SYNC_DELAY_MS);
}

export function updateUserSettings() {
	const serialized = persistUserSettingsLocally();

	if (!getUserDetails().details) return;
	if (serialized === lastSyncedUserSettings && !syncing) return;

	scheduleSync("full");
}

export function updateMapPosition() {
	persistUserSettingsLocally();

	if (!getUserDetails().details) return;
	scheduleSync("position");
}

async function syncUserSettings() {
	if (syncTimer) {
		clearTimeout(syncTimer);
		syncTimer = undefined;
	}
	if (syncing || !pendingSync) return;

	const type = pendingSync;
	pendingSync = undefined;
	let serialized: string | undefined;
	let body: unknown;
	let url: string;

	if (type === "full") {
		serialized = JSON.stringify(userSettings);
		if (serialized === lastSyncedUserSettings) return;
		body = userSettings;
		url = SETTINGS_ENDPOINT;
	} else {
		const { center, zoom } = userSettings.mapPosition;
		body = { lat: center.lat, lng: center.lng, zoom };
		url = POSITION_ENDPOINT;
	}

	const encoded = encodeRequestBody(body);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
	syncing = true;
	let succeeded = false;
	try {
		const response = await fetch(url, {
			method: "POST",
			body: encoded.body,
			headers: getHeaders(encoded.contentType),
			keepalive: encoded.byteLength < KEEPALIVE_MAX_BYTES,
			signal: controller.signal
		});
		succeeded = response.ok;
		if (response.ok && serialized) lastSyncedUserSettings = serialized;
	} catch {
	} finally {
		clearTimeout(timeout);
		syncing = false;
		if (!succeeded && !retrying) {
			retrying = true;
			if (type === "full" || !pendingSync) pendingSync = type;
		} else {
			retrying = false;
		}
		if (pendingSync) scheduleSync();
	}
}

if (browser) {
	window.addEventListener("pagehide", syncUserSettings);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") syncUserSettings();
	});
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

function migrateUserSettings(settings: LegacyUserSettings): UserSettings {
	if (settings.expandedMapObjects) {
		for (const objectType of settings.expandedMapObjects) {
			if (settings?.actions?.[objectType]) {
				settings.actions[objectType].expanded = true;
			}
		}
		delete settings.expandedMapObjects;
	}

	return settings as UserSettings;
}
