import type { Feature, FeatureCollection, Point } from "geojson";
import { destination, point } from "@turf/turf";
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
	companionIconUrls: string[];
	companionImageSize: number;
	companionImageOffset: number[];
};

const companionPositions = [
	{ bearing: 295, distanceMeters: 24 },
	{ bearing: 80, distanceMeters: 22 },
	{ bearing: 220, distanceMeters: 15 }
] as const;

function getPreviewFeature(marker: PreviewMarker): Feature<Point, ModifierPreviewFeatureProperties> {
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
			})
		}
	};
}

function getCompanionCoordinates(center: Point["coordinates"], bearing: number, distanceMeters: number) {
	return destination(point(center), distanceMeters / 1000, bearing).geometry.coordinates as Point["coordinates"];
}

export function buildModifierPreviewFeatureCollection({
	center,
	focusIconUrl,
	focusBaseImageSize,
	focusImageOffset,
	modifiers,
	badgeIconUrl,
	companionIconUrls,
	companionImageSize,
	companionImageOffset
}: ModifierPreviewFeatureCollectionArgs): FeatureCollection<Point, ModifierPreviewFeatureProperties> {
	const features: Feature<Point, ModifierPreviewFeatureProperties>[] = [];
	const focusImageSize = focusBaseImageSize * (modifiers?.scale ?? 1);

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
			imageRotation: modifiers?.rotation ?? undefined,
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

	for (const [index, imageUrl] of companionIconUrls.entries()) {
		const companionPosition = companionPositions[index];
		if (!companionPosition) break;

		features.push(
			getPreviewFeature({
				coordinates: getCompanionCoordinates(
					center,
					companionPosition.bearing,
					companionPosition.distanceMeters
				),
				imageUrl,
				imageSize: companionImageSize,
				imageOffset: companionImageOffset,
				layer: "icon"
			})
		);
	}

	return {
		type: "FeatureCollection",
		features
	};
}
