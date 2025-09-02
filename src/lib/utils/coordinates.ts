import { LngLat } from 'maplibre-gl';

export type LatLon = {
	lat: number
	lon: number
}

export class Coords {
	lat: number
	lon: number

	constructor(lat: number, lon: number) {
		this.lat = lat;
		this.lon = lon;
	}

	static infer(coords: LngLat | LatLon | number[]): Coords {
		if ("lng" in coords) {
			return new Coords(coords.lat, coords.lng)
		} else if ("lon" in coords) {
			return new Coords(coords.lat, coords.lon)
		} else if (Array.isArray(coords)) {
			return new Coords(coords[1], coords[0])
		} else {
			throw new Error("Invalid Coordinate input: " + coords)
		}
	}

	maplibre(): LngLat {
		return new LngLat(this.lon, this.lat)
	}

	internal() {
		return { lat: this.lat, lon: this.lon };
	}

	geojson() {
		return [this.lon, this.lat]
	}
}
