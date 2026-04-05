import type { BaseFilterset, FiltersetModifiers } from "@/lib/features/filters/filtersets";
import { getIcon } from "@/lib/features/filters/icons";
import { type MapObjectIconProperties } from "@/lib/map/render/featureTypes";

export type BadgeProperties =
	| "imageUrl"
	| "imageId"
	| "imageOffset"
	| "imageSize"
	| "isModifierBadge";

const BADGE_SCALE_RATIO = 14 / 24;
const EMOJI_SIZE = 64;
const emojiImageCache = new Map<string, string>();

export function getBadgeFeature(
	filtersetModifiers: FiltersetModifiers | undefined,
	filtersetIcon: BaseFilterset["icon"] | undefined,
	imageSize: number,
	offset: [number, number]
) {
	if (!filtersetModifiers?.showBadge || !filtersetIcon) return;

	let imageUrl: string;
	let imageId: string;
	if (filtersetIcon.uicon) {
		imageUrl = getIcon(filtersetIcon.uicon.category, filtersetIcon.uicon.params);
		imageId = imageUrl;
	} else if (filtersetIcon.emoji) {
		imageUrl = getEmojiImageUrl(filtersetIcon.emoji);
		imageId = filtersetIcon.emoji;
	} else {
		return;
	}

	const edgeOffset = (32 * (1 - BADGE_SCALE_RATIO)) / BADGE_SCALE_RATIO;

	return {
		imageUrl,
		imageId,
		imageOffset: [
			offset[0] / BADGE_SCALE_RATIO + edgeOffset,
			offset[1] / BADGE_SCALE_RATIO + edgeOffset
		],
		imageSize: imageSize * BADGE_SCALE_RATIO,
		isModifierBadge: true
	} as Pick<MapObjectIconProperties, BadgeProperties>;
}

export function getEmojiImageUrl(emoji: string): string {
	const cached = emojiImageCache.get(emoji);
	if (cached) return cached;

	const size = EMOJI_SIZE;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext("2d");
	if (!context) return "";

	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = `${size * 0.7}px sans-serif`;
	context.fillText(emoji, size / 2, size / 2);

	const url = canvas.toDataURL("image/png");
	emojiImageCache.set(emoji, url);
	return url;
}
