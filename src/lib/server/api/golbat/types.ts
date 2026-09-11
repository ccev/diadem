import type { MinMax } from "@/lib/features/filters/filtersets";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { GymData, GymDefender, Rsvp } from "@/lib/types/mapObjectData/gym";
import type { ContestFocus, Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { StationData } from "@/lib/types/mapObjectData/station";

export type GolbatPokemonSpecies = { id: number; form?: number };

export type GolbatPokemonQuery = {
	pokemon?: GolbatPokemonSpecies[];
	iv?: MinMax;
	atk_iv?: MinMax;
	def_iv?: MinMax;
	sta_iv?: MinMax;
	level?: MinMax;
	cp?: MinMax;
	gender?: number[];
	size?: MinMax;
	pvp_little?: MinMax;
	pvp_great?: MinMax;
	pvp_ultra?: MinMax;
};

export type GolbatDnfId = { pokemon_id: number; form?: number };

export type GolbatFortDnfFilter = {
	is_ar_scan_eligible?: boolean;
	available_slots?: MinMax;
	team_id?: number[];
	raid_level?: number[];
	raid_pokemon_id?: GolbatDnfId[];
	raid_temp_evolution_id?: number[];
	lure_id?: number[];
	quest_reward_type?: number[];
	quest_reward_amount?: MinMax;
	quest_reward_item_id?: number[];
	quest_reward_pokemon?: GolbatDnfId[];
	incident_display_type?: number[];
	incident_character?: number[];
	contest_pokemon?: GolbatDnfId[];
	contest_pokemon_type?: number[];
	contest_focus?: { type: "buddy"; min_level: number }[];
	contest_ranking_standard?: number[];
	battle_level?: number[];
	battle_pokemon?: GolbatDnfId[];
	stationed_gmax?: boolean;
	station_active?: boolean;
	battle_available?: boolean;
};

export type FortScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	filters?: GolbatFortDnfFilter[];
	with_incidents?: boolean;
};

export type GolbatStatus = {
	features: { fort_in_memory: boolean };
	limits: { max_fort_results: number };
};

export type FortAvailability = {
	gyms: {
		raids: {
			raid_level: number;
			pokemon_id: number | null;
			form: number | null;
			temp_evolution_id: number;
		}[];
	};
	pokestops: {
		quests: {
			with_ar: boolean;
			reward_type: number;
			item_id: number;
			amount: number;
			pokemon_id: number;
			form_id: number;
			title: string;
			target: number;
			count: number;
		}[];
		invasions: { character: number; display_type: number; confirmed: boolean }[];
		lures: { lure_id: number }[];
		showcases: {
			pokemon_id: number | null;
			form: number | null;
			type_id: number | null;
			ranking_standard: number;
			showcase_focus: ContestFocus | null;
		}[];
	};
	stations: {
		battles: { battle_level: number; pokemon_id: number | null; form: number | null }[];
	};
};

export type PokemonScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	filters: GolbatPokemonQuery[];
};

export type FortTypeScanGroup = { filters?: GolbatFortDnfFilter[]; limit: number };

export type FortCombinedScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	with_incidents?: boolean;
	gyms?: FortTypeScanGroup;
	pokestops?: FortTypeScanGroup;
	stations?: FortTypeScanGroup;
};

export type FortTypeScanStats = { examined: number; limit_reached: boolean };

export type PokemonResponse = {
	pokemon: MinMapObject<PokemonData>[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};

export type GolbatGymResult = Omit<
	MinMapObject<GymData>,
	"availble_slots" | "defenders_raw" | "defenders" | "raw_rsvps" | "rsvps" | "deleted"
> & {
	available_slots?: number | null;
	deleted: boolean;
	defenders?: GymDefender[] | null;
	rsvps?: Rsvp[] | null;
};

export type GolbatPokestopResult = Omit<
	MinMapObject<PokestopData>,
	| "incident"
	| "deleted"
	| "quest_rewards"
	| "alternative_quest_rewards"
	| "showcase_focus"
	| "showcase_rankings"
> & {
	deleted: boolean;
	invasions?: Incident[];
	quest_rewards?: object[] | string | null;
	alternative_quest_rewards?: object[] | string | null;
	quest_pokemon_form_id?: number | null;
	alternative_quest_pokemon_form_id?: number | null;
	showcase_focus?: object | string | null;
	showcase_rankings?: object | string | null;
};

export type GolbatStationResult = Omit<
	MinMapObject<StationData>,
	| "is_inactive"
	| "is_battle_available"
	| "stationed_pokemon"
	| "raw_stationed_pokemon"
	| "battle_start"
	| "battle_end"
> & {
	is_inactive: boolean;
	is_battle_available: boolean;
	stationed_pokemon?: object[] | string | null;
	battles?: object[];
	battle_start?: number | null;
	battle_end?: number | null;
};

export type GymScanResponse = {
	gyms: GolbatGymResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
};
export type PokestopScanResponse = {
	pokestops: GolbatPokestopResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
};
export type StationScanResponse = {
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
};
export type FortCombinedScanResponse = {
	gyms: GolbatGymResult[];
	pokestops: GolbatPokestopResult[];
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
	gyms_stats: FortTypeScanStats;
	pokestops_stats: FortTypeScanStats;
	stations_stats: FortTypeScanStats;
};
