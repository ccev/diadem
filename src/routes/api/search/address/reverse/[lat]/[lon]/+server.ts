import { reverseAddress } from "@/lib/services/geocoding.server";
import { json } from "@sveltejs/kit";

export async function GET({ params, url }) {
	const lat = Number(params.lat);
	const lon = Number(params.lon);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
		return json({ error: "Invalid coordinates" }, { status: 400 });
	}
	const lang = url.searchParams.get("lang") ?? "en";
	const address = await reverseAddress(lat, lon, lang);
	return json({ address });
}
