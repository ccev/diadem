import type { Feature as GeojsonFeature, MultiPolygon, Point } from "geojson";
import { resize } from "@/lib/services/assets";

export enum MapObjectFeatureType {
	ICON = 0,
	POLYGON = 1,
	CIRCLE = 2
}

export type MapObjectIconProperties = {
	id: string;
	type: MapObjectFeatureType.ICON;
	imageUrl: string;
	imageSize: number;
	selectedScale: number;
	imageOffset?: number[];
	imageRotation?: number;
	isUnderlay?: boolean;
	isAttachedBadge?: boolean;
	textLabel?: string;
	textOffset?: number[];
	renderStateKey?: string;
	expires: number | null;
};

export type MapObjectPolygonProperties = {
	id: string;
	type: MapObjectFeatureType.POLYGON;
	fillColor: string;
	strokeColor: string;
	selectedFill: string;
	isSelected: boolean;
};

export type MapObjectCircleProperties = {
	id: string;
	type: MapObjectFeatureType.CIRCLE;
	radius: number;
	selectedScale: number;
	fillColor: string;
	strokeColor: string;
};

export type MapObjectIconFeature = GeojsonFeature<Point, MapObjectIconProperties>;
export type MapObjectPolygonFeature = GeojsonFeature<MultiPolygon, MapObjectPolygonProperties>;
export type MapObjectCircleFeature = GeojsonFeature<Point, MapObjectCircleProperties>;
export type MapObjectFeature =
	| MapObjectPolygonFeature
	| MapObjectIconFeature
	| MapObjectCircleFeature;

export function isFeatureIcon(feature: MapObjectFeature): feature is MapObjectIconFeature {
	return feature.properties.type === MapObjectFeatureType.ICON;
}

export function isFeatureCircle(feature: MapObjectFeature): feature is MapObjectCircleFeature {
	return feature.properties.type === MapObjectFeatureType.CIRCLE;
}

export function isFeaturePolygon(feature: MapObjectFeature): feature is MapObjectPolygonFeature {
	return feature.properties.type === MapObjectFeatureType.POLYGON;
}

/**
 * MapLibre applies icon-offset in the rotated coordinate space.
 * To keep an icon at a fixed screen position while rotating around its own center,
 * we counter-rotate the offset so it cancels out the rotation MapLibre applies.
 */
function counterRotateOffset(
	offset: number[],
	rotationDeg: number
): number[] {
	const rad = (-rotationDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return [
		offset[0] * cos - offset[1] * sin,
		offset[0] * sin + offset[1] * cos
	];
}

export function getIconFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: Omit<MapObjectIconProperties, "type">
): MapObjectIconFeature {
	let imageUrl = properties.imageUrl;
	if (!imageUrl.startsWith("data:")) {
		imageUrl = resize(imageUrl, { width: 64 });
	}

	let imageOffset = properties.imageOffset;
	if (
		imageOffset &&
		properties.imageRotation &&
		(imageOffset[0] !== 0 || imageOffset[1] !== 0)
	) {
		imageOffset = counterRotateOffset(imageOffset, properties.imageRotation);
	}

	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates
		},
		properties: {
			...properties,
			imageUrl,
			imageOffset,
			type: MapObjectFeatureType.ICON
		},
		id
	};
}

export function getPolygonFeature(
	id: string,
	coordinates: MultiPolygon["coordinates"],
	properties: Omit<MapObjectPolygonProperties, "type" | "selectedScale">
): MapObjectPolygonFeature {
	return {
		type: "Feature",
		geometry: {
			type: "MultiPolygon",
			coordinates
		},
		properties: {
			...properties,
			type: MapObjectFeatureType.POLYGON
		},
		id
	};
}

export function getCircleFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: Omit<MapObjectCircleProperties, "type">
): MapObjectCircleFeature {
	return {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates
		},
		properties: {
			...properties,
			type: MapObjectFeatureType.CIRCLE
		},
		id
	};
}
