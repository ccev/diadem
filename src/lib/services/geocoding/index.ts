import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import type { AddressData } from "@/lib/features/geocoding";
import type { Geometry } from "geojson";
import type {
	GeocodingSearchOptions,
	GeocodingReverseOptions,
	GeocodingLookupOptions,
	ReverseGeocodingResponse
} from "./types";
import { PhotonProvider } from "./photon";
import { PeliasProvider } from "./pelias";
import { NominatimProvider } from "./nominatim";

const log = getLogger("geocode");

const config = getServerConfig();

const photon = config.photon?.url ? new PhotonProvider(config.photon) : undefined;
const pelias = config.pelias?.url ? new PeliasProvider(config.pelias) : undefined;
const nominatim = config.nominatim?.url ? new NominatimProvider(config.nominatim) : undefined;

export async function searchAddress(options: GeocodingSearchOptions): Promise<AddressData[]> {
	const provider = photon ?? pelias ?? nominatim;
	if (!provider) return [];

	try {
		return await provider.search(options);
	} catch (error) {
		log.error("Address search failed: %s", error);
		return [];
	}
}

export async function reverseGeocode(
	options: GeocodingReverseOptions
): Promise<ReverseGeocodingResponse | undefined> {
	const provider = photon ?? pelias ?? nominatim;
	if (!provider) return;

	try {
		return await provider.reverse(options);
	} catch (error) {
		log.warning("Reverse geocoding failed: %s", error);
	}
}

export async function lookupGeometry(
	options: GeocodingLookupOptions
): Promise<Geometry | undefined> {
	const provider = nominatim;
	if (!provider) return;

	try {
		return await provider.lookup(options);
	} catch (error) {
		log.warning("Geometry lookup failed: %s", error);
	}
}
