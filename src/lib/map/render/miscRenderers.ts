import type { Polygon } from "geojson";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import type { S2CellData } from "@/lib/types/mapObjectData/s2cell";
import { SPAWNPOINT_OUTDATED_SECONDS } from "@/lib/constants";
import { getIconPokemon } from "@/lib/services/uicons.svelte.js";
import { getStationPokemon, shouldDisplayStation } from "@/lib/utils/stationUtils";
import { getModifiers, withVisualTransform } from "@/lib/map/modifierLayout";
import { getMatchingMaxBattleFilterset } from "@/lib/features/filters/matchFilterset";
import { geojson, s2 } from "s2js";
import { getCircleFeature, getPolygonFeature, type MapObjectFeature } from "./featureBuilders";
import { addOverlayIconAndBadge, getTextLabel } from "./modifierFeatures";
import type { RenderContext, RenderResult } from "./renderTypes";

export function renderStation(obj: StationData, ctx: RenderContext): RenderResult {
	const subFeatures: MapObjectFeature[] = [];
	let showThis = false;
	let expires: number | null = null;

	if (shouldDisplayStation(obj)) {
		expires = obj.end_time;
		showThis = true;
		if (obj.battle_pokemon_id) {
			const mapId = obj.mapId + "-maxbattle-" + obj.battle_pokemon_id;
			const maxBattleModifiers = getModifiers(ctx.userIconSet, "max_battle");
			const matchingFilterset = getMatchingMaxBattleFilterset(obj, ctx.maxBattleFiltersets);
			const maxBattleVisual = withVisualTransform(
				maxBattleModifiers.scale,
				matchingFilterset?.modifiers
			);

			addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
				imageUrl: getIconPokemon(getStationPokemon(obj)),
				imageSize: maxBattleVisual.imageSize,
				selectedScale: ctx.selectedScale,
				imageOffset: [
					ctx.modifiers.offsetX + maxBattleModifiers.offsetX,
					ctx.modifiers.offsetY + maxBattleModifiers.offsetY
				],
				imageRotation: maxBattleVisual.imageRotation,
				textLabel: getTextLabel(matchingFilterset?.modifiers),
				expires: obj.end_time ?? null,
				filtersetModifiers: matchingFilterset?.modifiers,
				filtersetIcon: matchingFilterset?.icon,
				overlayImageOffset: [ctx.modifiers.offsetX, ctx.modifiers.offsetY]
			});
		}
	}

	return { subFeatures, showThis, expires };
}

export function renderSpawnpoint(obj: SpawnpointData, ctx: RenderContext): RenderResult {
	const isOutdated = obj.last_seen < ctx.timestamp - SPAWNPOINT_OUTDATED_SECONDS;
	let cssVar = "--spawnpoint";
	if (isOutdated) cssVar += "-inactive";

	const subFeatures: MapObjectFeature[] = [
		getCircleFeature(obj.mapId, [obj.lon, obj.lat], {
			id: obj.mapId,
			strokeColor: ctx.styles.getPropertyValue(cssVar + "-stroke"),
			fillColor: ctx.styles.getPropertyValue(cssVar),
			radius: 3,
			selectedScale: ctx.selectedScale
		})
	];

	return { subFeatures, showThis: false, expires: null };
}

export function renderTappable(obj: TappableData, ctx: RenderContext): RenderResult | null {
	if (obj.expire_timestamp && obj.expire_timestamp < ctx.timestamp) return null;
	return { subFeatures: [], showThis: true, expires: obj.expire_timestamp };
}

export function renderS2Cell(obj: S2CellData, ctx: RenderContext): RenderResult {
	const cell = s2.Cell.fromCellID(obj.cellId);
	const polygon = geojson.toGeoJSON(cell) as Polygon;
	const subFeatures: MapObjectFeature[] = [
		getPolygonFeature(obj.mapId, [polygon.coordinates], {
			id: obj.mapId,
			strokeColor: ctx.styles.getPropertyValue("--s2cell-polygon-stroke"),
			fillColor: ctx.styles.getPropertyValue("--s2cell-polygon"),
			selectedFill: ctx.styles.getPropertyValue("--s2cell-polygon-selected"),
			isSelected: ctx.isSelected
		})
	];

	return { subFeatures, showThis: false, expires: null };
}
