import type { MultiPolygon } from "geojson";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import { getIconPokemon } from "@/lib/services/uicons.svelte.js";
import { shouldDisplayNest } from "@/lib/utils/nestUtils";
import {
	getIconFeature,
	getCircleFeature,
	getPolygonFeature,
	type MapObjectFeature
} from "./featureBuilders";
import type { RenderContext, RenderResult } from "./renderTypes";

export function renderNest(obj: NestData, ctx: RenderContext): RenderResult {
	if (!shouldDisplayNest(obj)) {
		return { subFeatures: [], showThis: false, expires: null };
	}

	const subFeatures: MapObjectFeature[] = [];

	// transform mysql's polygon format to geojson
	let polygon: MultiPolygon["coordinates"];
	if (Array.isArray(obj.polygon[0][0])) {
		polygon = obj.polygon.map((polygon) =>
			// @ts-ignore
			polygon.map((ring) => ring.map((p) => [p.x, p.y]))
		);
	} else {
		// @ts-ignore
		polygon = [obj.polygon.map((ring) => ring.map((p) => [p.x, p.y]))];
	}

	subFeatures.push(
		getIconFeature(obj.mapId, [obj.lon, obj.lat], {
			imageUrl: getIconPokemon(obj),
			id: obj.mapId,
			imageSize: ctx.modifiers.scale,
			selectedScale: ctx.selectedScale,
			imageOffset: [ctx.modifiers.offsetX, ctx.modifiers.offsetY],
			expires: null
		})
	);

	subFeatures.push(
		getCircleFeature(obj.mapId, [obj.lon, obj.lat], {
			id: obj.mapId,
			strokeColor: ctx.styles.getPropertyValue("--nest-circle-stroke"),
			fillColor: ctx.styles.getPropertyValue("--nest-circle"),
			radius: 52 * ctx.modifiers.scale,
			selectedScale: ctx.selectedScale
		})
	);
	subFeatures.push(
		getPolygonFeature(obj.mapId, polygon, {
			id: obj.mapId,
			strokeColor: ctx.styles.getPropertyValue("--nest-polygon-stroke"),
			fillColor: ctx.styles.getPropertyValue("--nest-polygon"),
			selectedFill: ctx.styles.getPropertyValue("--nest-polygon-selected"),
			isSelected: ctx.isSelected
		})
	);

	return { subFeatures, showThis: false, expires: null };
}
