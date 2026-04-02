import { error } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import sharp, { type ResizeOptions } from "sharp";
import { getServerLogger } from "@/lib/server/logging";
import { ALLOWED_FORMATS, ALLOWED_WIDTHS } from "@/lib/services/assets";
import { getLogger } from "@/lib/utils/logger";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";

const log = getLogger("uicons");

export async function GET({ params, fetch, url }) {
	const start = performance.now();
	const config = getClientConfig();

	const width = url.searchParams.get("w");
	const formatParam = url.searchParams.get("format");
	const iconSetId = params.iconset;
	const iconPath = params.path;

	if (width && !ALLOWED_WIDTHS.includes(width)) {
		error(401, "Invalid width");
	}

	let format: (typeof ALLOWED_FORMATS)[number] = "webp";
	if (formatParam && ALLOWED_FORMATS.includes(formatParam as typeof format)) {
		format = formatParam as typeof format;
	}

	const iconSet = config.uiconSets.find((s) => s.id === iconSetId);
	if (!iconSet) {
		error(404, "Unknown Icon Set");
	}

	const iconUrl = iconSet.url + "/" + iconPath;

	try {
		const res = await fetch(iconUrl);
		if (!res.ok) {
			error(500, "Fetching image failed");
		}
		const fetchDone = performance.now();

		let sharpImage = sharp(Buffer.from(await res.arrayBuffer()));
		if (width) {
			sharpImage = sharpImage.resize({
				width: Number(width),
				withoutEnlargement: false
			});
		}

		if (format === "webp") {
			sharpImage = sharpImage.webp();
		} else if (format === "png") {
			sharpImage = sharpImage.png();
		}

		log.info(
			"[%s] Serving icon %s (width=%s) / fetch: %fms + optimizing: %fms",
			iconSetId,
			iconPath,
			width ?? "oiginal",
			(fetchDone - start).toFixed(),
			(performance.now() - fetchDone).toFixed(1)
		);

		return new Response(await sharpImage.toBuffer(), {
			headers: {
				...cacheHttpHeaders(),
				"Content-Type": "image/" + format
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
