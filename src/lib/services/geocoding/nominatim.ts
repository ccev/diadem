import type { AddressData } from "@/lib/features/geocoding";
import type {
	GeocodingSearchOptions,
	GeocodingReverseOptions,
	GeocodingLookupOptions,
	ReverseGeocodingResponse
} from "./types";
import { BaseGeocodingProvider } from "./base";
import type { FeatureCollection, Geometry, Point } from "geojson";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("nominatim");

interface NominatimConfig {
	url: string;
	basicAuth?: string;
	userAgent?: string;
}

interface NominatimProps {
	geocoding: {
		name?: string;
		city?: string;
		country?: string;
		country_code?: string;
		state?: string;
		street?: string;
		housenumber?: string;
		postcode?: string;
		osm_id: number;
		osm_type: string;
	};
}

export class NominatimProvider extends BaseGeocodingProvider {
	private config: NominatimConfig;

	constructor(config: NominatimConfig) {
		super();
		this.config = config;
	}

	private async request(
		path: string,
		params: Record<string, string | number | boolean | null | undefined>
	) {
		const url = new URL(path, this.config.url);
		for (const [key, value] of Object.entries(params)) {
			if (value != null) url.searchParams.set(key, String(value));
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json"
		};
		if (this.config.basicAuth) {
			headers["Authorization"] = `Basic ${btoa(this.config.basicAuth)}`;
		}
		if (this.config.userAgent) {
			headers["User-Agent"] = this.config.userAgent;
		}

		const response = await fetch(url, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(2000)
		});

		if (!response.ok) {
			log.error("Nominatim request failed: %s", await response.text());
			return;
		}

		return response;
	}

	async search(options: GeocodingSearchOptions): Promise<AddressData[]> {
		const response = await this.request("search", {
			format: "geocodejson",
			addressdetails: 1,
			polygon_geojson: 1,
			limit: options.limit ?? 3,
			"accept-language": options.language,
			q: options.query
		});
		if (!response) return [];

		const data: FeatureCollection<Point, NominatimProps> = await response.json();

		return (
			data?.features?.map((f) => {
				const props = f.properties.geocoding;

				let name = "";

				if (props.name) {
					name = props.name;
				} else if (props.street) {
					name += props.street;
					if (props.housenumber) {
						name += " " + props.housenumber;
					}
				}

				if (props.city) {
					name += ", " + props.city;
				} else if (props.country) {
					name += ", " + props.country;
				}

				const result: AddressData = {
					name,
					id: `${props.osm_type[0]}${props.osm_id}`,
					center: f.geometry.coordinates,
					bbox: f.bbox
				};

				if (f.geometry.type !== "Point") {
					result.geometry = f.geometry;
				}

				return result;
			}) ?? []
		);
	}

	async reverse(options: GeocodingReverseOptions): Promise<ReverseGeocodingResponse | undefined> {
		const response = await this.request("reverse", {
			format: "geocodejson",
			lat: options.lat,
			lon: options.lon,
			"accept-language": options.language
		});
		if (!response) return;

		const props = (await response.json())?.features?.[0]?.properties?.geocoding as
			| NominatimProps["geocoding"]
			| undefined;
		if (!props) return;

		return {
			city: props.city,
			country: props.country,
			countrycode: props.country_code,
			state: props.state,
			postcode: props.postcode,
			street: props.street,
			housenumber: props.housenumber
		};
	}

	async lookup(options: GeocodingLookupOptions): Promise<Geometry | undefined> {
		const response = await this.request("lookup", {
			format: "geojson",
			polygon_geojson: 1,
			osm_ids: options.osmId
		});
		if (!response) return;

		const featureCollection = (await response.json()) as FeatureCollection;
		return featureCollection.features[0]?.geometry;
	}
}
