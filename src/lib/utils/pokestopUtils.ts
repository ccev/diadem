import type {
	ContestFocus,
	Incident,
	PokestopData,
	QuestReward
} from "@/lib/types/mapObjectData/pokestop";
import { mAlignment, mGeneration, mItem, mPokemon, mType } from "@/lib/services/ingameLocale";
import * as m from "@/lib/paraglide/messages";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { defaultFilter, getUserSettings } from "@/lib/services/userSettings.svelte";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getIconContest, getIconPokemon, getIconType } from "@/lib/services/uicons.svelte";

export const CONTEST_SLOTS = 200;
export const INCIDENT_DISPLAY_GOLD = 7;
export const INCIDENT_DISPLAY_KECLEON = 8;
export const INCIDENT_DISPLAY_CONTEST = 9;
export const INCIDENT_DISPLAYS_INVASION = [1, 2, 3];
export const INVASION_CHARACTER_LEADERS = [41, 42, 43, 44, 46];
export const KECLEON_ID = 352;

export enum RewardType {
	XP = 1,
	ITEM = 2,
	STARDUST = 3,
	CANDY = 4,
	AVATAR_CLOTHING = 5,
	QUEST = 6,
	POKEMON = 7,
	POKECOINS = 8,
	XL_CANDY = 9,
	LEVEL_CAP = 10,
	STICKER = 11,
	MEGA_ENERGY = 12,
	INCIDENT = 13,
	PLAYER_ATTRIBUTE = 14,
	EVENT_BADGE = 15,
	POKEMON_EGG = 16
}

export function parseQuestReward(reward?: string | null) {
	const parsed = JSON.parse(reward ?? "[]")[0] as QuestReward | undefined;
	if (parsed && "form_id" in parsed.info) {
		// @ts-ignore
		parsed.info["form"] = parsed.info["form_id"];
		delete parsed.info["form_id"];
	}
	return parsed;
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
	return INCIDENT_DISPLAYS_INVASION.includes(incident.display_type);
}

export function isIncidentGold(incident: Incident) {
	return incident.display_type === INCIDENT_DISPLAY_GOLD;
}

export function isIncidentKecleon(incident: Incident) {
	return incident.display_type === INCIDENT_DISPLAY_KECLEON;
}

export function isIncidentContest(incident: Incident) {
	return incident.display_type === INCIDENT_DISPLAY_CONTEST;
}

export function getRewardText(reward: QuestReward) {
	switch (reward.type) {
		case RewardType.XP:
			if (!reward.info.amount) return m.xp();
			return m.quest_xp({ count: reward.info.amount });
		case RewardType.ITEM:
			if (!reward.info.amount) return mItem(reward.info.item_id);
			return m.quest_item({ count: reward.info.amount, item: mItem(reward.info.item_id) });
		case RewardType.STARDUST:
			if (!reward.info.amount) return m.stardust();
			return m.quest_stardust({ count: reward.info.amount });
		case RewardType.CANDY:
			if (!reward.info.amount) return m.pokemon_candy({ pokemon: mPokemon(reward.info) });
			return m.quest_candy({ count: reward.info.amount, pokemon: mPokemon(reward.info) });
		case RewardType.POKEMON:
			return mPokemon(reward.info);
		case RewardType.XL_CANDY:
			if (!reward.info.amount) return m.pokemon_xl_candy({ pokemon: mPokemon(reward.info) });
			return m.quest_xl_candy({
				count: reward.info.amount,
				pokemon: mPokemon(reward.info)
			});
		case RewardType.MEGA_ENERGY:
			if (!reward.info.amount) return m.pokemon_mega_resource({ pokemon: mPokemon(reward.info) });
			return m.quest_mega_resource({
				count: reward.info.amount,
				pokemon: mPokemon(reward.info)
			});
		default:
			return rewardTypeLabel(reward.type);
	}
}

export function rewardTypeLabel(rewardType: RewardType) {
	switch (rewardType) {
		case RewardType.XP:
			return m.xp();
		case RewardType.ITEM:
			return m.items();
		case RewardType.STARDUST:
			return m.stardust();
		case RewardType.CANDY:
			return m.candy();
		case RewardType.AVATAR_CLOTHING:
			return "Avatar Clothing";
		case RewardType.QUEST:
			return "Quest";
		case RewardType.POKEMON:
			return m.pogo_pokemon();
		case RewardType.POKECOINS:
			return "Pokecoins";
		case RewardType.XL_CANDY:
			return m.xl_candy();
		case RewardType.LEVEL_CAP:
			return "Level Cap";
		case RewardType.STICKER:
			return "Sticker";
		case RewardType.MEGA_ENERGY:
			return m.mega_energy();
		case RewardType.INCIDENT:
			return "Incident";
		case RewardType.PLAYER_ATTRIBUTE:
			return "Player Attribute";
		case RewardType.EVENT_BADGE:
			return "Event Badge";
		case RewardType.POKEMON_EGG:
			return "Egg";
		default:
			return "";
	}
}

export function getQuestKey(questReward: string, questTitle: string, questTarget: number) {
	return `${questReward}/${questTitle}/${questTarget}`;
}

export function getContestText(rankingStandard: number, focus: ContestFocus) {
	let metric = m.contest_biggest;
	let name = "";

	// if ((data?.showcase_expiry ?? 0) < currentTimestamp()) {
	// 	return m.unknown_contest();
	// }

	if (rankingStandard === 1) {
		metric = m.contest_smallest;
	}

	if (!focus) return metric({ name });

	if (focus.type === "pokemon") {
		name = mPokemon({ pokemon_id: focus.pokemon_id, form: focus.pokemon_form });
	} else if (focus.type === "type") {
		if (focus.pokemon_type_2) {
			name = m.connected_and({
				first: mType(focus.pokemon_type_1),
				second: m.x_type({ type: mType(focus.pokemon_type_2) })
			});
		} else {
			name = m.x_type({ type: mType(focus.pokemon_type_1) });
		}
	} else if (focus.type === "buddy") {
		name = m.contest_buddy_min_level({ level: focus.min_level });
	} else if (focus.type === "alignment") {
		name = mAlignment(focus.pokemon_alignment);
	} else if (focus.type === "class") {
		// @ts-ignore
		const func = m["pokemon_class_" + focus.pokemon_class];
		name = func ? func() : "?";
	} else if (focus.type === "family") {
		name = m.contest_pokemon_family({ pokemon: mPokemon({ pokemon_id: focus.pokemon_family }) });
	} else if (focus.type === "generation") {
		name = mGeneration(focus.generation) + " " + m.pogo_pokemon();
	} else if (focus.type === "hatched") {
		name = focus.hatched ? m.contest_hatched() : m.contest_not_hatched();
	} else if (focus.type === "mega") {
		name = focus.restriction === 1 ? m.contest_mega_evolution() : m.contest_not_mega_evolution();
	} else if (focus.type === "shiny") {
		name = focus.shiny ? m.contest_shiny() : m.contest_not_shiny();
	}

	return metric({ name });
}

export function getContestIcon(focus: ContestFocus | undefined) {
	if (focus?.type === "pokemon") {
		return getIconPokemon({ pokemon_id: focus.pokemon_id, form: focus.pokemon_form });
	} else if (focus?.type === "type") {
		return getIconType(focus.pokemon_type_1);
	}
	return getIconContest();
}

export function getDefaultPokestopFilter() {
	return {
		category: "pokestop",
		...defaultFilter(),
		pokestopPlain: { category: "pokestopPlain", ...defaultFilter() },
		quest: { category: "quest", ...defaultFilter() },
		invasion: { category: "invasion", ...defaultFilter() },
		contest: { category: "contest", ...defaultFilter() },
		kecleon: { category: "kecleon", ...defaultFilter() },
		goldPokestop: { category: "goldPokestop", ...defaultFilter() },
		lure: { category: "lure", ...defaultFilter() }
	} as FilterPokestop;
}

export function getActivePokestopFilter() {
	const activeSearch = getActiveSearch();
	if (activeSearch && activeSearch.mapObject === MapObjectType.POKESTOP) {
		return activeSearch.filter as FilterPokestop;
	}
	return getUserSettings().filters.pokestop;
}

export function shouldDisplayIncidient(incident: Incident, pokestop: Partial<PokestopData>) {
	const timestamp = currentTimestamp();

	// only active incidents
	if ((incident.expiration ?? 0) < timestamp) return false;

	if (isCurrentSelectedOverwrite()) return true;

	const pokestopFilters = getActivePokestopFilter();
	if (!pokestopFilters.enabled) return false;

	if (pokestopFilters.goldPokestop.enabled && isIncidentGold(incident)) return true;
	if (pokestopFilters.contest.enabled && isIncidentContest(incident) && shouldDisplayContest(pokestop)) return true;
	if (pokestopFilters.kecleon.enabled && isIncidentKecleon(incident)) return true;

	if (pokestopFilters.invasion.enabled && isIncidentInvasion(incident)) {
		const invasionFilters = pokestopFilters.invasion.filters.filter((f) => f.enabled);
		if (invasionFilters.length === 0) return true;

		for (const invasionFilter of invasionFilters) {
			if (invasionFilter.characters?.includes(incident.character)) return true;
		}
	}

	return false;
}

export function shouldDisplayQuest(
	reward: QuestReward,
	title: string,
	target: number,
	isAr: boolean
) {
	if (isCurrentSelectedOverwrite()) return true;
	const pokestopFilter = getActivePokestopFilter();
	if (!pokestopFilter.enabled || !pokestopFilter.quest.enabled) return false;

	const questFilters = pokestopFilter.quest.filters.filter((f) => f.enabled);
	if (questFilters.length === 0) return true;

	for (const questFilter of questFilters) {
		if (questFilter.ar) {
			if (questFilter.ar === QuestArType.AR && !isAr) continue;
			if (questFilter.ar === QuestArType.NOAR && isAr) continue;
		}

		if (
			questFilter.tasks &&
			!questFilter.tasks.find((t) => t.title === title && t.target === target)
		) {
			continue;
		}

		if (
			questFilter.stardust &&
			reward.type === RewardType.STARDUST &&
			reward.info.amount >= questFilter.stardust.min &&
			reward.info.amount <= questFilter.stardust.max
		) {
			return true;
		}

		if (
			questFilter.xp &&
			reward.type === RewardType.XP &&
			reward.info.amount >= questFilter.xp.min &&
			reward.info.amount <= questFilter.xp.max
		) {
			return true;
		}

		if (
			questFilter.pokemon &&
			reward.type === RewardType.POKEMON &&
			questFilter.pokemon.find(
				(p) => p.pokemon_id === reward.info.pokemon_id && p.form_id === reward.info.form_id
			)
		) {
			return true;
		}

		if (
			questFilter.item &&
			reward.type === RewardType.ITEM &&
			questFilter.item.find(
				(i) =>
					(i.id === reward.info.item_id.toString() && i.amount === undefined) ||
					i.amount === reward.info.amount
			)
		) {
			return true;
		}

		if (
			questFilter.megaResource &&
			reward.type === RewardType.MEGA_ENERGY &&
			questFilter.megaResource.find(
				(i) =>
					(i.id === reward.info.pokemon_id.toString() && i.amount === undefined) ||
					i.amount === reward.info.amount
			)
		) {
			return true;
		}

		if (
			questFilter.candy &&
			reward.type === RewardType.CANDY &&
			questFilter.candy.find(
				(i) =>
					(i.id === reward.info.pokemon_id.toString() && i.amount === undefined) ||
					i.amount === reward.info.amount
			)
		) {
			return true;
		}

		if (
			questFilter.xlCandy &&
			reward.type === RewardType.XL_CANDY &&
			questFilter.xlCandy.find(
				(i) =>
					(i.id === reward.info.pokemon_id.toString() && i.amount === undefined) ||
					i.amount === reward.info.amount
			)
		) {
			return true;
		}
	}

	return false;
}

export function shouldDisplayLure(data: Partial<PokestopData>) {
	if (!hasFortActiveLure(data)) return false;
	if (isCurrentSelectedOverwrite()) return true;
	const pokestopFilters = getActivePokestopFilter();
	if (!pokestopFilters.enabled || !pokestopFilters.lure.enabled) return false;

	const lureFilters = pokestopFilters.lure.filters.filter((f) => f.enabled);
	if (lureFilters.length === 0) return true;
	return lureFilters.some((f) => f.items.includes(data?.lure_id ?? 0));
}

export function shouldDisplayContest(data: Partial<PokestopData>) {
	if ((data.showcase_expiry ?? 0) < currentTimestamp()) return false;
	if (isCurrentSelectedOverwrite()) return true;

	const pokestopFilters = getActivePokestopFilter();
	if (!pokestopFilters.enabled || !pokestopFilters.contest.enabled) return false;

	const contestFilters = pokestopFilters.contest.filters.filter((f) => f.enabled);
	if (contestFilters.length === 0) return true;

	for (const contestFilter of contestFilters) {
		if (
			contestFilter.rankingStandard &&
			contestFilter.rankingStandard !== data.showcase_ranking_standard
		) {
			return false;
		}

		if (contestFilter.focus.pokemon_id && contestFilter.focus.pokemon_id !== data.showcase_pokemon_id) {
			return false
		}

		if (contestFilter.focus.form_id && contestFilter.focus.form_id !== data.showcase_pokemon_form_id) {
			return false
		}

		if (contestFilter.focus.type_id && contestFilter.focus.type_id !== data.showcase_pokemon_type_id) {
			return false
		}
	}

	return true;
}
