import { respond } from "$lib/server/api/respond";
import { reverseGeocode } from "$lib/services/geocoding";
import { getClientConfig } from "$lib/services/config/config.server";
import { cacheHttpHeaders } from "$lib/utils/apiUtils.server";
import addressFormatter from "@fragaria/address-formatter";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
	const latParam = url.searchParams.get("lat");
	const lonParam = url.searchParams.get("lon");
	const lat = latParam === null ? NaN : Number(latParam);
	const lon = lonParam === null ? NaN : Number(lonParam);
	if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
		error(400);
	}

	const language = url.searchParams.get("lang") ?? getClientConfig().general.defaultLocale;
	const result = await reverseGeocode({ lat, lon, language });
	if (!result) return respond(request, {}, { headers: cacheHttpHeaders(3600) });

	const parts = addressFormatter.format(
		{
			road: result.street,
			houseNumber: result.housenumber,
			neighbourhood: result.district,
			city: result.city,
			state: result.state,
			postcode: result.postcode,
			country: result.country,
			countryCode: result.countrycode
		},
		{
			abbreviate: false,
			cleanupPostcode: true,
			countryCode: result.countrycode,
			output: "array"
		}
	);

	return respond(
		request,
		{ address: parts.join(", ") || undefined },
		{ headers: cacheHttpHeaders(86400) }
	);
};
