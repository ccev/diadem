import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { getDefaultMapStyle } from "@/lib/services/themeMode";
import type { Coords } from "@/lib/utils/coordinates";
import { getIconForMap } from "@/lib/services/uicons.svelte";
import { resize } from "@/lib/services/assets";
import { getDefaultIconSet } from "@/lib/services/userSettings.svelte";
import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { UiconSetModifierType } from "@/lib/services/config/configTypes";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import sharp from "sharp";

const log = getLogger("thumbnail");

async function fetchWrapper(responsePromise: Promise<Response>, resize: boolean = false) {
	try {
		const response = await responsePromise;

		if (!response.ok) {
			log.error(
				"Image request failed [%s]: %d %s",
				response.url,
				response.status,
				await response.text()
			);
			return null;
		}

		const contentType = response.headers.get("Content-Type");
		let arrayBuffer = await response.arrayBuffer();
		const buffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
		let sharpImage = sharp(buffer);

		if (resize) {
			sharpImage = sharpImage.resize({ width: 128 });
		}

		if (contentType?.includes("png")) {
			// 1/2 static map size
			sharpImage = sharpImage.png({ compressionLevel: 9, effort: 10 });
		} else if (contentType?.includes("jpg") || contentType?.includes("jpeg")) {
			sharpImage = sharpImage.jpeg();
		}

		const sharpBuffer = await sharpImage.toBuffer();
		const base64 = sharpBuffer.toString("base64");
		return `data:${contentType};base64,${base64}`;
	} catch (e) {
		log.error("Failed to fetch image: %s", e);
		return null;
	}
}

export async function fetchStaticMapBase64(
	thisFetch: typeof fetch,
	options: {
		zoom: number;
		coords: Coords;
		width: number;
		height: number;
		data: MapData;
		iconUrl?: string;
	}
): Promise<string | null> {
	const config = getServerConfig();
	const staticMap = config.staticMap;

	if (!staticMap?.enabled || !staticMap.url) {
		return null;
	}

	const style = staticMap.style || getDefaultMapStyle("light").id;

	const iconType: UiconSetModifierType =
		options.data.type === MapObjectType.NEST ? MapObjectType.POKEMON : options.data.type;
	const iconSet = getDefaultIconSet(iconType as MapObjectType);
	const modifier = iconSet?.[iconType];
	const baseModifier = iconSet?.base;
	const scale =
		(typeof modifier === "object" ? modifier?.scale : undefined) ?? baseModifier?.scale ?? 0.25;
	const offsetX =
		(typeof modifier === "object" ? modifier?.offsetX : undefined) ?? baseModifier?.offsetX ?? 0;
	const offsetY =
		(typeof modifier === "object" ? modifier?.offsetY : undefined) ?? baseModifier?.offsetY ?? 0;

	const markerModifier = 64 * 2.5;
	const markerSize = scale * markerModifier;

	const payload: Record<string, unknown> = {
		style,
		zoom: options.zoom,
		latitude: options.coords.lat,
		longitude: options.coords.lon,
		width: options.width,
		height: options.height,
		scale: 1
	};

	if (options.iconUrl) {
		payload.markers = [
			{
				url: staticMap.diademUrl + resize(options.iconUrl, { width: 64 }),
				width: markerSize,
				height: markerSize,
				y_offset: offsetY * markerModifier,
				x_offset: offsetX * markerModifier,
				latitude: options.coords.lat,
				longitude: options.coords.lon
			}
		];
	}

	if (options.data.type === MapObjectType.NEST) {
		const nestData = options.data as NestData;
		if (nestData.polygon?.length) {
			let rings: { x: number; y: number }[][];
			if (Array.isArray(nestData.polygon[0][0])) {
				rings = (nestData.polygon as { x: number; y: number }[][][]).flat();
			} else {
				rings = nestData.polygon as { x: number; y: number }[][];
			}
			payload.polygons = rings.map((ring) => ({
				fill_color: "rgba(152,248,163,0.6)",
				stroke_color: "rgba(152,248,163,0.9)",
				stroke_width: 1,
				path: ring.map((p) => [p.y, p.x])
			}));
		}
	} else if (options.data.type === MapObjectType.SPAWNPOINT) {
		payload.circles = [
			{
				fill_color: "rgba(116,223,253,0.6)",
				stroke_color: "rgba(57,140,168,0.8)",
				stroke_width: 1,
				radius: 35,
				latitude: options.coords.lat,
				longitude: options.coords.lon
			}
		];
	}

	return await fetchWrapper(
		thisFetch(staticMap.url + "/staticmap", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(10_000)
		})
	);
}

export async function imageUrlToBase64(thisFetch: typeof fetch, url: string) {
	return await fetchWrapper(thisFetch(url + "?format=png"), true);
}
