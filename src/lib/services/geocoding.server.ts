import { getServerConfig } from "@/lib/services/config/config.server";
import type { AddressData } from "@/lib/features/geocoding";
import { error } from "@sveltejs/kit";
import { getLogger } from "@/lib/utils/logger";
import type { FeatureCollection, Point } from "geojson";
import addressFormatter from "@fragaria/address-formatter"

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

type PhotonProps = {
	osm_id: number;
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
	extent: [number, number, number, number]
	[key: string]: any
};

type PeliasProps = {
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
	if (config.photon && config.photon.url) {
		return await photonSearchAddress(query, language, lat, lon, null);
	} else if (config.pelias && config.pelias.url) {
		return await peliasSearchAddress(query, language, lat, lon);
	}  else if (config.nominatim && config.nominatim.url) {
		return await nominatimSearchAddress(query, language);
	}

	return [];
}

async function photonSearchAddress(
	query: string,
	language: string,
	lat: string | null,
	lon: string | null,
	zoom: number | null
): Promise<AddressData[]> {
	const config = getServerConfig().photon;
	if (!config || !config.url) return [];

	let url = config.url + `api?lang=${language}&q=${query}&limit=5`;

	if (lat && lon) {
		url += "&lat=" + lat + "&lon=" + lon;
	}

	if (zoom) {
		url += "&zoom=" + zoom
	}

	const headers: HeadersInit = {}
	if (config.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(config.basicAuth)}`;
	}

	const response = await fetch(url, {
		method: "GET",
		signal: AbortSignal.timeout(2000),
		headers
	});

	if (!response.ok) {
		log.error("Photon request failed [%d] %s", response.status, await response.text());
		return [];
	}

	const data: FeatureCollection<Point, PhotonProps> = await response.json();

	for (const f of data.features) {
		log.info(
			addressFormatter.format(f.properties, {
				abbreviate: true,
				countryCode: f.properties.countrycode,
				output: "array"
			})[1]
		);
	}

	return (
		data?.features?.map((f) => {
			const p = f.properties

			if (p.name && p.type) {
				p[p.type] = p.name
			}

			const formattedAddressParts = addressFormatter.format(
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

			const label =
				formattedAddressParts.length > 2
					? formattedAddressParts.slice(0, -1).join(", ")
					: formattedAddressParts.join(", ");

			return {
				name: label,
				id: p.osm_id,
				center: f.geometry.coordinates,
				bbox: p.extent
			};
		}) ?? []
	);
}

async function peliasSearchAddress(
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

	const headers: HeadersInit = {}
	if (config.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(config.basicAuth)}`;
	}

	const response = await fetch(url, {
		method: "GET",
		signal: AbortSignal.timeout(2000),
		headers
	});

	if (!response.ok) {
		log.error("Pelias request failed [%d] %s", response.status, await response.text());
		return [];
	}

	const data: FeatureCollection<Point, PeliasProps> = await response.json();

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
