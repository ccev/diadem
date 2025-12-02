import { error } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import sharp, { type ResizeOptions } from "sharp";

const CACHE_AGE = 86400 * 7  // 7 days

export async function GET({ params, fetch, url }) {
	const config = getClientConfig();

	const width = url.searchParams.get("w");
	const iconSetId = params.iconset;
	const iconPath = params.path;

	const iconSet = config.uiconSets.find((s) => s.id === iconSetId);
	if (!iconSet) {
		error(404, "Unknown Icon Set");
	}

	const iconUrl = iconSet.url + "/" + iconPath;

	const resizeOptions: ResizeOptions = {};
	if (width) {
		resizeOptions.width = Number(width);
		resizeOptions.withoutEnlargement = false;
	}

	try {
		const res = await fetch(iconUrl);
		if (!res.ok) {
			error(500, "Fetching image failed");
		}

		const buffer = Buffer.from(await res.arrayBuffer());

		const webp = await sharp(buffer).resize(resizeOptions).webp({ quality: 80 }).toBuffer();

		return new Response(webp, {
			headers: {
				"Content-Type": "image/webp",
				"Cache-Control": `public, max-age=${CACHE_AGE}`
			}
		});
	} catch (err) {
		console.error(err);
		return new Response("error processing image", { status: 500 });
	}
}
