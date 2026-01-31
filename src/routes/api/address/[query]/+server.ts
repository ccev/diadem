import { error, json } from "@sveltejs/kit";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { FeatureCollection, Point } from "geojson";
import { getServerLogger } from "@/lib/server/logging";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("nominatim");

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

export async function GET({ params, url }) {
	const config = getServerConfig();
	if (!config.nominatim) {
		log.warning("Nominatim was called, but is not configured");
		error(404);
	}

	const lang = url.searchParams.get("lang") ?? "en";

	const nomiUrl =
		config.nominatim.url +
		"search" +
		"?format=geocodejson" +
		"&addressdetails=1" +
		"&layer=address" +
		"&limit=3" +
		"&accept-language=" +
		lang +
		"&q=" +
		params.query;

	const headers: { [key: string]: string } = {
		"Content-Type": "application/json"
	};
	if (config.nominatim.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(config.nominatim.basicAuth)}`;
	}

	const response = await fetch(nomiUrl, {
		method: "GET",
		headers,
		signal: AbortSignal.timeout(2000)
	});

	if (!response.ok) {
		log.error("Nominatim request failed: %s", await response.text());
		error(500);
	}

	log.info("Succcessfully serving address search results");

	const data: FeatureCollection<Point, NominatimProps> = await response.json();

	return json(
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
				id: props.place_id,
				center: f.geometry.coordinates
			};
		}) ?? []
	);
}
