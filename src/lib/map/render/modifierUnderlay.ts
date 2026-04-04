import type { FiltersetModifiers } from "@/lib/features/filters/filtersets";
import {
	MODIFIER_BACKGROUND_OPACITY,
	MODIFIER_GLOW_OPACITY
} from "@/lib/features/filters/modifierPresets";
import type { MapObjectIconProperties } from "@/lib/map/render/featureTypes";

export type UnderlayProperties =
	| "imageUrl"
	| "imageId"
	| "imageOffset"
	| "imageSize"
	| "isModifierUnderlay";

const UNDERLAY_ICON_SIZE = 64;
const underlayImageCache = new Map<string, string>();

export function getUnderlayFeature(
	imageSize: number,
	offset: [number, number],
	filtersetModifiers: FiltersetModifiers | undefined
): Pick<MapObjectIconProperties, UnderlayProperties> | undefined {
	if (!filtersetModifiers?.background && !filtersetModifiers?.glow) return;

	if (filtersetModifiers?.background) {
		const scale = 1.2;
		const opacity = filtersetModifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY;
		const color = filtersetModifiers.background.color.replace("{}", opacity.toString());
		const imageId = `bg-${color}`;

		return {
			imageId,
			imageUrl: getUnderlayImage(
				imageId,
				"background",
				filtersetModifiers.background.color,
				opacity
			),
			imageSize: imageSize * scale,
			imageOffset: [offset[0] / scale, offset[1] / scale],
			isModifierUnderlay: true
		};
	}

	if (filtersetModifiers?.glow) {
		const scale = 1.6;
		const opacity = filtersetModifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY;
		const color = filtersetModifiers.glow.color.replace("{}", opacity.toString());
		const imageId = `bg-${color}`;

		return {
			imageId,
			imageUrl: getUnderlayImage(imageId, "glow", filtersetModifiers.glow.color, opacity),
			imageSize: imageSize * scale,
			imageOffset: [offset[0] / scale, offset[1] / scale],
			isModifierUnderlay: true
		};
	}
}

function getUnderlayImage(
	key: string,
	kind: "background" | "glow",
	color: string,
	opacity: number
) {
	const cached = underlayImageCache.get(key);
	if (cached) return cached;

	const canvas = document.createElement("canvas");
	canvas.width = UNDERLAY_ICON_SIZE;
	canvas.height = UNDERLAY_ICON_SIZE;

	const context = canvas.getContext("2d");
	if (!context) return "";

	const center = UNDERLAY_ICON_SIZE / 2;
	const radius = UNDERLAY_ICON_SIZE / 2 - 4;

	context.clearRect(0, 0, UNDERLAY_ICON_SIZE, UNDERLAY_ICON_SIZE);

	if (kind === "background") {
		context.fillStyle = color.replace("{}", opacity.toString());
		context.beginPath();
		context.arc(center, center, radius, 0, Math.PI * 2);
		context.fill();
	} else if (kind === "glow") {
		const gradient = context.createRadialGradient(center, center, 0, center, center, radius);
		gradient.addColorStop(0, color.replace("{}", opacity.toString()));
		gradient.addColorStop(0.55, color.replace("{}", (opacity * 0.7).toString()));
		gradient.addColorStop(1, color.replace("{}", "0"));

		context.fillStyle = gradient;
		context.beginPath();
		context.arc(center, center, radius, 0, Math.PI * 2);
		context.fill();
	}

	const url = canvas.toDataURL("image/png");
	underlayImageCache.set(key, url);
	return url;
}
