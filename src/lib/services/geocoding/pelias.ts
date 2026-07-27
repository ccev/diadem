import type { AddressData } from "@/lib/features/geocoding";
import type {
	GeocodingSearchOptions,
	GeocodingReverseOptions,
	ReverseGeocodingResponse
} from "./types";
import { BaseGeocodingProvider } from "./base";
import type { FeatureCollection, Point } from "geojson";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("pelias");

interface PeliasConfig {
	url: string;
	apiKey?: string;
	basicAuth?: string;
}

interface PeliasProps {
	gid: string;
	label: string;
	name?: string;
	housenumber?: string;
	street?: string;
	locality?: string;
	borough?: string;
	county?: string;
	region?: string;
	country?: string;
	country_code?: string;
	postalcode?: string;
}

export class PeliasProvider extends BaseGeocodingProvider {
	private config: PeliasConfig;

	constructor(config: PeliasConfig) {
		super();
		this.config = config;
	}

	private async request(
		path: string,
		params: Record<string, string | number | boolean | null | undefined>
	) {
		if (this.config.apiKey) {
			params.api_key = this.config.apiKey
		}

		const url = new URL(path, this.config.url);
		for (const [key, value] of Object.entries(params)) {
			if (value != null) url.searchParams.set(key, String(value));
		}

		const headers: HeadersInit = {};
		if (this.config.basicAuth) {
			headers["Authorization"] = `Basic ${btoa(this.config.basicAuth)}`;
		}

		const response = await fetch(url, {
			method: "GET",
			signal: AbortSignal.timeout(2000),
			headers
		});

		if (!response.ok) {
			log.error("Pelias request failed [%d] %s", response.status, await response.text());
			return;
		}

		return response;
	}

	async search(options: GeocodingSearchOptions): Promise<AddressData[]> {
		const response = await this.request("v1/autocomplete", {
			text: options.query,
			lang: options.language,
			size: options.limit ?? 5,
			"focus.point.lat": options.lat,
			"focus.point.lon": options.lon
		});
		if (!response) return [];

		const data: FeatureCollection<Point, PeliasProps> = await response.json();

		return (
			data?.features?.map((f) => ({
				name: f.properties.label,
				id: f.properties.gid,
				center: f.geometry.coordinates,
				bbox: f.bbox,
				geometry: f.geometry
			})) ?? []
		);
	}

	async reverse(options: GeocodingReverseOptions): Promise<ReverseGeocodingResponse | undefined> {
		const response = await this.request("v1/reverse", {
			"point.lat": options.lat,
			"point.lon": options.lon,
			lang: options.language,
			"size": 1
		});
		if (!response) return;

		const props = (await response.json())?.features?.[0]?.properties as PeliasProps | undefined;
		if (!props) return;

		return {
			city: props.locality,
			country: props.country,
			countrycode: props.country_code?.toUpperCase(),
			state: props.region,
			postcode: props.postalcode,
			street: props.street,
			housenumber: props.housenumber,
			district: props.borough
		};
	}
}
