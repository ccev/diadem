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
} from "@/lib/map/modifierOverlayIcons";
import { type MapObjectFeature, getIconFeature } from "./featureBuilders";

export function addModifierOverlayFeatures(
	subFeatures: MapObjectFeature[],
	mapFeatureId: string,
	mapId: string,
	coordinates: Point["coordinates"],
	selectedScale: number,
	imageSize: number,
	filtersetModifiers: FiltersetModifiers | undefined,
	imageOffset: number[] = [0, 0]
) {
	if (!filtersetModifiers) return;

	if (filtersetModifiers.background) {
		subFeatures.push(
			getIconFeature(`${mapFeatureId}-background`, coordinates, {
				id: mapId,
				imageUrl: getModifierOverlayIconUrl(
					"background",
					filtersetModifiers.background.color,
					filtersetModifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY
				),
				imageSize: getModifierOverlayImageSize(imageSize, 1.1),
				selectedScale,
				imageOffset,
				isUnderlay: true,
				expires: null
			})
		);
	}

	if (filtersetModifiers.glow) {
		subFeatures.push(
			getIconFeature(`${mapFeatureId}-glow`, coordinates, {
				id: mapId,
				imageUrl: getModifierOverlayIconUrl(
					"glow",
					filtersetModifiers.glow.color,
					filtersetModifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY
				),
				imageSize: getModifierOverlayImageSize(
					imageSize,
					filtersetModifiers.glow.radius ?? MODIFIER_GLOW_RADIUS
				),
				selectedScale,
				imageOffset,
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

export function getTextLabel(filtersetModifiers: FiltersetModifiers | undefined): string | undefined {
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
		background: filtersetModifiers.background?.color ?? null,
		glow: filtersetModifiers.glow?.color ?? null,
		rotation: filtersetModifiers.rotation ?? null,
		scale: filtersetModifiers.scale ?? null
	});
}
