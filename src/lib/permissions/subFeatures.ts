import { Features, type FeaturesKey } from "@/lib/utils/features";
import { MapObjectType, type MapData, type MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import * as m from "@/lib/paraglide/messages";
import type { ModalType } from "@/lib/ui/modal.svelte";
import {
	hasFortActiveLure,
	isIncidentContest,
	isIncidentGold,
	isIncidentInvasion,
	isIncidentKecleon
} from "@/lib/utils/pokestopUtils";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";

// Single source of truth for sub-feature behaviour inside a family
// (pokestop / gym / station). Each entry can describe:
// - server-side scrubbing: `fields` (set to undefined) and `onScrub` (custom)
// - server-side incident gating: `incidentMatcher` (pokestop only)
// - UI row: `filterCategory` + `title` (+ optional `filterModal`, `filterable`)
//
// Adding a new sub-feature: register it once here. Server-side scrubbing
// runs through the registry; the FiltersMenu derives its sub-rows from
// entries that have both `filterCategory` and `title`.

// UI filter categories — only entries that surface in FiltersMenu.
// Server-only sub-features (e.g. defender) leave `filterCategory` unset.
export type PokestopFilterCategory =
	| "pokestopPlain"
	| "quest"
	| "lure"
	| "invasion"
	| "contest"
	| "kecleon"
	| "goldPokestop";
export type GymFilterCategory = "gymPlain" | "raid";
export type StationFilterCategory = "stationPlain" | "maxBattle";

// Only properties whose type already admits `undefined` (i.e. optional
// fields) can go in the `fields` array — assigning undefined to a required
// field would silently break the response shape. Required fields that need
// resetting (e.g. `is_battle_available = 0`) must use `onScrub`.
type ScrubableField<T> = {
	[K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type SubFeatureEntry<Data extends MapData, Cat extends string> = {
	feature: FeaturesKey;
	filterCategory?: Cat;
	title?: () => string;
	filterModal?: ModalType;
	filterable?: boolean;
	fields?: ScrubableField<MinMapObject<Data>>[];
	onScrub?: (data: MinMapObject<Data>) => void;
};

export type PokestopSubFeature = SubFeatureEntry<PokestopData, PokestopFilterCategory> & {
	incidentMatcher?: (incident: Incident) => boolean;
};
export type GymSubFeature = SubFeatureEntry<GymData, GymFilterCategory>;
export type StationSubFeature = SubFeatureEntry<StationData, StationFilterCategory>;

export const POKESTOP_SUB_FEATURES: readonly PokestopSubFeature[] = [
	{
		feature: Features.POKESTOP,
		filterCategory: "pokestopPlain",
		title: m.plain_pokestops,
		filterable: false
	},
	{
		feature: Features.QUEST,
		filterCategory: "quest",
		title: m.pogo_quests,
		filterModal: "filtersetQuest",
		fields: [
			"quest_timestamp",
			"quest_target",
			"quest_rewards",
			"quest_title",
			"quest_expiry",
			"alternative_quest_timestamp",
			"alternative_quest_target",
			"alternative_quest_rewards",
			"alternative_quest_title",
			"alternative_quest_expiry"
		],
		onScrub: (data) => {
			data.quests = [];
		}
	},
	{
		feature: Features.INVASION,
		filterCategory: "invasion",
		title: m.pogo_invasion,
		filterModal: "filtersetInvasion",
		incidentMatcher: isIncidentInvasion
	},
	{
		feature: Features.LURE,
		filterCategory: "lure",
		title: m.lures,
		filterable: false,
		// Conditional clear preserves original behaviour: only an *active*
		// lure exposes "this stop has an active lure right now". Expired
		// lure_id/lure_expire_timestamp survive (they're harmless residue
		// the popup already gates with shouldDisplayLure).
		onScrub: (data) => {
			if (hasFortActiveLure(data)) {
				data.lure_id = undefined;
				data.lure_expire_timestamp = undefined;
			}
		}
	},
	{
		feature: Features.SHOWCASE,
		filterCategory: "contest",
		title: m.contests,
		filterable: false,
		incidentMatcher: isIncidentContest,
		fields: [
			"showcase_pokemon_id",
			"showcase_pokemon_form_id",
			"showcase_focus",
			"showcase_pokemon_type_id",
			"showcase_ranking_standard",
			"showcase_expiry",
			"showcase_rankings",
			"contest_focus"
		]
	},
	{
		feature: Features.KECLEON,
		filterCategory: "kecleon",
		title: m.kecleon,
		filterable: false,
		incidentMatcher: isIncidentKecleon
	},
	{
		feature: Features.GOLD_POKESTOP,
		filterCategory: "goldPokestop",
		title: m.golden_pokestops,
		filterable: false,
		incidentMatcher: isIncidentGold
	}
];

export const GYM_SUB_FEATURES: readonly GymSubFeature[] = [
	{
		feature: Features.GYM,
		filterCategory: "gymPlain",
		title: m.plain_gyms,
		filterable: false
	},
	{
		feature: Features.RAID,
		filterCategory: "raid",
		title: m.raids,
		filterModal: "filtersetRaid",
		fields: [
			"raid_end_timestamp",
			"raid_spawn_timestamp",
			"raid_battle_timestamp",
			"raid_pokemon_id",
			"raid_pokemon_form",
			"raid_pokemon_cp",
			"raid_pokemon_move_1",
			"raid_pokemon_move_2",
			"raid_pokemon_gender",
			"raid_pokemon_costume",
			"raid_pokemon_evolution",
			"raid_pokemon_alignment",
			"raid_level"
		]
	},
	{
		// Server-only: no UI row, but data is scrubbed when perm is denied.
		feature: Features.DEFENDER,
		fields: ["defenders", "rsvps"]
	}
];

export const STATION_SUB_FEATURES: readonly StationSubFeature[] = [
	{
		feature: Features.STATION,
		filterCategory: "stationPlain",
		title: m.plain_stations,
		filterable: false
	},
	{
		feature: Features.DYNAMAX,
		filterCategory: "maxBattle",
		title: m.max_battles,
		filterModal: "filtersetMaxBattle",
		fields: [
			"battle_level",
			"battle_pokemon_id",
			"battle_pokemon_form",
			"battle_pokemon_costume",
			"battle_pokemon_gender",
			"battle_pokemon_alignment",
			"battle_pokemon_bread_mode",
			"battle_pokemon_move_1",
			"battle_pokemon_move_2",
			"total_stationed_pokemon",
			"total_stationed_gmax",
			"stationed_pokemon"
		],
		onScrub: (data) => {
			data.battle_start = undefined;
			data.battle_end = undefined;
			data.is_battle_available = 0;
		}
	}
];

// Map of family -> rich registry, used for server scrubbing and UI derivation.
export const FAMILY_SUB_FEATURES = {
	[MapObjectType.POKESTOP]: POKESTOP_SUB_FEATURES,
	[MapObjectType.GYM]: GYM_SUB_FEATURES,
	[MapObjectType.STATION]: STATION_SUB_FEATURES
} as const satisfies Partial<Record<MapObjectType, readonly { feature: FeaturesKey }[]>>;

// Flat list of sub-feature keys per MapObjectType. Singleton families
// (pokemon, nest, spawnpoint, route, tappable, s2cell) map to themselves —
// this keeps `hasAnySubFeatureAnywhere` uniform across all map object types.
export const MAP_OBJECT_SUB_FEATURES: Record<MapObjectType, FeaturesKey[]> = (() => {
	const result = {} as Record<MapObjectType, FeaturesKey[]>;
	for (const type of Object.values(MapObjectType)) {
		const family = (FAMILY_SUB_FEATURES as Record<string, readonly { feature: FeaturesKey }[]>)[
			type
		];
		result[type] = family ? family.map((e) => e.feature) : [type];
	}
	return result;
})();

// Pre-split semantics: granting `pokestop`/`gym`/`station` was an umbrella
// that included quests/lures/raids/etc. The legacy warning compares config
// rules against these families. Derived from FAMILY_SUB_FEATURES so adding
// a sub-feature updates the warning automatically.
export const LEGACY_UMBRELLA_FAMILIES: Record<string, FeaturesKey[]> = (() => {
	const result: Record<string, FeaturesKey[]> = {};
	for (const [family, entries] of Object.entries(FAMILY_SUB_FEATURES)) {
		const subs = entries.map((e) => e.feature).filter((f) => f !== family);
		if (subs.length > 0) result[family] = subs;
	}
	return result;
})();

// Family wildcard literal type (e.g. `"pokestop*"`, `"pokemon*"`). Allowed
// in config to grant a family + every sub-feature in one token. Non-split
// families expand to themselves so `pokemon*` is just an alias for `pokemon`.
export type FamilyWildcard = `${MapObjectType}*`;

export function isFamilyWildcard(value: string): value is FamilyWildcard {
	if (!value.endsWith("*") || value === "*") return false;
	const family = value.slice(0, -1);
	return (Object.values(MapObjectType) as string[]).includes(family);
}

export function expandFamilyWildcard(wildcard: FamilyWildcard): FeaturesKey[] {
	const family = wildcard.slice(0, -1) as MapObjectType;
	return [...MAP_OBJECT_SUB_FEATURES[family]];
}

// Expand `pokestop*`/`gym*`/`station*`/etc. inline. Unknown tokens pass
// through; checkPerm will treat them as inert.
export function expandFeatures(
	features: ReadonlyArray<FeaturesKey | FamilyWildcard | string>
): FeaturesKey[] {
	const out: FeaturesKey[] = [];
	for (const token of features) {
		if (typeof token === "string" && isFamilyWildcard(token)) {
			for (const f of expandFamilyWildcard(token)) {
				if (!out.includes(f)) out.push(f);
			}
		} else {
			const f = token as FeaturesKey;
			if (!out.includes(f)) out.push(f);
		}
	}
	return out;
}
