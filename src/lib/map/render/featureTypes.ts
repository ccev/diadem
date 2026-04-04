import type { Feature as GeojsonFeature, MultiPolygon, Point } from "geojson";
import { resize } from "@/lib/services/assets";

export enum FeatureTypes {
	ICON = 0,
	POLYGON = 1,
	CIRCLE = 2
}

export type MapObjectIconProperties = {
	id: string;
	type: FeatureTypes.ICON;
	imageUrl: string;
	imageId: string;
	imageSize: number;
	selectedScale: number;
	imageOffset?: [number, number];
	isModifierBadge?: boolean;
	expires: number | null;
};
export type MinMapObjectIconProperties = Omit<MapObjectIconProperties, "type" | "imageId"> & {
	imageId?: string;
};

export type MapObjectPolygonProperties = {
	id: string;
	type: FeatureTypes.POLYGON;
	fillColor: string;
	strokeColor: string;
	selectedFill: string;
	isSelected: boolean;
};

export type MapObjectCircleProperties = {
	id: string;
	type: FeatureTypes.CIRCLE;
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
	return feature.properties.type === FeatureTypes.ICON;
}

export function isFeatureCircle(feature: MapObjectFeature): feature is MapObjectCircleFeature {
	return feature.properties.type === FeatureTypes.CIRCLE;
}

export function isFeaturePolygon(feature: MapObjectFeature): feature is MapObjectPolygonFeature {
	return feature.properties.type === FeatureTypes.POLYGON;
}

export function getIconFeature(
	id: string,
	coordinates: Point["coordinates"],
	properties: MinMapObjectProperties
): MapObjectIconFeature {
	let imageUrl = properties.imageUrl;
	if (!imageUrl.startsWith("data:") && imageUrl) {
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
			imageId: properties.imageId ?? properties.imageUrl,
			type: FeatureTypes.ICON
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
			type: FeatureTypes.POLYGON
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
			type: FeatureTypes.CIRCLE
		},
		id
	};
}