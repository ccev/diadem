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
		parts.push(m.pokemon_xl_candy({ pokemon: makeAttributeRewardPokemonLabel(filter.xlCandy)}));
		setIconOnce({
			uicon: {
				category: IconCategory.MISC,
				params: { misc_type: "xl_candy", pokemon_id: Number(filter.xlCandy[0].id) }
			}
		});
	}

	if (filter.stardust) {
		parts.push(m.count_stardust({ count: getAttributeLabelStardust(filter.stardust)}));
		setIconOnce({
			uicon: { category: IconCategory.MISC, params: { misc_type: "stardust" } }
		});
	}

	if (filter.xp) {
		parts.push(m.count_xp({ count: getAttributeLabelXp(filter.xp)}));
		setIconOnce({ emoji: "✨" });
	}

	if (parts.length > 0) {
		title.message = "filter_template_quest_reward";
		title.params = { reward: parts.join(", ") };
	} else if (filter.tasks) {
		if (filter.tasks.length === 1) {
			title.message = "filter_template_quest_task";
			title.params = { task: mQuest(filter.tasks[0].title, filter.tasks[0].target) }
		} else if (filter.tasks.length > 1) {
			title.message = "count_tasks";
			title.params = { count: filter.tasks.length.toString() }
		}
	}

	filter.title = title;
}
