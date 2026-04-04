import type { Point } from "geojson";
import type { BaseFilterset, FiltersetModifiers } from "@/lib/features/filters/filtersets";
import { getIcon } from "@/lib/features/filters/icons";
import {
	MODIFIER_BACKGROUND_OPACITY,
	MODIFIER_GLOW_OPACITY,
	MODIFIER_GLOW_RADIUS
} from "@/lib/features/filters/modifierPresets";
import {
	getModifierOverlayIconUrl,
	getModifierOverlayImageSize,
	getEmojiImageUrl,
	BADGE_SCALE_RATIO,
	getBadgeOffset
} from "@/lib/map/render/modifierOverlayIcons";
import { type MapObjectFeature, getIconFeature } from "./featureBuilders";

/**
 * MapLibre multiplies icon-offset by icon-size to get pixel offset.
 * Overlays (glow/background) have a larger imageSize than the icon,
 * so we must scale their offset inversely to keep them centered on the icon.
 */
function scaleOffsetForSize(offset: number[], iconSize: number, overlaySize: number): number[] {
	if (overlaySize === 0 || iconSize === overlaySize) return offset;
	const ratio = iconSize / overlaySize;
	return [offset[0] * ratio, offset[1] * ratio];
}

export function addModifierOverlayFeatures(
	subFeatures: MapObjectFeature[],
	mapFeatureId: string,
	mapId: string,
	coordinates: Point["coordinates"],
	selectedScale: number,
	imageSize: number,
	filtersetModifiers: FiltersetModifiers | undefined,
	imageOffset: number[] = [0, 0],
	imageRotation?: number
) {
	if (!filtersetModifiers) return;

	if (filtersetModifiers.background) {
		const bgSize = getModifierOverlayImageSize(imageSize, 1.1);
		subFeatures.push(
			getIconFeature(`${mapFeatureId}-background`, coordinates, {
				id: mapId,
				imageUrl: getModifierOverlayIconUrl(
					"background",
					filtersetModifiers.background.color,
					filtersetModifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY
				),
				imageSize: bgSize,
				selectedScale,
				imageOffset: scaleOffsetForSize(imageOffset, imageSize, bgSize),
				...(imageRotation !== undefined && { imageRotation }),
				isUnderlay: true,
				expires: null
			})
		);
	}

	if (filtersetModifiers.glow) {
		const glowSize = getModifierOverlayImageSize(
			imageSize,
			filtersetModifiers.glow.radius ?? MODIFIER_GLOW_RADIUS
		);
		subFeatures.push(
			getIconFeature(`${mapFeatureId}-glow`, coordinates, {
				id: mapId,
				imageUrl: getModifierOverlayIconUrl(
					"glow",
					filtersetModifiers.glow.color,
					filtersetModifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY
				),
				imageSize: glowSize,
				selectedScale,
				imageOffset: scaleOffsetForSize(imageOffset, imageSize, glowSize),
				...(imageRotation !== undefined && { imageRotation }),
				isUnderlay: true,
				expires: null
			})
		);
	}
}

export function resolveFiltersetBadgeIconUrl(icon: BaseFilterset["icon"]): string | undefined {
	if (icon.uicon) {
		return getIcon(icon.uicon.category, icon.uicon.params);
	}
	if (icon.emoji) {
		return getEmojiImageUrl(icon.emoji);
	}
	return undefined;
}

export function getTextLabel(
	filtersetModifiers: FiltersetModifiers | undefined
): string | undefined {
	if (!filtersetModifiers?.showLabel) return undefined;
	return filtersetModifiers.showLabel;
}

export function addFiltersetBadgeFeature(
	subFeatures: MapObjectFeature[],
	featureId: string,
	mapId: string,
	coordinates: Point["coordinates"],
	filtersetModifiers: FiltersetModifiers | undefined,
	filtersetIcon: BaseFilterset["icon"] | undefined,
	imageSize: number,
	selectedScale: number,
	modifiers: { offsetX: number; offsetY: number },
	expires: number | null
) {
	if (!filtersetModifiers?.showBadge || !filtersetIcon) return;
	const badgeUrl = resolveFiltersetBadgeIconUrl(filtersetIcon);
	if (!badgeUrl) return;

	subFeatures.push(
		getIconFeature(featureId, coordinates, {
			imageUrl: badgeUrl,
			id: mapId,
			imageSize: imageSize * BADGE_SCALE_RATIO,
			selectedScale: selectedScale,
			imageOffset: getBadgeOffset(modifiers.offsetX, modifiers.offsetY),
			isAttachedBadge: true,
			expires
		})
	);
}

export function addOverlayIconAndBadge(
	subFeatures: MapObjectFeature[],
	featureId: string,
	mapId: string,
	coordinates: Point["coordinates"],
	{
		imageUrl,
		imageSize,
		selectedScale,
		imageOffset,
		imageRotation,
		textLabel,
		expires,
		filtersetModifiers,
		filtersetIcon,
		renderStateKey,
		overlayImageOffset
	}: {
		imageUrl: string;
		imageSize: number;
		selectedScale: number;
		imageOffset: number[];
		imageRotation?: number;
		textLabel?: string;
		expires: number | null;
		filtersetModifiers: FiltersetModifiers | undefined;
		filtersetIcon: BaseFilterset["icon"] | undefined;
		renderStateKey?: string;
		/** When set, glow/background/badge anchor to this offset instead of the icon's offset. */
		overlayImageOffset?: number[];
	}
) {
	const effectiveOverlayOffset = overlayImageOffset ?? imageOffset;
	const overlayFeatures: MapObjectFeature[] = [];

	const TEXT_SIZE = 11;
	const textOffset =
		textLabel !== undefined ? [0, 2.2 + effectiveOverlayOffset[1] / TEXT_SIZE] : undefined;

	addFiltersetBadgeFeature(
		subFeatures,
		`${featureId}-badge`,
		mapId,
		coordinates,
		filtersetModifiers,
		filtersetIcon,
		imageSize,
		selectedScale,
		{ offsetX: effectiveOverlayOffset[0], offsetY: effectiveOverlayOffset[1] },
		expires
	);

	subFeatures.push(
		getIconFeature(featureId, coordinates, {
			imageUrl,
			id: mapId,
			imageSize,
			selectedScale,
			imageOffset,
			...(imageRotation !== undefined && { imageRotation }),
			...(textLabel !== undefined && { textLabel }),
			...(textOffset !== undefined && { textOffset }),
			...(renderStateKey !== undefined && { renderStateKey }),
			expires
		})
	);

	addModifierOverlayFeatures(
		overlayFeatures,
		featureId,
		mapId,
		coordinates,
		selectedScale,
		imageSize,
		filtersetModifiers,
		effectiveOverlayOffset,
		imageRotation
	);

	subFeatures.push(...overlayFeatures);
}

// QuestReward is a wide discriminated union — keep loose typing to avoid narrowing at each call site
export function getRewardIconInfo(reward: { info: { [key: string]: any } }) {
	return {
		item_id: reward.info.item_id,
		pokemon_id: reward.info.pokemon_id,
		form: reward.info.form ?? reward.info.form_id ?? undefined,
		amount: reward.info.amount
	};
}

export function getFiltersetModifierStateKey(filtersetModifiers: FiltersetModifiers | undefined) {
	if (!filtersetModifiers) return "";

	return JSON.stringify({
		backgroundColor: filtersetModifiers.background?.color ?? null,
		backgroundOpacity: filtersetModifiers.background?.opacity ?? null,
		glowColor: filtersetModifiers.glow?.color ?? null,
		glowOpacity: filtersetModifiers.glow?.opacity ?? null,
		glowRadius: filtersetModifiers.glow?.radius ?? null,
		rotation: filtersetModifiers.rotation ?? null,
		scale: filtersetModifiers.scale ?? null,
		showBadge: filtersetModifiers.showBadge ?? null,
		showLabel: filtersetModifiers.showLabel ?? null
	});
}
