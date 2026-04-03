import type { PokestopData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import {
	hasFortActiveLure,
	isIncidentInvasion,
	parseQuestReward,
	shouldDisplayIncidient,
	shouldDisplayQuest
} from "@/lib/utils/pokestopUtils";
import { getIconInvasion, getIconReward } from "@/lib/services/uicons.svelte.js";
import { getModifiers, withVisualTransform, getCompositeLayout } from "@/lib/map/modifierLayout";
import {
	getMatchingQuestFilterset,
	getMatchingInvasionFilterset
} from "@/lib/features/filters/matchFilterset";
import { type MapObjectFeature } from "./featureBuilders";
import { addOverlayIconAndBadge, getTextLabel, getRewardIconInfo } from "./modifierFeatures";
import type { RenderContext, RenderResult } from "./renderTypes";

function renderQuest(
	obj: PokestopData,
	ctx: RenderContext,
	questModifiers: ReturnType<typeof getModifiers>,
	subFeatures: MapObjectFeature[],
	reward: QuestReward,
	title: string,
	target: number,
	isAr: boolean,
	mapId: string,
	expiry: number | null,
	extraSpacingY: number
) {
	const matchingFilterset = getMatchingQuestFilterset(
		reward,
		title,
		target,
		isAr,
		ctx.questFiltersets
	);
	const questLayout = getCompositeLayout(ctx.modifiers, questModifiers, {
		extraSpacingY
	});
	const questVisual = withVisualTransform(questLayout.focusImageSize, matchingFilterset?.modifiers);

	addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
		imageUrl: getIconReward(reward.type, getRewardIconInfo(reward)),
		imageSize: questVisual.imageSize,
		selectedScale: ctx.selectedScale,
		imageOffset: questLayout.focusImageOffset,
		imageRotation: questVisual.imageRotation,
		textLabel: getTextLabel(matchingFilterset?.modifiers),
		expires: expiry,
		filtersetModifiers: matchingFilterset?.modifiers,
		filtersetIcon: matchingFilterset?.icon
	});
}

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

			renderQuest(
				obj,
				ctx,
				questModifiers,
				subFeatures,
				reward,
				obj.alternative_quest_title ?? "",
				obj.alternative_quest_target,
				false,
				obj.mapId + "-altquest-" + obj.alternative_quest_timestamp,
				obj.alternative_quest_expiry ?? null,
				0
			);
		}
		if (obj.quest_target && obj.quest_rewards) {
			const reward = parseQuestReward(obj.quest_rewards);
			if (
				!reward ||
				!shouldDisplayQuest(reward, obj.quest_title ?? "", obj.quest_target, true, obj)
			)
				return null;
			showThis = true;

			const spacing = subFeatures.length === 0 ? 0 : questModifiers.spacing;
			renderQuest(
				obj,
				ctx,
				questModifiers,
				subFeatures,
				reward,
				obj.quest_title ?? "",
				obj.quest_target,
				true,
				obj.mapId + "-quest-" + obj.quest_timestamp,
				obj.quest_expiry ?? null,
				spacing
			);
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
		const invasionLayout = getCompositeLayout(ctx.modifiers, invasionModifiers, {
			extraSpacingY: index * invasionModifiers.spacing
		});
		const invasionVisual = withVisualTransform(
			invasionLayout.focusImageSize,
			matchingInvasionFilterset?.modifiers
		);

		addOverlayIconAndBadge(subFeatures, mapId, obj.mapId, [obj.lon, obj.lat], {
			imageUrl: getIconInvasion(incident.character, incident.confirmed),
			imageSize: invasionVisual.imageSize,
			selectedScale: ctx.selectedScale,
			imageOffset: invasionLayout.focusImageOffset,
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
