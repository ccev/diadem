import type { AddressData } from "@/lib/features/geocoding";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import addressFormatter from "@fragaria/address-formatter";
import type { FeatureCollection, Geometry, Point } from "geojson";

const log = getLogger("addrsearch");

type NominatimProps = {
	geocoding: {
		name?: string;
		city?: string;
		country?: string;
		street?: string;
		housenumber?: string;
		osm_id: number;
		osm_type: string;
	};
};

type PhotonProps = {
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
	[key: string]: any;
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
	} else if (config.nominatim && config.nominatim.url) {
		return await nominatimSearchAddress(query, language);
	}

	return [];
}

export async function lookupGeometry(osmId: string) {
	if (getServerConfig().nominatim?.url) {
		return await nominatimLookupGeometry(osmId);
	}

	return undefined;
}

export async function reverseGeocode(
	latitude: number,
	longitude: number
): Promise<string | undefined> {
	const config = getServerConfig();

	try {
		if (config.photon?.url) {
			const response = await fetch(
				`${config.photon.url}reverse?lat=${latitude}&lon=${longitude}&limit=1`,
				{ signal: AbortSignal.timeout(2000) }
			);
			const props = (await response.json())?.features?.[0]?.properties as PhotonProps | undefined;
			return (
				[props?.name, props?.street, props?.city, props?.country].filter(Boolean).join(", ") ||
				undefined
			);
		}

		if (config.pelias?.url) {
			const response = await fetch(
				`${config.pelias.url}v1/reverse?point.lat=${latitude}&point.lon=${longitude}`,
				{ signal: AbortSignal.timeout(2000) }
			);
			return (await response.json())?.features?.[0]?.properties?.label;
		}

		if (config.nominatim?.url) {
			const response = await nominatimRequest(
				`${config.nominatim.url}reverse?format=geocodejson&lat=${latitude}&lon=${longitude}`
			);
			const props = (await response?.json())?.features?.[0]?.properties?.geocoding as
				| NominatimProps["geocoding"]
				| undefined;
			return (
				[props?.name, props?.street, props?.housenumber, props?.city, props?.country]
					.filter(Boolean)
					.join(", ") || undefined
			);
		}
	} catch (error) {
		log.warning("Reverse geocoding failed: %s", error);
	}
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
		url += "&zoom=" + zoom;
	}

	if (config.hasGeometries) {
		url += "&geometry=true";
	}

	const headers: HeadersInit = {};
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

			const data: AddressData = {
				name: label,
				id: `${p.osm_type}${p.osm_id}`,
				center: f.geometry.coordinates,
				bbox: p.extent
			};

			if (f.geometry.type !== "Point") {
				data.geometry = f.geometry;
			}

			return data;
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

	const headers: HeadersInit = {};
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
				bbox: f.bbox,
				geometry: f?.geometry
			};
		}) ?? []
	);
}

async function nominatimRequest(url: string) {
	const config = getServerConfig().nominatim;
	if (!config || !config.url) return;

	const headers: { [key: string]: string } = {
		"Content-Type": "application/json"
	};
	if (config.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(config.basicAuth)}`;
	}
	if (config.userAgent) {
		headers["User-Agent"] = config.userAgent;
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

async function nominatimSearchAddress(query: string, language: string): Promise<AddressData[]> {
	const config = getServerConfig().nominatim;
	if (!config || !config.url) return [];

	const nomiUrl =
		config.url +
		"search" +
		"?format=geocodejson" +
		"&addressdetails=1" +
		"&polygon_geojson=1" +
		"&limit=3" +
		"&accept-language=" +
		language +
		"&q=" +
		query;

	const response = await nominatimRequest(nomiUrl);
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

			const data: AddressData = {
				name,
				id: `${props.osm_type[0]}${props.osm_id}`,
				center: f.geometry.coordinates,
				bbox: f.bbox
			};

			if (f.geometry.type !== "Point") {
				data.geometry = f.geometry;
			}

			return data;
		}) ?? []
	);
}

async function nominatimLookupGeometry(osmId: string): Promise<Geometry | undefined> {
	const config = getServerConfig().nominatim;
	if (!config || !config.url) return;

	const url = config.url + "lookup?format=geojson&polygon_geojson=1&osm_ids=" + osmId;
	const response = await nominatimRequest(url);
	if (!response) return;

	const featureCollection = (await response.json()) as FeatureCollection;

	return featureCollection.features[0]?.geometry;
}
