import type { GymData } from "@/lib/types/mapObjectData/gym";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { FORT_OUTDATED_SECONDS } from "@/lib/constants";
import { getIconGym, getIconPokemon, getIconRaidEgg } from "@/lib/services/uicons.svelte.js";
import { getRaidPokemon, shouldDisplayRaid } from "@/lib/utils/gymUtils";
import { getModifiers, withVisualTransform, combineOffsets } from "@/lib/map/modifierLayout";
import { getMatchingRaidFilterset } from "@/lib/features/filters/matchFilterset";
import { type MapObjectFeature } from "./featureBuilders";
import { addOverlayIconAndBadge, getTextLabel } from "./modifierFeatures";
import type { RenderContext, RenderResult } from "./renderTypes";

export function renderGym(obj: GymData, ctx: RenderContext): RenderResult {
	const subFeatures: MapObjectFeature[] = [];
	let showThis =
		ctx.showAllGyms || shouldDisplayRaid(obj) || ctx.isSelected || ctx.isSelectedOverwrite;
	let overwriteIcon: string | undefined = undefined;

	const matchingRaidFilterset = shouldDisplayRaid(obj)
		? getMatchingRaidFilterset(obj, ctx.raidFiltersets)
		: undefined;

	if ((obj.updated ?? 0) < ctx.timestamp - FORT_OUTDATED_SECONDS) {
		overwriteIcon = getIconGym({ team_id: 0 });
	} else if (shouldDisplayRaid(obj)) {
		const isHatched = !!obj.raid_pokemon_id;
		const modKey = isHatched ? ("raid_pokemon" as const) : ("raid_egg" as const);
		const fullSlotKey = isHatched ? ("raid_pokemon_6" as const) : ("raid_egg_6" as const);

		const mapId =
			obj.mapId + (isHatched ? "-raidpokemon-" : "-raidegg-") + obj.raid_spawn_timestamp;
		let raidModifiers = getModifiers(ctx.userIconSet, modKey);

		if (obj.availble_slots === 0 && ctx.userIconSet?.[fullSlotKey]) {
			raidModifiers = getModifiers(ctx.userIconSet, fullSlotKey);
		}

		const baseScale = isHatched
			? getModifiers(ctx.userIconSet, MapObjectType.POKEMON).scale * raidModifiers.scale
			: raidModifiers.scale;
		const raidVisual = withVisualTransform(baseScale, matchingRaidFilterset?.modifiers);

		addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
			imageUrl: isHatched
				? getIconPokemon(getRaidPokemon(obj))
				: getIconRaidEgg(obj.raid_level ?? 0),
			imageSize: raidVisual.imageSize,
			selectedScale: ctx.selectedScale,
			imageOffset: combineOffsets(ctx.modifiers, raidModifiers),
			imageRotation: raidVisual.imageRotation,
			textLabel: getTextLabel(matchingRaidFilterset?.modifiers),
			expires: (isHatched ? obj.raid_end_timestamp : obj.raid_battle_timestamp) ?? null,
			filtersetModifiers: matchingRaidFilterset?.modifiers,
			filtersetIcon: matchingRaidFilterset?.icon,
			overlayImageOffset: [ctx.modifiers.offsetX, ctx.modifiers.offsetY]
		});
	}

	const result: RenderResult = { subFeatures, showThis, expires: null, overwriteIcon };
	return result;
}
