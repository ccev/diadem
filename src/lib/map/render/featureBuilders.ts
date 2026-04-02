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

export function getIconFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: Omit<MapObjectIconProperties, "type">
): MapObjectIconFeature {
	let imageUrl = properties.imageUrl;
	if (!imageUrl.startsWith("data:")) {
		imageUrl = resize(imageUrl, { width: 64 });
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
