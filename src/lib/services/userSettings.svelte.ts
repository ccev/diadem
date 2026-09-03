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
import { encodeRequestBody, getHeaders } from "@/lib/utils/requests";
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
	const response = await fetch("/api/user/settings");
	const dbUserSettings: { error?: string; result: UserSettings } = await response.json();

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

/** Longest a change waits before reaching the server. */
const SETTINGS_SYNC_DELAY_MS = 2000;

const SETTINGS_ENDPOINT = "/api/user/settings";
const POSITION_ENDPOINT = "/api/user/settings/position";

/** The Fetch spec rejects a keepalive request whose body exceeds this. */
const KEEPALIVE_MAX_BYTES = 64 * 1024;

/**
 * Failed saves before giving up; some failures never resolve (e.g. a blob past
 * the body limit). A later edit restarts the count.
 */
const MAX_SYNC_FAILURES = 3;

/** A save that hasn't settled by now is treated as failed, so the guard clears. */
const SYNC_TIMEOUT_MS = 15_000;

let syncTimer: ReturnType<typeof setTimeout> | undefined;
/** Something other than the map position changed, so the whole object must go. */
let fullSyncPending = false;
let positionSyncPending = false;
let lastSyncedUserSettings: string | undefined;
let syncFailures = 0;
/** A save is on the wire; overlapping ones could land out of order. */
let syncInFlight = false;

/** Everything the client keeps locally, regardless of what the server is told. */
function persistUserSettingsLocally(): string {
	const serialized = JSON.stringify(userSettings);
	if (browser && window.localStorage) localStorage.setItem("userSettings", serialized);
	return serialized;
}

function scheduleSync() {
	// Not restarted on each change, or continuous panning would never fire one.
	if (syncTimer) return;
	syncTimer = setTimeout(() => syncUserSettings("timer"), SETTINGS_SYNC_DELAY_MS);
}

export function updateUserSettings() {
	const serialized = persistUserSettingsLocally();

	if (!getUserDetails().details) return;
	if (serialized === lastSyncedUserSettings) return;

	// A real edit deserves a fresh run of attempts, whatever happened to the last.
	syncFailures = 0;
	fullSyncPending = true;
	scheduleSync();
}

/**
 * Record where the user is looking. Split off because the map calls it on every
 * move, and the settings endpoint replaces the whole stored object for three
 * numbers.
 */
export function updateMapPosition() {
	persistUserSettingsLocally();

	if (!getUserDetails().details) return;

	positionSyncPending = true;
	scheduleSync();
}

/** "timer": debounced write. "hidden": backgrounded page. "closing": real unload. */
type SyncReason = "timer" | "hidden" | "closing";

function syncUserSettings(reason: SyncReason) {
	if (syncTimer) {
		clearTimeout(syncTimer);
		syncTimer = undefined;
	}

	// One at a time: two saves in flight could land out of order. Pending work
	// goes out when the current save settles — except on a real unload, where
	// holding it back guarantees the change is lost.
	if (syncInFlight && reason !== "closing") {
		scheduleSync();
		return;
	}

	if (fullSyncPending) {
		fullSyncPending = false;
		const payload = JSON.stringify(userSettings);

		if (payload !== lastSyncedUserSettings) {
			// A full write carries the position too, so it supersedes a pending one.
			positionSyncPending = false;
			lastSyncedUserSettings = payload;
			syncInFlight = true;
			post(
				SETTINGS_ENDPOINT,
				JSON.parse(payload),
				reason,
				() => {
					lastSyncedUserSettings = undefined;
					// Re-armed before settling so the retry is scheduled; map moves
					// take the position path now, so nothing else would resend it.
					if (++syncFailures <= MAX_SYNC_FAILURES) fullSyncPending = true;
					else console.warn("Giving up on syncing settings after repeated failures");
					settleSync();
				},
				() => {
					settleSync();
					syncFailures = 0;
				}
			);
			return;
		}
		// Nothing to write — fall through so a queued position sync isn't swallowed.
	}

	if (positionSyncPending) {
		positionSyncPending = false;
		const { center, zoom } = userSettings.mapPosition;
		// Counts as in flight too: a stalled position patch landing after a full
		// save would put the old viewport back.
		syncInFlight = true;
		post(
			POSITION_ENDPOINT,
			{ lat: center.lat, lng: center.lng, zoom },
			reason,
			// The position is resent on the next move anyway.
			settleSync,
			settleSync
		);
	}
}

/** Mark the in-flight save finished and pick up anything queued behind it. */
function settleSync() {
	syncInFlight = false;
	if (fullSyncPending || positionSyncPending) scheduleSync();
}

function post(
	url: string,
	body: unknown,
	reason: SyncReason,
	onFailure: () => void,
	onSuccess: () => void = () => {}
) {
	// msgpack when possible; JSON on native, where CapacitorHttp would corrupt
	// a binary body.
	const encoded = encodeRequestBody(body);

	// keepalive rather than sendBeacon: a beacon skips window.fetch, which native
	// builds patch with their bearer token, so it would post to the webview
	// origin and be lost. keepalive outlives the page the same way.
	//
	// It is refused past 64 KiB anyway, so an oversized unload send goes as an
	// ordinary request instead — it may be cut short, which beats a guaranteed
	// rejection. The limit is bytes, not string length.
	const size =
		typeof encoded.body === "string"
			? new TextEncoder().encode(encoded.body).byteLength
			: encoded.body.byteLength;
	const keepalive = size < KEEPALIVE_MAX_BYTES;

	fetch(url, {
		method: "POST",
		body: encoded.body,
		headers: getHeaders({ contentType: encoded.contentType }),
		keepalive,
		// An unsettled request would leave the one-at-a-time guard set forever;
		// keepalive sends are exempt as the page is going away.
		signal: reason === "closing" ? undefined : AbortSignal.timeout(SYNC_TIMEOUT_MS)
	})
		.then(async (response) => {
			// A 200 with an error body (e.g. expired session) is still a failure.
			const failed = !response.ok || Boolean((await response.json().catch(() => null))?.error);
			// Let the next change try again rather than assuming this one landed.
			if (failed) onFailure();
			else onSuccess();
		})
		.catch(onFailure);
}

if (browser) {
	const flush = (reason: SyncReason) => {
		if (fullSyncPending || positionSyncPending) syncUserSettings(reason);
	};
	// pagehide rather than unload, which is unreliable on mobile Safari.
	window.addEventListener("pagehide", () => flush("closing"));
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flush("hidden");
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
