import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';

export type PokestopData = {
	id: string
	mapId: string
	type: "pokestop"
	lat: number
	lon: number
	incident: Incident[]
	name?: string
	url?: string
	lure_expire_timestamp?: number
	last_modified_timestamp?: number
	updated: number
	enabled?: number
	quest_type?: number
	quest_timestamp?: number
	quest_target?: number
	quest_conditions?: string
	quest_rewards?: string
	quest_template?: string
	quest_title?: string
	cell_id?: bigint
	deleted: number
	lure_id?: number
	first_seen_timestamp: number
	sponsor_id?: number
	partner_id?: string
	ar_scan_eligible?: number
	power_up_level?: number
	power_up_points?: number
	power_up_end_timestamp?: number
	alternative_quest_type?: number
	alternative_quest_timestamp?: number
	alternative_quest_target?: number
	alternative_quest_conditions?: string
	alternative_quest_rewards?: string
	alternative_quest_template?: string
	alternative_quest_title?: string
	quest_expiry?: number
	alternative_quest_expiry?: number
	description?: string
	quest_reward_type?: number
	quest_item_id?: number
	quest_reward_amount?: number
	quest_pokemon_id?: number
	alternative_quest_pokemon_id?: number
	alternative_quest_reward_type?: number
	alternative_quest_item_id?: number
	alternative_quest_reward_amount?: number
	showcase_pokemon_id?: number
	showcase_pokemon_form_id?: number
	showcase_focus?: string
	showcase_pokemon_type_id?: number
	showcase_ranking_standard?: number
	showcase_expiry?: number
	showcase_rankings?: string
}

export type Incident = {
	id: string
	pokestop_id: string
	start: number
	expiration: number
	display_type: number
	style: number
	character: number
	updated: number
	confirmed: boolean
	slot_1_pokemon_id?: number
	slot_1_form?: number
	slot_2_pokemon_id?: number
	slot_2_form?: number
	slot_3_pokemon_id?: number
	slot_3_form?: number
}

export type ContestEntry = {
	rank: number
	score: number
	pokemon_id: number
	form: number
	costume: number
	gender: number
	shiny: number
	temp_evolution: number
	temp_evolution_finish_ms: number
	alignment: number
	badge: number
	location_card: number
}

export type ContestRankings = {
	total_entries: number
	last_update: number
	contest_entries: ContestEntry[]
}

export type ContestFocus = ContestFocusPokemon
	| ContestFocusType
	| ContestFocusAlignment
	| ContestFocusClass
	| ContestFocusFamily
	| ContestFocusBuddy
	| ContestFocusGeneration
	| ContestFocusHatched
	| ContestFocusTempEvo
	| ContestFocusShiny

export type ContestFocusPokemon = {
	type: "pokemon"
	pokemon_id: number
	pokemon_form?: number
}

export type ContestFocusType = {
	type: "type"
	pokemon_type_1: number
	pokemon_type_2?: number
}

export type ContestFocusAlignment = {
	type: "alignment"
	pokemon_alignment: number
}

export type ContestFocusClass = {
	type: "class"
	pokemon_class: number
}

export type ContestFocusFamily = {
	type: "family"
	pokemon_family: number
}

export type ContestFocusBuddy = {
	type: "buddy"
	min_level: number
}

export type ContestFocusGeneration = {
	type: "generation"
	generation: number
}

export type ContestFocusHatched = {
	type: "hatched"
	hatched: boolean
}

export type ContestFocusTempEvo = {
	type: "mega"
	temp_evolution: number
	restriction: number
}

export type ContestFocusShiny = {
	type: "shiny"
	shiny: boolean
}

export type QuestReward = QuestRewardExperience
	| QuestRewardItem
	| QuestRewardStardust
	| QuestRewardCandy
	| QuestRewardAvatarClothing
	| QuestRewardQuest
	| QuestRewardPokemon
	| QuestRewardPokecoin
	| QuestRewardXlCandy
	| QuestRewardLevelCap
	| QuestRewardSticker
	| QuestRewardMegaResource
	| QuestRewardIncident
	| QuestRewardPlayerAttribute
	| QuestRewardEventBadge
	| QuestRewardPokemonEgg

export type QuestRewardExperience = {
	type: 1
	info: { amount: number }
}

export type QuestRewardItem = {
	type: 2
	info: { item_id: number, amount: number }
}

export type QuestRewardStardust = {
	type: 3
	info: { amount: number }
}

export type QuestRewardCandy = {
	type: 4
	info: { amount: number, pokemon_id: number }
}

export type QuestRewardAvatarClothing = {
	type: 5
	info: {}
}

export type QuestRewardQuest = {
	type: 6
	info: {}
}

export type QuestRewardPokemon = {
	type: 7
	info: Partial<PokemonData>
}

export type QuestRewardPokecoin = {
	type: 8
	info: { amount: number }
}

export type QuestRewardXlCandy = {
	type: 9
	info: { amount: number, pokemon_id: number }
}

export type QuestRewardLevelCap = {
	type: 10
	info: {}
}

export type QuestRewardSticker = {
	type: 11
	info: {}
}

export type QuestRewardMegaResource = {
	type: 12
	info: { amount: number, pokemon_id: number }
}

export type QuestRewardIncident = {
	type: 13
	info: {}
}

export type QuestRewardPlayerAttribute = {
	type: 14
	info: {}
}

export type QuestRewardEventBadge = {
	type: 15
	info: {}
}

export type QuestRewardPokemonEgg = {
	type: 16
	info: {}
}

