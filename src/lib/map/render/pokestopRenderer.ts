import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import {
	hasFortActiveLure,
	isIncidentInvasion,
	parseQuestReward,
	shouldDisplayIncidient,
	shouldDisplayQuest
} from "@/lib/utils/pokestopUtils";
import { getIconInvasion, getIconReward } from "@/lib/services/uicons.svelte.js";
import { getModifiers, withVisualTransform } from "@/lib/map/modifierLayout";
import {
	getMatchingQuestFilterset,
	getMatchingInvasionFilterset
} from "@/lib/features/filters/matchFilterset";
import { type MapObjectFeature } from "./featureBuilders";
import { addOverlayIconAndBadge, getTextLabel, getRewardIconInfo } from "./modifierFeatures";
import type { RenderContext, RenderResult } from "./renderTypes";

export function renderPokestop(obj: PokestopData, ctx: RenderContext): RenderResult | null {
	const subFeatures: MapObjectFeature[] = [];
	let showThis =
		ctx.showAllPokestops ||
		(ctx.showLures && hasFortActiveLure(obj)) ||
		ctx.isSelected ||
		ctx.isSelectedOverwrite;

	if (ctx.showQuests || ctx.isSelectedOverwrite) {
		const questModifiers = getModifiers(ctx.userIconSet, "quest");
		if (obj.alternative_quest_target && obj.alternative_quest_rewards) {
			// no ar
			const reward = parseQuestReward(obj.alternative_quest_rewards);

			if (
				!reward ||
				!shouldDisplayQuest(
					reward,
					obj.alternative_quest_title ?? "",
					obj.alternative_quest_target,
					false,
					obj
				)
			)
				return null;
			showThis = true;

			const mapId = obj.mapId + "-altquest-" + obj.alternative_quest_timestamp;
			const matchingQuestFilterset = getMatchingQuestFilterset(
				reward,
				obj.alternative_quest_title ?? "",
				obj.alternative_quest_target,
				false,
				ctx.questFiltersets
			);
			const questVisual = withVisualTransform(
				questModifiers.scale,
				matchingQuestFilterset?.modifiers
			);
			const questImageOffset = [
				ctx.modifiers.offsetX + questModifiers.offsetX,
				ctx.modifiers.offsetY + questModifiers.offsetY
			];

			addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
				imageUrl: getIconReward(reward.type, getRewardIconInfo(reward)),
				imageSize: questVisual.imageSize,
				selectedScale: ctx.selectedScale,
				imageOffset: questImageOffset,
				imageRotation: questVisual.imageRotation,
				textLabel: getTextLabel(matchingQuestFilterset?.modifiers),
				expires: obj.alternative_quest_expiry ?? null,
				filtersetModifiers: matchingQuestFilterset?.modifiers,
				filtersetIcon: matchingQuestFilterset?.icon
			});
		}
		if (obj.quest_target && obj.quest_rewards) {
			// ar
			const reward = parseQuestReward(obj.quest_rewards);
			if (
				!reward ||
				!shouldDisplayQuest(reward, obj.quest_title ?? "", obj.quest_target, true, obj)
			)
				return null;
			showThis = true;

			const mapId = obj.mapId + "-quest-" + obj.quest_timestamp;
			const spacing = subFeatures.length === 0 ? 0 : questModifiers.spacing;
			const matchingQuestFilterset = getMatchingQuestFilterset(
				reward,
				obj.quest_title ?? "",
				obj.quest_target,
				true,
				ctx.questFiltersets
			);
			const questVisual = withVisualTransform(
				questModifiers.scale,
				matchingQuestFilterset?.modifiers
			);
			const questImageOffset = [
				ctx.modifiers.offsetX + questModifiers.offsetX,
				ctx.modifiers.offsetY + questModifiers.offsetY + spacing
			];

			addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
				imageUrl: getIconReward(reward.type, getRewardIconInfo(reward)),
				imageSize: questVisual.imageSize,
				selectedScale: ctx.selectedScale,
				imageOffset: questImageOffset,
				imageRotation: questVisual.imageRotation,
				textLabel: getTextLabel(matchingQuestFilterset?.modifiers),
				expires: obj.quest_expiry ?? null,
				filtersetModifiers: matchingQuestFilterset?.modifiers,
				filtersetIcon: matchingQuestFilterset?.icon
			});
		}
	}

	let index = 0;
	for (const incident of obj?.incident ?? []) {
		if (shouldDisplayIncidient(incident, obj)) {
			showThis = true;
		} else {
			continue;
		}

		if (
			!(
				(ctx.showInvasions &&
					incident.id &&
					isIncidentInvasion(incident) &&
					incident.expiration > ctx.timestamp) ||
				ctx.isSelectedOverwrite
			)
		) {
			continue;
		}

		const mapId = obj.mapId + "-incident-" + incident.id;
		const invasionModifiers = getModifiers(ctx.userIconSet, "invasion");
		const matchingInvasionFilterset = getMatchingInvasionFilterset(
			incident,
			ctx.invasionFiltersets
		);
		const invasionVisual = withVisualTransform(
			invasionModifiers.scale,
			matchingInvasionFilterset?.modifiers
		);
		const invasionImageOffset = [
			ctx.modifiers.offsetX + invasionModifiers.offsetX,
			ctx.modifiers.offsetY + invasionModifiers.offsetY + index * invasionModifiers.spacing
		];

		addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
			imageUrl: getIconInvasion(incident.character, incident.confirmed),
			imageSize: invasionVisual.imageSize,
			selectedScale: ctx.selectedScale,
			imageOffset: invasionImageOffset,
			imageRotation: invasionVisual.imageRotation,
			textLabel: getTextLabel(matchingInvasionFilterset?.modifiers),
			expires: incident.expiration,
			filtersetModifiers: matchingInvasionFilterset?.modifiers,
			filtersetIcon: matchingInvasionFilterset?.icon
		});
		index += 1;
	}

	return { subFeatures, showThis, expires: null };
}
