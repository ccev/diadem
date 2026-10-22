import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

import { mAlignment, mGeneration, mItem, mPokemon, mType } from "@/lib/services/ingameLocale";
import { getIconContest, getIconPokemon, getIconType } from "@/lib/services/uicons.svelte";
import { defaultFilter, getUserSettings } from "@/lib/services/userSettings.svelte";
import type {
	ContestFocus,
	Incident,
	PokestopData,
	QuestData,
	QuestReward
} from "@/lib/types/mapObjectData/pokestop";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { PokemonVisual } from "$lib/types/mapObjectData/pokemon";

export const CONTEST_SLOTS = 200;
export const INCIDENT_DISPLAY_GOLD = 7;
export const INCIDENT_DISPLAY_KECLEON = 8;
export const INCIDENT_DISPLAY_CONTEST = 9;
export const INCIDENT_DISPLAYS_INVASION = [1, 2, 3];
export const INVASION_CHARACTER_LEADERS = [41, 42, 43, 44, 46];
export const KECLEON_ID = 352;
export const ALL_LURE_IDS = [501, 502, 503, 504, 505, 506];

export enum Character {
	GRUNT_MALE = 4,
	GRUNT_FEMALE = 5,
	GIOVANNI = 44,
	DECOY_MALE = 45,
	DECOY_FEMALE = 46
}

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
	POKEMON_EGG = 16,
	POKEMON_INDIVIDUAL_STAT = 17,
	LOOT_TABLE = 18,
	FRIENDSHIP_POINTS = 19,
	TEMP_EVO_BRANCH_RESOURCE = 20
}

export function parseQuestReward(reward?: string | null) {
	const parsed = JSON.parse(reward ?? "[]")[0] as QuestReward | undefined;
	if (parsed) {
		// @ts-ignore
		parsed.info.form = getNormalizedForm(parsed.info.pokemon_id, parsed.info?.["form_id"] ?? 0);

		if ("form_id" in parsed.info) delete parsed.info["form_id"];
	}
	return parsed;
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

const QUEST_FIELDS = [
	"quest_type",
	"quest_timestamp",
	"quest_target",
	"quest_conditions",
	"quest_rewards",
	"quest_template",
	"quest_title",
	"quest_expiry",
	"quest_reward_type",
	"quest_item_id",
	"quest_reward_amount",
	"quest_pokemon_id",
	"alternative_quest_type",
	"alternative_quest_timestamp",
	"alternative_quest_target",
	"alternative_quest_conditions",
	"alternative_quest_rewards",
	"alternative_quest_template",
	"alternative_quest_title",
	"alternative_quest_expiry",
	"alternative_quest_pokemon_id",
	"alternative_quest_reward_type",
	"alternative_quest_item_id",
	"alternative_quest_reward_amount"
] as const satisfies readonly (keyof PokestopData)[];

const LURE_FIELDS = [
	"lure_id",
	"lure_expire_timestamp"
] as const satisfies readonly (keyof PokestopData)[];

const CONTEST_FIELDS = [
	"showcase_pokemon_id",
	"showcase_pokemon_form_id",
	"showcase_focus",
	"contest_focus",
	"contest_rankings",
	"showcase_pokemon_type_id",
	"showcase_ranking_standard",
	"showcase_expiry",
	"showcase_rankings"
] as const satisfies readonly (keyof PokestopData)[];

export function stripQuestFields(data: Partial<PokestopData>) {
	data.quests = [];
	for (const field of QUEST_FIELDS) delete data[field];
}

export function stripLureFields(data: Partial<PokestopData>) {
	for (const field of LURE_FIELDS) delete data[field];
}

export function stripContestFields(data: Partial<PokestopData>) {
	for (const field of CONTEST_FIELDS) delete data[field];
}

export function getRewardText(reward: QuestReward) {
	switch (reward.type) {
		case RewardType.XP:
			if (!reward.info.amount) return /* @wc-include */ "XP";
			return /* @wc-include */ `${reward.info.amount} XP`;
		case RewardType.ITEM:
			if (!reward.info.amount) return mItem(reward.info.item_id);
			return /* @wc-include */ `${reward.info.amount}x ${mItem(reward.info.item_id)}`;
		case RewardType.STARDUST:
			if (!reward.info.amount) return "Stardust";
			return `${reward.info.amount} Stardust`;
		case RewardType.POKECOINS:
			if (!reward.info.amount) return "Pokécoins";
			return `${reward.info.amount} Pokécoins`;
		case RewardType.CANDY:
			if (!reward.info.amount) return `${mPokemon(reward.info)} Candy`;
			return `${reward.info.amount} ${mPokemon(reward.info)} Candy`;
		case RewardType.POKEMON:
			return mPokemon(reward.info);
		case RewardType.XL_CANDY:
			if (!reward.info.amount) return `${mPokemon(reward.info)} Candy XL`;
			return `${reward.info.amount} ${mPokemon(reward.info)} Candy XL`;
		case RewardType.MEGA_ENERGY:
			if (!reward.info.amount) return `${mPokemon(reward.info)} Mega Energy`;
			return `${reward.info.amount} ${mPokemon(reward.info)} Mega Energy`;
		case RewardType.TEMP_EVO_BRANCH_RESOURCE:
			if (!reward.info.pokemon_id) return "Mega Energy";
			const pokemon: PokemonVisual = {
				pokemon_id: reward.info.pokemon_id,
				form: 0,
				temp_evolution_id: reward.info.temp_evolution
			};

			if (!reward.info.amount) return `${mPokemon(pokemon)} Mega Energy`;

			return `${reward.info.amount} ${mPokemon(pokemon)} Mega Energy`;
		default:
			return rewardTypeLabel(reward.type);
	}
}

export function rewardTypeLabel(rewardType: RewardType) {
	switch (rewardType) {
		case RewardType.XP:
			return /* @wc-include */ "XP";
		case RewardType.ITEM:
			return "Items";
		case RewardType.STARDUST:
			return "Stardust";
		case RewardType.CANDY:
			return "Candy";
		case RewardType.AVATAR_CLOTHING:
			return "Avatar Clothing";
		case RewardType.QUEST:
			return "Quest";
		case RewardType.POKEMON:
			return "Pokémon";
		case RewardType.POKECOINS:
			return "Pokécoins";
		case RewardType.XL_CANDY:
			return "Candy XL";
		case RewardType.LEVEL_CAP:
			return "Level Cap";
		case RewardType.STICKER:
			return "Sticker";
		case RewardType.MEGA_ENERGY:
			return "Mega Energy";
		case RewardType.INCIDENT:
			return "Incident";
		case RewardType.PLAYER_ATTRIBUTE:
			return "Player Attribute";
		case RewardType.EVENT_BADGE:
			return "Event Badge";
		case RewardType.POKEMON_EGG:
			return "Egg";
		case RewardType.TEMP_EVO_BRANCH_RESOURCE:
			return "Mega Energy";
		default:
			return "";
	}
}

export function getQuestKey(questReward: string, questTitle: string, questTarget: number) {
	return /* @wc-ignore */ `${questReward}/${questTitle}/${questTarget}`;
}

export function getContestText(rankingStandard: number, focus: ContestFocus) {
	let metric = ({ name }: { name: string | number }) => `Biggest ${name}`;
	let name = "";

	if (rankingStandard === 1) {
		metric = ({ name }: { name: string | number }) => `Smallest ${name}`;
	}

	if (!focus) return metric({ name });

	if (focus.type === "pokemon") {
		name = mPokemon({ pokemon_id: focus.pokemon_id, form: focus.pokemon_form });
	} else if (focus.type === "type") {
		if (focus.pokemon_type_2) {
			name = `${mType(focus.pokemon_type_1)}- and ${mType(focus.pokemon_type_2)}-Type`;
		} else {
			name = /* @wc-include */ `${mType(focus.pokemon_type_1)}-Type`;
		}
	} else if (focus.type === "buddy") {
		name = `Buddy (Level ${focus.min_level}+)`;
	} else if (focus.type === "alignment") {
		name = mAlignment(focus.pokemon_alignment);
	} else if (focus.type === "class") {
		name =
			({ 1: "Legendary", 2: "Mythic", 3: "Ultra Beast" } as Record<number, string>)[
				focus.pokemon_class
			] ?? "?";
	} else if (focus.type === "family") {
		name = `${mPokemon({ pokemon_id: focus.pokemon_family })} (Evolution line)`;
	} else if (focus.type === "generation") {
		name = mGeneration(focus.generation) + " " + "Pokémon";
	} else if (focus.type === "hatched") {
		name = focus.hatched ? "Hatched Pokémon" : "Non-hatched Pokémon";
	} else if (focus.type === "mega") {
		name = focus.restriction === 1 ? "Mega Evolution" : "Non-Mega Evolution";
	} else if (focus.type === "shiny") {
		name = focus.shiny ? "Shiny" : "Non-Shiny";
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

export function givesQuestBackground(quest: QuestData) {
	return Boolean(
		("background" in quest.reward.info && quest.reward.info.background) ||
		quest.template?.endsWith("_sb") ||
		quest.template?.endsWith("_specialbackground")
	);
}
