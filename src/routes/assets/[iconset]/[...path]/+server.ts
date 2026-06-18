import { ALLOWED_FORMATS, ALLOWED_WIDTHS } from "@/lib/services/assets";
import { getClientConfig } from "@/lib/services/config/config.server";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import sharp from "sharp";

const log = getLogger("uicons");

export async function GET({ params, fetch, url }) {
	const start = performance.now();
	const config = getClientConfig();

	const width = url.searchParams.get("w");
	const squareParam = url.searchParams.get("square");
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

		const inputBuffer = Buffer.from(await res.arrayBuffer());
		let sharpImage = sharp(inputBuffer);
		if (squareParam) {
			// Pad to a centered square at the original largest dimension.
			const meta = await sharp(inputBuffer).metadata();
			const size = Math.max(meta.width ?? 0, meta.height ?? 0);
			if (size > 0) {
				sharpImage = sharpImage.resize({
					width: size,
					height: size,
					fit: "contain",
					background: { r: 0, g: 0, b: 0, alpha: 0 }
				});
			}
		} else if (width) {
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
