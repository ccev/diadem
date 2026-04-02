import type { FeatureCollection, Point } from "geojson";
import type { FiltersetModifiers } from "@/lib/features/filters/filtersets";
import { withVisualTransform } from "@/lib/map/modifierLayout";
import { BADGE_SCALE_RATIO, getBadgeOffset } from "@/lib/map/modifierOverlayIcons";
import {
	type MapObjectIconFeature,
	type MapObjectFeature,
	getIconFeature
} from "./render/featureBuilders";
import { addModifierOverlayFeatures, getTextLabel } from "./render/modifierFeatures";

type ModifierPreviewFeatureCollectionArgs = {
	center: Point["coordinates"];
	focusIconUrl: string;
	focusBaseImageSize: number;
	focusImageOffset: number[];
	modifiers?: FiltersetModifiers;
	badgeIconUrl?: string;
	baseIconUrl?: string;
	baseImageSize?: number;
	baseImageOffset?: number[];
};

const PREVIEW_MAP_ID = "preview";

export function buildModifierPreviewFeatureCollection({
	center,
	focusIconUrl,
	focusBaseImageSize,
	focusImageOffset,
	modifiers,
	badgeIconUrl,
	baseIconUrl,
	baseImageSize,
	baseImageOffset
}: ModifierPreviewFeatureCollectionArgs): FeatureCollection<Point> {
	const subFeatures: MapObjectFeature[] = [];
	const hasBase = baseIconUrl && baseImageSize !== undefined && baseImageOffset;

	// Determine the anchor point: base icon center for composites, focus icon for simple
	const anchorSize = hasBase ? baseImageSize : focusBaseImageSize;
	const anchorOffset = hasBase ? baseImageOffset : focusImageOffset;

	const visual = withVisualTransform(anchorSize, modifiers);

	// Overlay features (background/glow) centered on anchor
	addModifierOverlayFeatures(
		subFeatures,
		PREVIEW_MAP_ID,
		PREVIEW_MAP_ID,
		center,
		1,
		visual.imageSize,
		modifiers,
		anchorOffset
	);

	// Base icon (composites only)
	if (hasBase) {
		subFeatures.push(
			getIconFeature(`${PREVIEW_MAP_ID}-base`, center, {
				id: PREVIEW_MAP_ID,
				imageUrl: baseIconUrl,
				imageSize: visual.imageSize,
				selectedScale: 1,
				imageOffset: baseImageOffset,
				...(visual.imageRotation !== undefined && { imageRotation: visual.imageRotation }),
				expires: null
			})
		);
	}

	// Focus icon
	const focusVisual = hasBase
		? withVisualTransform(focusBaseImageSize, modifiers)
		: visual;

	subFeatures.push(
		getIconFeature(`${PREVIEW_MAP_ID}-focus`, center, {
			id: PREVIEW_MAP_ID,
			imageUrl: focusIconUrl,
			imageSize: focusVisual.imageSize,
			selectedScale: 1,
			imageOffset: focusImageOffset,
			...(focusVisual.imageRotation !== undefined && {
				imageRotation: focusVisual.imageRotation
			}),
			textLabel: getTextLabel(modifiers),
			expires: null
		})
	);

	// Badge
	if (modifiers?.showBadge && badgeIconUrl) {
		subFeatures.push(
			getIconFeature(`${PREVIEW_MAP_ID}-badge`, center, {
				id: PREVIEW_MAP_ID,
				imageUrl: badgeIconUrl,
				imageSize: visual.imageSize * BADGE_SCALE_RATIO,
				selectedScale: 1,
				imageOffset: getBadgeOffset(anchorOffset[0], anchorOffset[1]),
				isAttachedBadge: true,
				expires: null
			})
		);
	}

	return {
		type: "FeatureCollection" as const,
		features: subFeatures as MapObjectIconFeature[]
	};
}
