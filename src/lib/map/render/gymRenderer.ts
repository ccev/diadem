import type { GymData } from "@/lib/types/mapObjectData/gym";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { FORT_OUTDATED_SECONDS } from "@/lib/constants";
import { getIconGym, getIconPokemon, getIconRaidEgg } from "@/lib/services/uicons.svelte.js";
import { getRaidPokemon, shouldDisplayRaid } from "@/lib/utils/gymUtils";
import { getModifiers, withVisualTransform } from "@/lib/map/modifierLayout";
import { getMatchingRaidFilterset } from "@/lib/features/filters/matchFilterset";
import { getIconFeature, type MapObjectFeature } from "./featureBuilders";
import {
	addModifierOverlayFeatures,
	addFiltersetBadgeFeature,
	getTextLabel
} from "./modifierFeatures";
import type { RenderContext, RenderResult } from "./renderTypes";

export function renderGym(obj: GymData, ctx: RenderContext): RenderResult {
	const subFeatures: MapObjectFeature[] = [];
	let showThis = ctx.showAllGyms || shouldDisplayRaid(obj) || ctx.isSelected || ctx.isSelectedOverwrite;
	let overwriteIcon: string | undefined = undefined;

	const matchingRaidFilterset = shouldDisplayRaid(obj)
		? getMatchingRaidFilterset(obj, ctx.raidFiltersets)
		: undefined;

	if ((obj.updated ?? 0) < ctx.timestamp - FORT_OUTDATED_SECONDS) {
		overwriteIcon = getIconGym({ team_id: 0 });
	} else if (shouldDisplayRaid(obj)) {
		if (obj.raid_pokemon_id) {
			const mapId = obj.mapId + "-raidpokemon-" + obj.raid_spawn_timestamp;
			const pokemonModifiers = getModifiers(ctx.userIconSet, MapObjectType.POKEMON);
			let raidModifiers = getModifiers(ctx.userIconSet, "raid_pokemon");

			if (obj.availble_slots === 0 && ctx.userIconSet?.raid_pokemon_6) {
				raidModifiers = getModifiers(ctx.userIconSet, "raid_pokemon_6");
			}

			const raidImageOffset = [
				ctx.modifiers.offsetX + raidModifiers.offsetX,
				ctx.modifiers.offsetY + raidModifiers.offsetY
			];
			const raidVisual = withVisualTransform(
				pokemonModifiers.scale * raidModifiers.scale,
				matchingRaidFilterset?.modifiers
			);

			addModifierOverlayFeatures(
				subFeatures,
				mapId,
				obj.mapId,
				[obj.lon, obj.lat],
				ctx.selectedScale,
				raidVisual.imageSize,
				matchingRaidFilterset?.modifiers,
				raidImageOffset
			);

			{
				const raidLabel = getTextLabel(matchingRaidFilterset?.modifiers);
				subFeatures.push(
					getIconFeature(mapId, [obj.lon, obj.lat], {
						imageUrl: getIconPokemon(getRaidPokemon(obj)),
						imageSize: raidVisual.imageSize,
						selectedScale: ctx.selectedScale,
						imageOffset: raidImageOffset,
						...(raidVisual.imageRotation !== undefined && {
							imageRotation: raidVisual.imageRotation
						}),
						...(raidLabel !== undefined && { textLabel: raidLabel }),
						id: obj.mapId,
						expires: obj.raid_end_timestamp ?? null
					})
				);
			}
			addFiltersetBadgeFeature(
				subFeatures,
				`${mapId}-badge`,
				obj.mapId,
				[obj.lon, obj.lat],
				matchingRaidFilterset?.modifiers,
				matchingRaidFilterset?.icon,
				raidVisual.imageSize,
				ctx.selectedScale,
				{ offsetX: raidImageOffset[0], offsetY: raidImageOffset[1] },
				obj.raid_end_timestamp ?? null
			);
		} else {
			const mapId = obj.mapId + "-raidegg-" + obj.raid_spawn_timestamp;
			let raidModifiers = getModifiers(ctx.userIconSet, "raid_egg");

			if (obj.availble_slots === 0 && ctx.userIconSet?.raid_egg_6) {
				raidModifiers = getModifiers(ctx.userIconSet, "raid_egg_6");
			}

			const raidImageOffset = [
				ctx.modifiers.offsetX + raidModifiers.offsetX,
				ctx.modifiers.offsetY + raidModifiers.offsetY
			];
			const raidVisual = withVisualTransform(
				raidModifiers.scale,
				matchingRaidFilterset?.modifiers
			);

			addModifierOverlayFeatures(
				subFeatures,
				mapId,
				obj.mapId,
				[obj.lon, obj.lat],
				ctx.selectedScale,
				raidVisual.imageSize,
				matchingRaidFilterset?.modifiers,
				raidImageOffset
			);

			{
				const raidLabel = getTextLabel(matchingRaidFilterset?.modifiers);
				subFeatures.push(
					getIconFeature(mapId, [obj.lon, obj.lat], {
						imageUrl: getIconRaidEgg(obj.raid_level ?? 0),
						imageSize: raidVisual.imageSize,
						selectedScale: ctx.selectedScale,
						imageOffset: raidImageOffset,
						...(raidVisual.imageRotation !== undefined && {
							imageRotation: raidVisual.imageRotation
						}),
						...(raidLabel !== undefined && { textLabel: raidLabel }),
						id: obj.mapId,
						expires: obj.raid_battle_timestamp ?? null
					})
				);
			}
			addFiltersetBadgeFeature(
				subFeatures,
				`${mapId}-badge`,
				obj.mapId,
				[obj.lon, obj.lat],
				matchingRaidFilterset?.modifiers,
				matchingRaidFilterset?.icon,
				raidVisual.imageSize,
				ctx.selectedScale,
				{ offsetX: raidImageOffset[0], offsetY: raidImageOffset[1] },
				obj.raid_battle_timestamp ?? null
			);
		}
	}

	const result: RenderResult = { subFeatures, showThis, expires: null, overwriteIcon };
	return result;
}
