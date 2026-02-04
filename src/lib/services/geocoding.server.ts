import { getServerConfig } from "@/lib/services/config/config.server";
import type { AddressData } from "@/lib/features/geocoding";
import { error } from "@sveltejs/kit";
import { getLogger } from "@/lib/utils/logger";
import type { FeatureCollection, Point } from "geojson";

const log = getLogger("addrsearch");

type NominatimProps = {
	geocoding: {
		name?: string;
		city?: string;
		country?: string;
		street?: string;
		housenumber?: string;
		place_id: number;
	};
};

type PeliaProps = {
	gid: string;
	label: string;
};

export async function searchAddress(
	query: string,
	language: string,
	lat: string | null,
	lon: string | null
): Promise<AddressData[]> {
	const config = getServerConfig();
	if (config.pelias && config.pelias.url) {
		return await peliaSearchAddress(query, language, lat, lon);
	} else if (config.nominatim && config.nominatim.url) {
		return await nominatimSearchAddress(query, language);
	}

	return [];
}

async function peliaSearchAddress(
	query: string,
	language: string,
	lat: string | null,
	lon: string | null
): Promise<AddressData[]> {
	const config = getServerConfig().pelias;
	if (!config || !config.url) return [];

	let url = config.url + `v1/autocomplete?lang=${language}&text=${query}&size=5`;

	if (lat && lon) {
		url += "&focus.point.lat=" + lat + "&focus.point.lon=" + lon;
	}

	if (config.apiKey) {
		url += "&api_key=" + config.apiKey;
	}

	const response = await fetch(url, {
		method: "GET",
		signal: AbortSignal.timeout(2000)
	});

	if (!response.ok) {
		log.error("Pelia request failed: %s", await response.text());
		return [];
	}

	const data: FeatureCollection<Point, PeliaProps> = await response.json();

	return (
		data?.features?.map((f) => {
			return {
				name: f.properties.label,
				id: f.properties.gid,
				center: f.geometry.coordinates,
				bbox: f.bbox
			};
		}) ?? []
	);
}

async function nominatimSearchAddress(query: string, language: string): Promise<AddressData[]> {
	const config = getServerConfig().nominatim;
	if (!config || !config.url) return [];

	const nomiUrl =
		config.url +
		"search" +
		"?format=geocodejson" +
		"&addressdetails=1" +
		// "&layer=address" +
		"&limit=3" +
		"&accept-language=" +
		language +
		"&q=" +
		query;

	const headers: { [key: string]: string } = {
		"Content-Type": "application/json"
	};
	if (config.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(config.basicAuth)}`;
	}

	const response = await fetch(nomiUrl, {
		method: "GET",
		headers,
		signal: AbortSignal.timeout(2000)
	});

	if (!response.ok) {
		log.error("Nominatim request failed: %s", await response.text());
		return [];
	}

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

			return {
				name,
				id: props.place_id.toString(),
				center: f.geometry.coordinates,
				bbox: f.bbox
			};
		}) ?? []
	);
}
