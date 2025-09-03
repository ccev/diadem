import type { Incident, PokestopData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { mItem, mPokemon } from "@/lib/services/ingameLocale";
import * as m from "@/lib/paraglide/messages";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";

export const CONTEST_SLOTS = 200;

export function parseQuestReward(reward?: string | null) {
	return JSON.parse(reward ?? "[]")[0] as QuestReward | undefined;
}

export function getArTag(isAr: boolean) {
	if (isAr) return m.quest_ar_tag();
	return m.quest_noar_tag();
}

export function hasFortActiveLure(data: Partial<PokestopData>) {
	return (
		data.lure_id && data.lure_expire_timestamp && data.lure_expire_timestamp > currentTimestamp()
	);
}

export function isIncidentInvasion(incident: Incident) {
	return [1, 2, 3].includes(incident.display_type);
}

export function isIncidentKecleon(incident: Incident) {
	return incident.display_type === 8;
}

export function isIncidentContest(incident: Incident) {
	return incident.display_type === 9;
}

export function getRewardText(reward: QuestReward) {
	switch (reward.type) {
		case 1:
			return m.quest_xp({ count: reward.info.amount });
		case 2:
			return m.quest_item({ count: reward.info.amount, item: mItem(reward.info.item_id) });
		case 3:
			return m.quest_stardust({ count: reward.info.amount });
		case 4:
			return m.quest_candy({ count: reward.info.amount, pokemon: mPokemon(reward.info) });
		case 5:
			return "Avatar Clothing";
		case 6:
			return "Quest";
		case 7:
			return mPokemon(reward.info);
		case 8:
			return "Pokecoins";
		case 9:
			return m.quest_xl_candy({
				count: reward.info.amount,
				pokemon: mPokemon(reward.info)
			});
		case 10:
			return "Level Cap";
		case 11:
			return "Sticker";
		case 12:
			return m.quest_mega_resource({
				count: reward.info.amount,
				pokemon: mPokemon(reward.info)
			});
		case 13:
			return "Incdent";
		case 14:
			return "Player Attribute";
		default:
			return "";
	}
}

export function getContestText(data: PokestopData) {
	let metric = m.contest_biggest
	let name = ""

	if (data.showcase_ranking_standard === 1) {
		metric = m.contest_smallest
	}

	const focus: ContestFocus = JSON.parse(data.showcase_focus ?? "{}")

	if (!focus) return metric({ name })

	if (focus.type === "pokemon") {
		name = mPokemon({ pokemon_id: focus.pokemon_id, form: focus.pokemon_form })
	} else if (focus.type === "type") {
		if (focus.pokemon_type_2) {
			name = m.connected_and({
				1: mType(focus.pokemon_type_1),
				2:  m.x_type({ type: mType(focus.pokemon_type_2) })
			})
		} else {
			name = m.x_type({ type: mType(focus.pokemon_type_1) })
		}
	} else if (focus.type === "buddy") {
		name = m.contest_buddy_min_level({ level: focus.min_level })
	} else if (focus.type === "alignment") {
		name = mAlignment(focus.pokemon_alignment)
	} else if (focus.type === "class") {
		// @ts-ignore
		const func =  m["pokemon_class_" + focus.pokemon_class]
		name = func ? func() : "?"
	} else if (focus.type === "family") {
		name = m.contest_pokemon_family({ pokemon: mPokemon({ pokemon_id: focus.pokemon_family }) })
	} else if (focus.type === "generation") {
		name = mGeneration(focus.generation) + " " + m.pogo_pokemon()
	} else if (focus.type === "hatched") {
		name = focus.hatched ? m.contest_hatched() : m.contest_not_hatched()
	} else if (focus.type === "mega") {
		name = focus.restriction === 1 ? m.contest_mega_evolution() : m.contest_not_mega_evolution()
	} else if (focus.type === "shiny") {
		name = focus.shiny ? m.contest_shiny() : m.contest_not_shiny()
	}

	return metric({ name })
}