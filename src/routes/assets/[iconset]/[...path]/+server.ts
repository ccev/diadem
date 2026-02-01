import { error } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import sharp, { type ResizeOptions } from "sharp";
import { getServerLogger } from "@/lib/server/logging";
import { ALLOWED_WIDTHS } from "@/lib/services/assets";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("uicons");
const CACHE_AGE = 86400 * 7; // 7 days

export async function GET({ params, fetch, url }) {
	const start = performance.now();
	const config = getClientConfig();

	const width = url.searchParams.get("w");
	const iconSetId = params.iconset;
	const iconPath = params.path;

	if (width && !ALLOWED_WIDTHS.includes(width)) {
		error(401, "Invalid width");
	}

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
		const fetchDone = performance.now();

		const buffer = Buffer.from(await res.arrayBuffer());

		const webp = await sharp(buffer).resize(resizeOptions).webp({ quality: 80 }).toBuffer();

		log.info(
			"[%s] Serving icon %s (width=%s) / fetch: %fms + optimizing: %fms",
			iconSetId,
			iconPath,
			width ?? "oiginal",
			(fetchDone - start).toFixed(),
			(performance.now() - fetchDone).toFixed(1)
		);

		return new Response(webp, {
			headers: {
				"Content-Type": "image/webp",
				"Cache-Control": `public, max-age=${CACHE_AGE}`
			}
		});
	} catch (err) {
		log.error(
			"[%s] Processing uicon %s (width=%s) failed: %s",
			iconSetId,
			iconPath,
			width ?? "original",
			err
		);
		return new Response("error processing image", { status: 500 });
	}
}
