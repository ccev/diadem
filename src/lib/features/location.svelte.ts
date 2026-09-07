import { getLocale } from "$lib/paraglide/runtime";
import { getMap } from "$lib/map/map.svelte";
import { type Bounds } from "$lib/mapObjects/mapBounds";
import { getCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";
import { ClientMapObjectType, type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
import { fetchMapObjects } from "$lib/mapObjects/updateMapObject";
import { getConfig } from "$lib/services/config/config";
import { isSupportedFeature } from "$lib/services/supportedFeatures";
import { hasAnyFeatureAnywhere } from "$lib/services/user/checkPerm";
import { getUserDetails } from "$lib/services/user/userDetails.svelte";
import { Coords } from "$lib/utils/coordinates";
import { featureFamily } from "$lib/utils/features";
import { getMapPath } from "$lib/utils/getMapPath";
import { getHeaders, parseResponse } from "$lib/utils/requests";
import { bbox, buffer, distance, point } from "@turf/turf";
import type { LocationData, NearbyLocationObject } from "$lib/types/mapObjectData/location";

let detailsController: AbortController | undefined;

export function getSelectedLocation() {
	const selected = getCurrentSelectedData();
	return selected?.type === ClientMapObjectType.LOCATION ? selected : null;
}

export function abortLocationDetails() {
	detailsController?.abort();
	detailsController = undefined;
}

export function formattedCoordinates(data: { lat: number, lon: number }) {
	return `${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}`;
}

function getLocationBounds(coords: Coords, radius: number): Bounds {
	const area = buffer(point(coords.geojson()), radius / 1000, { units: "kilometers" });
	const bounds = area ? bbox(area) : [coords.lon, coords.lat, coords.lon, coords.lat];
	return {
		minLon: bounds[0],
		minLat: bounds[1],
		maxLon: bounds[2],
		maxLat: bounds[3]
	};
}

export async function loadLocationDetails(data: LocationData) {
	abortLocationDetails();
	const controller = new AbortController();
	detailsController = controller;
	const coords = new Coords(data.lat, data.lon);
	const key = `${data.lat},${data.lon}`;

	const addressPromise = isSupportedFeature("geocoding")
		? fetch(
				`/api/search/location?lat=${encodeURIComponent(data.lat)}&lon=${encodeURIComponent(data.lon)}&lang=${encodeURIComponent(getLocale())}`,
				{ headers: getHeaders(), signal: controller.signal }
			)
				.then(async (response) =>
					response.ok ? await parseResponse<{ address?: string }>(response) : undefined
				)
				.catch((error) => {
					if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
				})
		: Promise.resolve(undefined);

	const permissions = getUserDetails().permissions;
	const types = [
		MapObjectType.SPAWNPOINT,
		MapObjectType.POKESTOP,
		MapObjectType.GYM,
		MapObjectType.STATION
	];
	const permittedTypes = types.filter((type) =>
		hasAnyFeatureAnywhere(permissions, featureFamily[type])
	);
	const nearbyPromise = Promise.all(
		permittedTypes.map(async (type) => {
			const radius = type === MapObjectType.SPAWNPOINT ? 40 : 80;
			return (
				(
					await fetchMapObjects(
						type,
						getLocationBounds(coords, radius),
						undefined,
						controller.signal
					)
				)?.data ?? []
			);
		})
	).catch((error) => {
		if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
		return [] as MapData[][];
	});

	const [addressResult, nearbyResults] = await Promise.all([addressPromise, nearbyPromise]);
	const popup = getSelectedLocation();
	if (controller.signal.aborted || `${popup?.lat},${popup?.lon}` !== key) return;
	if (!popup) return;

	const nearby = nearbyResults.flat().map((mapObject) => ({
		...mapObject,
		distance: distance(coords.geojson(), [mapObject.lon, mapObject.lat], { units: "meters" })
	}));
	const spawnpoints = nearby.filter(
		(mapObject) => mapObject.type === MapObjectType.SPAWNPOINT && mapObject.distance <= 40
	).length;
	const nearbyObjects = nearby
		.filter(
			(mapObject): mapObject is NearbyLocationObject =>
				mapObject.distance <= 80 &&
				(mapObject.type === MapObjectType.POKESTOP ||
					mapObject.type === MapObjectType.GYM ||
					mapObject.type === MapObjectType.STATION)
		)
		.sort((left, right) => {
			if (left.type !== right.type) {
				if (left.type === MapObjectType.GYM) return -1;
				if (right.type === MapObjectType.GYM) return 1;
				if (left.type === MapObjectType.POKESTOP) return -1;
				if (right.type === MapObjectType.POKESTOP) return 1;
			}

			return left.distance - right.distance;
		});
	const details = {
		address: addressResult?.address,
		isAddressLoading: false,
		isNearbyLoading: false,
		nearby: nearbyObjects,
		spawnpoints
	};
	Object.assign(data, details);
	Object.assign(popup, details);
}

export function getLocationPath(data: Pick<LocationData, "lat" | "lon" | "zoom">) {
	const path = new URL(getMapPath(getConfig()), window.location.origin);
	path.searchParams.set("lat", data.lat.toFixed(6));
	path.searchParams.set("lon", data.lon.toFixed(6));
	if (data.zoom !== undefined) path.searchParams.set("zoom", data.zoom.toFixed(2));
	return path.pathname + path.search;
}

export function createLocationData(coords: Coords, zoom: number | undefined = getMap()?.getZoom()) {
	return {
		id: "selected",
		mapId: "location-selected",
		type: ClientMapObjectType.LOCATION,
		lat: coords.lat,
		lon: coords.lon,
		zoom,
		isAddressLoading: isSupportedFeature("geocoding"),
		isNearbyLoading: true,
		nearby: [],
		spawnpoints: 0
	} satisfies LocationData;
}
