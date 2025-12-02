import { error } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import sharp, { type ResizeOptions } from "sharp";

export async function GET({ params, fetch, url }) {
	const config = getClientConfig();

	const iconSetId = params.iconset;

	const iconSet = config.uiconSets.find((s) => s.id === iconSetId);
	if (!iconSet) {
		error(404, "Unknown Icon Set");
	}

	try {
		const res = await fetch(iconSet.url + "/index.json");
		if (!res.ok) {
			error(500, "Fetching index.json failed");
		}

		return new Response(res.body, {
			headers: {
				"Content-Type": "application/json"
			}
		});
	} catch (err) {
		console.error(err);
		return new Response("error serving index.json", { status: 500 });
	}
}
