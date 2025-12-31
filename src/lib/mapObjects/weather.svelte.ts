import { getBounds } from "@/lib/mapObjects/mapBounds";
import {
	cellToFeature,
	getCoveringS2Cells,
	type S2CellProperties
} from "@/lib/mapObjects/s2cells.js";
import { getMap } from "@/lib/map/map.svelte";
import type { CellID } from "s2js/dist/s2/cellid";
import { s2 } from "s2js";
import type { WeatherData } from "@/lib/types/mapObjectData/weather";
import TTLCache from "@isaacs/ttlcache";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { MapSourceId, updateMapGeojsonSource } from "@/lib/map/layers";
import type { FeatureCollection, Polygon } from "geojson";

const WEATHER_CELL_LEVEL = 10;
const UPDATE_INTERVAL = 5 * 60 * 1000;
const MIN_ZOOM = 10;
const CELL_COLOR = "#b8e6fe";

const weatherCache: TTLCache<string, WeatherData> = new TTLCache({
	max: 1000,
	ttl: UPDATE_INTERVAL
});
let currentWeather: WeatherData | undefined = $state(undefined);
let lastSelectedWeatherWasEmpty = true

export function getCurrentWeather() {
	return currentWeather;
}

export function updateCurrentWeatherFeatures(show: boolean) {
	if (!show && lastSelectedWeatherWasEmpty) return

	const data: FeatureCollection<Polygon, S2CellProperties> = {
		type: "FeatureCollection",
		features: []
	};

	if (currentWeather && show) {
		data.features = [cellToFeature(currentWeather.cellId, CELL_COLOR, CELL_COLOR, "weathercell")];
		lastSelectedWeatherWasEmpty = false
	} else {
		lastSelectedWeatherWasEmpty = true
	}

	updateMapGeojsonSource(MapSourceId.SELECTED_WEATHER, data);
}

export async function updateWeather() {
	if (!hasFeatureAnywhere(getUserDetails().permissions, "weather")) {
		currentWeather = false;
		updateCurrentWeatherFeatures(false);
		return;
	}

	// TODO: update more often after full hour
	const map = getMap();
	if (!map) return;

	if (map.getZoom() < MIN_ZOOM) {
		if (currentWeather) currentWeather = undefined;
		return;
	}

	const bounds = getBounds(false);
	const cells = getCoveringS2Cells(bounds, WEATHER_CELL_LEVEL);

	if (cells.length <= 0) return;

	let weatherCell: CellID = cells[0];

	if (cells.length > 1) {
		const center = map.getCenter();
		let smallestDistance: number | undefined = undefined;

		cells.forEach((cellId) => {
			const cell = s2.Cell.fromCellID(cellId);
			const distance = cell.distance(
				s2.Point.fromLatLng(s2.LatLng.fromDegrees(center.lat, center.lng))
			);
			if (smallestDistance === undefined || distance < smallestDistance) {
				smallestDistance = distance;
				weatherCell = cellId;
			}
		});
	}

	const weatherCacheKey = weatherCell.toString();
	if (weatherCache.has(weatherCacheKey)) {
		if (currentWeather?.cellId !== weatherCell) {
			currentWeather = weatherCache.get(weatherCacheKey);
		}
		return;
	}

	const response = await fetch("/api/weather/" + BigInt.asIntN(64, weatherCell).toString());
	const data = await response.json();

	if (!data.result) return;

	const weatherData = data.result[0] as WeatherData;

	if (weatherData) weatherData.cellId = weatherCell;

	weatherCache.set(weatherCacheKey, weatherData);
	currentWeather = weatherData;
}
