import { getMap } from "@/lib/map/map.svelte";
import * as m from "@/lib/paraglide/messages";
import { openToast } from "@/lib/ui/toasts.svelte.js";
import { round } from "@/lib/utils/numberFormat";
import { distance } from "@turf/turf";
import maplibre from "maplibre-gl";

type Location = {
	lat: number;
	lng: number;
	heading: number | undefined;
};

let geolocationEnabled: boolean = $state(false);
let isFetchingLocation: boolean = $state(false);
let isLocateFollowing: boolean = $state(false);
let currentLocation: Location | undefined = $state(undefined);
let watchId: number | undefined = undefined;
let animationFrame: number | undefined = undefined;
let shouldUpdateLocation = false;
let shouldUpdateCamera = false;

const minZoom = 14.5;
const maxZoom = 17.5;
const locationAnimationDuration = 1000;
const minLocationUpdateDistanceMeters = 2;

export function getIsGeolocationEnabled() {
	return geolocationEnabled;
}

export function getIsFetchingLocation() {
	return isFetchingLocation;
}

export function getCurrentLocation() {
	return currentLocation;
}

export function getIsLocateFollowing() {
	return isLocateFollowing;
}

export function setIsLocateFollowing(state: boolean) {
	isLocateFollowing = state;
}

export function resetLocate() {
	getMap()?.stop();
	isLocateFollowing = false;
	shouldUpdateLocation = false;
	shouldUpdateCamera = false;

	if (watchId !== undefined) {
		navigator.geolocation.clearWatch(watchId);
	}

	if (animationFrame !== undefined) {
		window.cancelAnimationFrame(animationFrame);
		animationFrame = undefined;
	}

	isFetchingLocation = false;
	currentLocation = undefined;
	watchId = undefined;
}

function animateLocation(location: Location, map: maplibre.Map | undefined) {
	if (animationFrame !== undefined) {
		window.cancelAnimationFrame(animationFrame);
	}

	if (!currentLocation) currentLocation = location;

	const startLocation = currentLocation;
	const startTime = performance.now();
	if (isLocateFollowing && map && shouldUpdateCamera) {
		// map.once("dragstart", () => map.stop())
		map.panTo([location.lng, location.lat], {
			duration: locationAnimationDuration
		});
	}

	function animateFrame(now: number) {
		const progress = Math.min((now - startTime) / locationAnimationDuration, 1);
		const easedProgress = 1 - Math.pow(1 - progress, 3);

		currentLocation = {
			lng: startLocation.lng + (location.lng - startLocation.lng) * easedProgress,
			lat: startLocation.lat + (location.lat - startLocation.lat) * easedProgress,
			heading: location.heading
		};

		if (progress < 1) {
			animationFrame = window.requestAnimationFrame(animateFrame);
		} else {
			animationFrame = undefined;
		}
	}

	animationFrame = window.requestAnimationFrame(animateFrame);
}

function getContinuousHeading(heading: number) {
	if (currentLocation?.heading === undefined) return heading;

	const normalizedHeading = heading % 360;
	const currentNormalizedHeading = currentLocation.heading % 360;
	const delta = ((normalizedHeading - currentNormalizedHeading + 540) % 360) - 180;

	return currentLocation.heading + delta;
}

function flyToLocation(map: maplibre.Map, location: Location) {
	let zoom = map.getZoom();
	if (zoom < minZoom - 1) {
		zoom = minZoom;
	} else if (zoom > maxZoom) {
		zoom = maxZoom;
	}

	map.once("moveend", (e: { data?: string }) => {
		if (e.data === "locate") {
			shouldUpdateCamera = true;
		}
	});
	map.flyTo(
		{
			center: [location.lng, location.lat],
			zoom,
			speed: 1.6,
			curve: 1
		},
		{ data: "locate" }
	);
}

function handleGeolocationError(e: GeolocationPositionError) {
	if (e.code === 1) {
		openToast(m.locate_error_perms());
	} else if (e.code === 2 || e.code === 3) {
		openToast(m.locate_error_timeout());
	} else {
		openToast(m.locate_error_unknown());
	}

	geolocationEnabled = false;
	currentLocation = undefined;
}

export async function updateGeolocationEnabled(showResult: boolean = false) {
	let errorReason = "";
	let geolocationOk: boolean = false;

	if (!window.navigator.permissions) {
		geolocationOk = !!window.navigator.geolocation;
		if (!geolocationOk) errorReason = m.locate_error_support();
	} else {
		try {
			const permsState = (await window.navigator.permissions.query({ name: "geolocation" })).state;
			geolocationOk = permsState !== "denied";
			if (!geolocationOk) errorReason = m.locate_error_perms();
		} catch {
			// Fix for iOS16 which rejects query but still supports geolocation
			geolocationOk = !!window.navigator.geolocation;
			if (!geolocationOk) errorReason = m.locate_error_support();
		}
	}

	geolocationEnabled = geolocationOk;
	if (!geolocationOk && showResult && errorReason) {
		openToast(errorReason);
	}
	return geolocationOk;
}

function handleGeolocationPosition(s: GeolocationPosition, map: maplibre.Map | undefined) {
	if (!shouldUpdateLocation) return;

	const hadLocation = !!currentLocation;
	let heading = currentLocation?.heading;
	let shouldMove = true;
	const locationCoords = {
		lng: round(s.coords.longitude, 6),
		lat: round(s.coords.latitude, 6)
	};

	if (currentLocation) {
		const distanceMeters = distance(
			[currentLocation.lng, currentLocation.lat],
			[locationCoords.lng, locationCoords.lat],
			{ units: "meters" }
		);
		shouldMove = distanceMeters > minLocationUpdateDistanceMeters;
	}

	if (s.coords.heading !== null && Number.isFinite(s.coords.heading)) {
		heading = getContinuousHeading(s.coords.heading);
	} else if (shouldMove && currentLocation) {
		const fromLat = (currentLocation.lat * Math.PI) / 180;
		const toLat = (locationCoords.lat * Math.PI) / 180;
		const lngDelta = ((locationCoords.lng - currentLocation.lng) * Math.PI) / 180;
		const y = Math.sin(lngDelta) * Math.cos(toLat);
		const x =
			Math.cos(fromLat) * Math.sin(toLat) -
			Math.sin(fromLat) * Math.cos(toLat) * Math.cos(lngDelta);

		heading = getContinuousHeading((Math.atan2(y, x) * 180) / Math.PI + 360);
	}

	const location: Location = {
		...locationCoords,
		heading
	};

	isFetchingLocation = false;
	geolocationEnabled = true;

	if (!hadLocation) {
		currentLocation = location;
		if (isLocateFollowing && map) {
			flyToLocation(map, location);
		}
		return;
	}

	if (shouldMove) {
		animateLocation(location, map);
	} else if (currentLocation && currentLocation.heading !== heading) {
		currentLocation.heading = heading;
	}
}

export function updateLocation(map: maplibre.Map | undefined, allowFollow: boolean) {
	if (allowFollow && watchId !== undefined) {
		if (isLocateFollowing) {
			resetLocate();
			return;
		}

		isLocateFollowing = true;

		if (currentLocation && map) {
			flyToLocation(map, currentLocation);
		}
		return;
	}

	if (!navigator.geolocation) {
		geolocationEnabled = false;
		openToast(m.locate_error_support());
		return;
	}

	isFetchingLocation = true;
	shouldUpdateLocation = true;

	if (allowFollow) {
		isLocateFollowing = true;
		watchId = navigator.geolocation.watchPosition(
			(s) => handleGeolocationPosition(s, map),
			(e) => {
				handleGeolocationError(e);
				resetLocate();
			},
			{
				enableHighAccuracy: true,
				maximumAge: 1000,
				timeout: 10000
			}
		);
	} else {
		navigator.geolocation.getCurrentPosition(
			(s) => {
				handleGeolocationPosition(s, map);
				if (map) flyToLocation(map, currentLocation);
				shouldUpdateLocation = watchId !== undefined;
			},
			(e) => {
				handleGeolocationError(e);
				isFetchingLocation = false;
				shouldUpdateLocation = watchId !== undefined;
			},
			{
				enableHighAccuracy: true,
				maximumAge: 1000,
				timeout: 10000
			}
		);
	}
}
