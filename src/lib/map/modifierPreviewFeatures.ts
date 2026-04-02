import type { FeatureCollection, Point } from "geojson";
import type { FiltersetModifiers } from "@/lib/features/filters/filtersets";
import { withVisualTransform } from "@/lib/map/modifierLayout";
import { BADGE_SCALE_RATIO, getBadgeOffset } from "@/lib/map/modifierOverlayIcons";
import {
	type MapObjectIconFeature,
	type MapObjectFeature,
	getIconFeature
} from "./render/featureBuilders";
import { addOverlayIconAndBadge, getTextLabel } from "./render/modifierFeatures";

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
	/** When true, glow/background/badge anchor on the base icon (e.g. raids, max battles). */
	overlayOnBase?: boolean;
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
	baseImageOffset,
	overlayOnBase = false
}: ModifierPreviewFeatureCollectionArgs): FeatureCollection<Point> {
	const subFeatures: MapObjectFeature[] = [];
	const hasBase = baseIconUrl && baseImageSize !== undefined && baseImageOffset;

	const focusVisual = withVisualTransform(focusBaseImageSize, modifiers);

	// For overlayOnBase composites (raids, max battles), anchor overlays on the base icon.
	// For quests/invasions/pokemon, anchor overlays on the focus icon.
	const overlayOffset = hasBase && overlayOnBase ? baseImageOffset : undefined;

	if (modifiers?.showBadge && badgeIconUrl) {
		const badgeAnchorOffset = overlayOffset ?? focusImageOffset;
		subFeatures.push(
			getIconFeature(`${PREVIEW_MAP_ID}-badge`, center, {
				id: PREVIEW_MAP_ID,
				imageUrl: badgeIconUrl,
				imageSize: focusVisual.imageSize * BADGE_SCALE_RATIO,
				selectedScale: 1,
				imageOffset: getBadgeOffset(badgeAnchorOffset[0], badgeAnchorOffset[1]),
				isAttachedBadge: true,
				expires: null
			})
		);
	}

	// Focus icon with overlay features (glow/background) — uses same helper as main map
	addOverlayIconAndBadge(subFeatures, `${PREVIEW_MAP_ID}-focus`, PREVIEW_MAP_ID, center, {
		imageUrl: focusIconUrl,
		imageSize: focusVisual.imageSize,
		selectedScale: 1,
		imageOffset: focusImageOffset,
		imageRotation: focusVisual.imageRotation,
		textLabel: getTextLabel(modifiers),
		expires: null,
		filtersetModifiers: modifiers,
		filtersetIcon: undefined,
		overlayImageOffset: overlayOffset
	});

	// Base icon (composites only, renders behind focus) — no rotation/scale from filterset
	if (hasBase) {
		subFeatures.push(
			getIconFeature(`${PREVIEW_MAP_ID}-base`, center, {
				id: PREVIEW_MAP_ID,
				imageUrl: baseIconUrl,
				imageSize: baseImageSize,
				selectedScale: 1,
				imageOffset: baseImageOffset,
				expires: null
			})
		);
	}

	return {
		type: "FeatureCollection" as const,
		features: subFeatures as MapObjectIconFeature[]
	};
}
