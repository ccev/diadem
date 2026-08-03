import type { MinMax } from "@/lib/features/filters/filtersets";

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

/** One DNF clause: conditions AND within, clauses OR across. Omitted field = no constraint. */
export type GolbatFortDnfFilter = {
	is_ar_scan_eligible?: boolean;
	// gym
	available_slots?: { min: number; max: number };
	team_id?: number[];
	raid_level?: number[];
	raid_pokemon_id?: GolbatDnfId[];
	// pokestop
	lure_id?: number[];
	quest_reward_type?: number[];
	quest_reward_amount?: { min: number; max: number };
	quest_reward_item_id?: number[];
	quest_reward_pokemon?: GolbatDnfId[];
	incident_display_type?: number[];
	incident_character?: number[];
	contest_pokemon?: GolbatDnfId[];
	contest_pokemon_type?: number[];
	// station
	battle_level?: number[];
	battle_pokemon?: GolbatDnfId[];
	stationed_gmax?: boolean;
	station_active?: boolean;
};

export type FortScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	filters?: GolbatFortDnfFilter[];
	with_incidents?: boolean;
};

export type FortAvailability = {
	gyms: { raids: { raid_level: number; pokemon_id: number | null; form: number | null }[] };
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
		showcases: { pokemon_id: number | null; form: number | null; type_id: number | null }[];
	};
	stations: {
		battles: { battle_level: number; pokemon_id: number | null; form: number | null }[];
	};
};
