import type { Geometry } from "geojson";
import type { AddressData } from "@/lib/features/geocoding";
import type {
	GeocodingSearchOptions,
	GeocodingReverseOptions,
	GeocodingLookupOptions,
	ReverseGeocodingResponse
} from "./types";

export abstract class BaseGeocodingProvider {
	abstract search(options: GeocodingSearchOptions): Promise<AddressData[]>;
	abstract reverse(options: GeocodingReverseOptions): Promise<ReverseGeocodingResponse | undefined>;

	async lookup(_options: GeocodingLookupOptions): Promise<Geometry | undefined> {
		return undefined;
	}
}
