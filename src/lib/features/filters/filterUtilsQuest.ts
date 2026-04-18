import * as m from "@/lib/paraglide/messages";
import type { FiltersetQuest, FiltersetTitle, MinMax } from "@/lib/features/filters/filtersets";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils";
import { IconCategory } from "@/lib/features/filters/icons";
import {
	makeAttributeItemLabel,
	makeAttributeMegaResourceLabel,
	makeAttributePokemonLabel,
	makeAttributeRangeLabel,
	makeAttributeRewardPokemonLabel
} from "@/lib/features/filters/makeAttributeChipLabel";
import { mQuest } from "@/lib/services/ingameLocale";
import { getActiveQuestRewards, getQuestStats } from "@/lib/features/masterStats.svelte";
import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { RewardType } from "@/lib/utils/pokestopUtils";
import { getId } from "@/lib/utils/uuid";

export const questBounds = {
	stardust: {
		min: 0,
		max: 5_000
	},
	xp: {
		min: 0,
		max: 10_000
	}
};

const PREMADE_ITEM_IDS = [706, 1301];
const PREMADE_POKEMON_IDS = [147, 371, 610, 782, 374, 443];
const PREMADE_RAREST_LIMIT = 15;

type PremadeQuestReward = Extract<QuestReward, { type: RewardType.ITEM | RewardType.POKEMON }>;

export enum QuestArType {
	AR = "ar",
	NOAR = "noar"
}

export function getAttributeLabelAr(ar: QuestArType | undefined) {
	if (ar === QuestArType.AR) return m.quest_ar_tag();
	if (ar === QuestArType.NOAR) return m.quest_noar_tag();
	return m.both();
}

export function getAttributeLabelStardust(stardust: MinMax | undefined) {
	return makeAttributeRangeLabel(stardust, questBounds.stardust.min, questBounds.stardust.max);
}

export function getAttributeLabelXp(xp: MinMax | undefined) {
	return makeAttributeRangeLabel(xp, questBounds.xp.min, questBounds.xp.max);
}

export function generateQuestFilterDetails(filter: FiltersetQuest) {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: "filter_template_quest_fallback"
	};
	setFilterIcon(filter, { emoji: "🔍" });

	const parts: string[] = [];
	let iconSet = false;

	function setIconOnce(options: Parameters<typeof setFilterIcon>[1]) {
		if (!iconSet) {
			setFilterIcon(filter, options);
			iconSet = true;
		}
	}

	if (filter.pokemon?.length) {
		parts.push(makeAttributePokemonLabel(filter.pokemon));
		setIconOnce({
			uicon: { category: IconCategory.POKEMON, params: filter.pokemon[0] }
		});
	}

	if (filter.item?.length) {
		parts.push(makeAttributeItemLabel(filter.item));
		setIconOnce({
			uicon: {
				category: IconCategory.ITEM,
				params: { item: Number(filter.item[0].id), amount: filter.item[0].amount ?? 0 }
			}
		});
	}

	if (filter.megaResource?.length) {
		parts.push(makeAttributeMegaResourceLabel(filter.megaResource));
		setIconOnce({
			uicon: { category: IconCategory.MISC, params: { misc_type: "mega_resource" } }
		});
	}

	if (filter.candy?.length) {
		parts.push(m.pokemon_candy({ pokemon: makeAttributeRewardPokemonLabel(filter.candy) }));
		setIconOnce({
			uicon: {
				category: IconCategory.MISC,
				params: { misc_type: "candy", pokemon_id: Number(filter.candy[0].id) }
			}
		});
	}

	if (filter.xlCandy?.length) {
		parts.push(m.pokemon_xl_candy({ pokemon: makeAttributeRewardPokemonLabel(filter.xlCandy) }));
		setIconOnce({
			uicon: {
				category: IconCategory.MISC,
				params: { misc_type: "xl_candy", pokemon_id: Number(filter.xlCandy[0].id) }
			}
		});
	}

	if (filter.stardust) {
		parts.push(m.count_stardust({ count: getAttributeLabelStardust(filter.stardust) }));
		setIconOnce({
			uicon: { category: IconCategory.MISC, params: { misc_type: "stardust" } }
		});
	}

	if (filter.xp) {
		parts.push(m.count_xp({ count: getAttributeLabelXp(filter.xp) }));
		setIconOnce({ emoji: "✨" });
	}

	if (parts.length > 0) {
		title.message = "filter_template_quest_reward";
		title.params = { reward: parts.join(", ") };
	} else if (filter.tasks) {
		if (filter.tasks.length === 1) {
			title.message = "filter_template_quest_task";
			title.params = { task: mQuest(filter.tasks[0].title, filter.tasks[0].target) };
		} else if (filter.tasks.length > 1) {
			title.message = "count_tasks";
			title.params = { count: filter.tasks.length.toString() };
		}
	}

	filter.title = title;
}

export function getPremadeQuestFiltersets(): FiltersetQuest[] | undefined {
	const activeQuests = getActiveQuestRewards();
	if (!activeQuests) return;

	const filters: FiltersetQuest[] = [];
	const excludedKeys = new Set<string>();

	for (const itemId of PREMADE_ITEM_IDS) {
		const reward = activeQuests.reduce<Extract<QuestReward, { type: RewardType.ITEM }> | undefined>(
			(best, current) => {
				if (current.type !== RewardType.ITEM || current.info.item_id !== itemId) return best;
				if (!best || current.info.amount > best.info.amount) return current;
				return best;
			},
			undefined
		);
		if (reward) filters.push(questFiltersetFromReward(reward));
		excludedKeys.add(`${RewardType.ITEM}-${itemId}`);
	}

	for (const pokemonId of PREMADE_POKEMON_IDS) {
		const reward = activeQuests.find(
			(r): r is Extract<QuestReward, { type: RewardType.POKEMON }> =>
				r.type === RewardType.POKEMON && r.info.pokemon_id === pokemonId
		);
		if (reward) filters.push(questFiltersetFromReward(reward));
		excludedKeys.add(`${RewardType.POKEMON}-${pokemonId}`);
	}

	const rewardCounts = new Map<string, { reward: PremadeQuestReward; count: number }>();
	for (const stat of getQuestStats()) {
		let reward: PremadeQuestReward | undefined;
		if (stat.reward.type === RewardType.ITEM || stat.reward.type === RewardType.POKEMON) {
			reward = stat.reward;
		} else {
			continue;
		}

		const key =
			reward.type === RewardType.ITEM
				? `${reward.type}-${reward.info.item_id}`
				: `${reward.type}-${reward.info.pokemon_id}`;
		if (excludedKeys.has(key)) continue;

		const existing = rewardCounts.get(key);
		if (existing) {
			existing.count += stat.count;
			if (
				reward.type === RewardType.ITEM &&
				existing.reward.type === RewardType.ITEM &&
				reward.info.amount > existing.reward.info.amount
			) {
				existing.reward = reward;
			}
		} else {
			rewardCounts.set(key, { reward, count: stat.count });
		}
	}

	const rarest = Array.from(rewardCounts.values())
		.sort((a, b) => a.count - b.count)
		.slice(0, PREMADE_RAREST_LIMIT);

	for (const { reward } of rarest) {
		filters.push(questFiltersetFromReward(reward));
	}

	if (!filters.length) return;

	return filters;
}

function questFiltersetFromReward(reward: PremadeQuestReward): FiltersetQuest {
	const filterset: FiltersetQuest = {
		id: getId(),
		icon: {
			isUserSelected: false
		},
		title: {
			message: "filter_template_quest_fallback"
		},
		enabled: true,
		rewardType: reward.type
	};

	if (reward.type === RewardType.POKEMON) {
		filterset.pokemon = [{ pokemon_id: reward.info.pokemon_id, form: reward.info.form }];
	}

	if (reward.type === RewardType.ITEM) {
		filterset.item = [{ id: String(reward.info.item_id), amount: reward.info.amount }];
	}

	generateQuestFilterDetails(filterset);
	return filterset;
}
