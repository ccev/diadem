import type { AddressData } from "@/lib/features/geocoding";
import type {
	GeocodingSearchOptions,
	GeocodingReverseOptions,
	ReverseGeocodingResponse
} from "./types";
import { BaseGeocodingProvider } from "./base";
import addressFormatter from "@fragaria/address-formatter";
import type { FeatureCollection, Point } from "geojson";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("photon");

interface PhotonConfig {
	url: string;
	basicAuth?: string;
	hasGeometries?: boolean;
}

interface PhotonProps {
	osm_id: number;
	osm_type: string;
	type?: string;
	countrycode?: string;
	name?: string;
	housenumber?: string;
	street?: string;
	district?: string;
	city?: string;
	county?: string;
	state?: string;
	country?: string;
	postcode?: string;
	extent: [number, number, number, number];
	house?: string;
	[key: string]: any;
}

export class PhotonProvider extends BaseGeocodingProvider {
	private config: PhotonConfig;

	constructor(config: PhotonConfig) {
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
			log.error("Photon request failed [%d] %s", response.status, await response.text());
			return;
		}

		return response;
	}

	async search(options: GeocodingSearchOptions): Promise<AddressData[]> {
		const response = await this.request("api", {
			q: options.query,
			lang: options.language,
			limit: options.limit ?? 5,
			lat: options.lat,
			lon: options.lon,
			zoom: options.zoom,
			geometry: this.config.hasGeometries || undefined
		});
		if (!response) return [];

		const data: FeatureCollection<Point, PhotonProps> = await response.json();

		return (
			data?.features?.map((f) => {
				const p = f.properties;

				if (p.name && p.type) {
					p[p.type] = p.name;
				}

				let formattedAddressParts = addressFormatter.format(
					{
						house: p.house,
						road: p.street,
						houseNumber: p.housenumber,
						neighbourhood: p.district,
						city: p.city,
						county: p.county,
						state: p.state,
						postcode: p.postcode,
						country: p.country,
						countryCode: p.countrycode
					},
					{
						abbreviate: false,
						cleanupPostcode: true,
						countryCode: p.countrycode,
						output: "array"
					}
				);

				if (!["city", "county", "state", "country"].includes(p.type ?? "")) {
					formattedAddressParts = formattedAddressParts.slice(0, -1);
				}

				const label = formattedAddressParts.join(", ");

				const result: AddressData = {
					name: label,
					id: `${p.osm_type}${p.osm_id}`,
					center: f.geometry.coordinates,
					bbox: p.extent
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
			lat: options.lat,
			lon: options.lon,
			limit: 1,
			lang: options.language
		});
		if (!response) return;

		const props = (await response.json())?.features?.[0]?.properties as PhotonProps | undefined;
		if (!props) return;

		return {
			city: props.city,
			country: props.country,
			countrycode: props.countrycode?.toUpperCase(),
			state: props.state,
			postcode: props.postcode,
			street: props.street,
			housenumber: props.housenumber,
			district: props.district
		};
	}
}
