import * as m from "@/lib/paraglide/messages";
import { openToast } from "@/components/ui/toast/toastUtils.svelte";
import { getMap } from '@/lib/map/map.svelte';
import type { LngLatLike } from 'maplibre-gl';
import { tick } from 'svelte';

let geolocationEnabled: boolean = $state(false);
let isFetchingLocation: boolean = $state(false);
let animateLocationMarker: boolean = $state(false)
let currentLocation: undefined | LngLatLike = $state(undefined)

export function getIsGeolocationEnabled() {
	return geolocationEnabled
}

export function getIsFetchingLocation() {
	return isFetchingLocation
}

export function getCurrentLocation() {
	return currentLocation
}

export function getAnimateLocationMarker() {
	return animateLocationMarker
}

export function setAnimateLocationMarker(state: boolean) {
	animateLocationMarker = state
}

async function getGeolocationPermissionsState() {
	const permissions = await window.navigator.permissions.query({ name: "geolocation" });
	return permissions.state;
}

export async function updateGeolocationEnabled(showResult: boolean = false) {
	let errorReason = "";
	let geolocationOk: boolean = false;

	if (!window.navigator.permissions) {
		geolocationOk = !!window.navigator.geolocation;
		if (!geolocationOk) errorReason = m.locate_error_support();
	} else {
		try {
			const permsState = await getGeolocationPermissionsState();
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

export function updateLocation() {
	isFetchingLocation = true
	navigator?.geolocation?.getCurrentPosition(
		(s) => {
			console.debug(s)
			isFetchingLocation = false

			const map = getMap()
			if (!map) return

			currentLocation = {
				lng: s.coords.longitude,
				lat: s.coords.latitude
			}
			map.flyTo({
				center: [s.coords.longitude, s.coords.latitude],
				zoom: 17
			})
			tick().then(() => animateLocationMarker = true)
		},
		(e) => {
			if (e.code === 1) {
				openToast(m.locate_error_perms())
			} else if (e.code === 2) {
				openToast(m.locate_error_timeout())
			} else {
				openToast(m.locate_error_unknown())
			}

			geolocationEnabled = false
			isFetchingLocation = false
			currentLocation = undefined
		},
		{
			enableHighAccuracy: true
		}
	)
}