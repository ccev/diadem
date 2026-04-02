import type { Feature, FeatureCollection, Point } from "geojson";
import type { FiltersetModifiers } from "@/lib/features/filters/filtersets";
import {
	MODIFIER_BACKGROUND_OPACITY,
	MODIFIER_GLOW_OPACITY,
	MODIFIER_GLOW_RADIUS
} from "@/lib/features/filters/modifierPresets";
import {
	getModifierOverlayIconUrl,
	getModifierOverlayImageSize,
	BADGE_SCALE_RATIO,
	getBadgeOffset
} from "@/lib/map/modifierOverlayIcons";

type PreviewFeatureLayer = "underlay" | "icon" | "badge";

export type ModifierPreviewFeatureProperties = {
	layer: PreviewFeatureLayer;
	imageUrl: string;
	imageSize: number;
	imageOffset?: number[];
	imageRotation?: number;
	textLabel?: string;
	selectedScale?: number;
};

type PreviewMarker = {
	coordinates: Point["coordinates"];
	imageUrl: string;
	imageSize: number;
	imageOffset: number[];
	imageRotation?: number;
	textLabel?: string;
	layer: PreviewFeatureLayer;
};

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

function getPreviewFeature(
	marker: PreviewMarker
): Feature<Point, ModifierPreviewFeatureProperties> {
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: marker.coordinates
		},
		properties: {
			layer: marker.layer,
			imageUrl: marker.imageUrl,
			imageSize: marker.imageSize,
			imageOffset: marker.imageOffset,
			...(marker.imageRotation !== undefined && {
				imageRotation: marker.imageRotation
			}),
			...(marker.textLabel !== undefined && {
				textLabel: marker.textLabel
			}),
			selectedScale: 1
		}
	};
}

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
}: ModifierPreviewFeatureCollectionArgs): FeatureCollection<
	Point,
	ModifierPreviewFeatureProperties
> {
	const features: Feature<Point, ModifierPreviewFeatureProperties>[] = [];
	const hasBase = baseIconUrl && baseImageSize !== undefined && baseImageOffset;
	const scale = modifiers?.scale ?? 1;
	const rotation = modifiers?.rotation ?? 0;

	if (hasBase) {
		// Composite mode: scale + rotation affect the whole map object as one
		// unit, pivoting around the base icon center.
		const scaledBaseSize = baseImageSize * scale;
		const scaledFocusSize = focusBaseImageSize * scale;

		if (modifiers?.background) {
			features.push(
				getPreviewFeature({
					coordinates: center,
					imageUrl: getModifierOverlayIconUrl(
						"background",
						modifiers.background.color,
						modifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY
					),
					imageSize: getModifierOverlayImageSize(scaledBaseSize, 1.1),
					imageOffset: baseImageOffset,
					imageRotation: rotation || undefined,
					layer: "underlay"
				})
			);
		}

		if (modifiers?.glow) {
			features.push(
				getPreviewFeature({
					coordinates: center,
					imageUrl: getModifierOverlayIconUrl(
						"glow",
						modifiers.glow.color,
						modifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY
					),
					imageSize: getModifierOverlayImageSize(
						scaledBaseSize,
						modifiers.glow.radius ?? MODIFIER_GLOW_RADIUS
					),
					imageOffset: baseImageOffset,
					imageRotation: rotation || undefined,
					layer: "underlay"
				})
			);
		}

		features.push(
			getPreviewFeature({
				coordinates: center,
				imageUrl: baseIconUrl,
				imageSize: scaledBaseSize,
				imageOffset: baseImageOffset,
				imageRotation: rotation || undefined,
				layer: "icon"
			})
		);

		const textLabel = modifiers?.showLabel ?? undefined;

		features.push(
			getPreviewFeature({
				coordinates: center,
				imageUrl: focusIconUrl,
				imageSize: scaledFocusSize,
				imageOffset: focusImageOffset,
				imageRotation: rotation || undefined,
				textLabel,
				layer: "icon"
			})
		);

		if (modifiers?.showBadge && badgeIconUrl) {
			features.push(
				getPreviewFeature({
					coordinates: center,
					imageUrl: badgeIconUrl,
					imageSize: scaledBaseSize * BADGE_SCALE_RATIO,
					imageOffset: getBadgeOffset(baseImageOffset[0], baseImageOffset[1]),
					layer: "badge"
				})
			);
		}
	} else {
		// Simple mode: no base icon, modifiers apply directly to the focus icon.
		const focusImageSize = focusBaseImageSize * scale;

		if (modifiers?.background) {
			features.push(
				getPreviewFeature({
					coordinates: center,
					imageUrl: getModifierOverlayIconUrl(
						"background",
						modifiers.background.color,
						modifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY
					),
					imageSize: getModifierOverlayImageSize(focusImageSize, 1.1),
					imageOffset: focusImageOffset,
					imageRotation: rotation || undefined,
					layer: "underlay"
				})
			);
		}

		if (modifiers?.glow) {
			features.push(
				getPreviewFeature({
					coordinates: center,
					imageUrl: getModifierOverlayIconUrl(
						"glow",
						modifiers.glow.color,
						modifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY
					),
					imageSize: getModifierOverlayImageSize(
						focusImageSize,
						modifiers.glow.radius ?? MODIFIER_GLOW_RADIUS
					),
					imageOffset: focusImageOffset,
					imageRotation: rotation || undefined,
					layer: "underlay"
				})
			);
		}

		const textLabel = modifiers?.showLabel ?? undefined;

		features.push(
			getPreviewFeature({
				coordinates: center,
				imageUrl: focusIconUrl,
				imageSize: focusImageSize,
				imageOffset: focusImageOffset,
				imageRotation: rotation || undefined,
				textLabel,
				layer: "icon"
			})
		);

		if (modifiers?.showBadge && badgeIconUrl) {
			features.push(
				getPreviewFeature({
					coordinates: center,
					imageUrl: badgeIconUrl,
					imageSize: focusImageSize * BADGE_SCALE_RATIO,
					imageOffset: getBadgeOffset(focusImageOffset[0], focusImageOffset[1]),
					layer: "badge"
				})
			);
		}
	}

	return {
		type: "FeatureCollection",
		features
	};
}
