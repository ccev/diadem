import type {
	FiltersetGymPlain,
	FiltersetInvasion,
	FiltersetLure,
	FiltersetMaxBattle,
	FiltersetPokemon,
	FiltersetPokestopPlain,
	FiltersetQuest,
	FiltersetRaid,
	FiltersetS2Cell,
	FiltersetStationPlain
} from "@/lib/features/filters/filtersets";

export type FilterCategory =
	| "pokemon"
	| "pokestopMajor"
	| "pokestopPlain"
	| "quest"
	| "invasion"
	| "contest"
	| "kecleon"
	| "goldPokestop"
	| "lure"
	| "route"
	| "gymMajor"
	| "gymPlain"
	| "raid"
	| "stationMajor"
	| "stationPlain"
	| "maxBattle"
	| "s2cell";

export type AnyFilter =
	| FilterPokemon
	| FilterPokestop
	| FilterPokestopPlain
	| FilterQuest
	| FilterInvasion
	| FilterContest
	| FilterKecleon
	| FilterGoldPokestop
	| FilterLure
	| FilterRoute
	| FilterGym
	| FilterGymPlain
	| FilterRaid
	| FilterStation
	| FilterStationPlain
	| FilterMaxBattle
	| FilterS2Cell;

type BaseFilter = {
	category: FilterCategory;
	enabled: boolean;
};

export type FilterPokemon = BaseFilter & {
	category: "pokemon";
	filters: FiltersetPokemon[];
};

export type FilterPokestop = BaseFilter & {
	category: "pokestopMajor";
	pokestopPlain: FilterPokestopPlain;
	quest: FilterQuest;
	invasion: FilterInvasion;
	contest: FilterContest;
	kecleon: FilterKecleon;
	goldPokestop: FilterGoldPokestop;
	lure: FilterLure;
	route: FilterRoute;
	filters: never[];
};

export type FilterPokestopPlain = BaseFilter & {
	category: "pokestopPlain";
	filters: FiltersetPokestopPlain[];
};

export type FilterQuest = BaseFilter & {
	category: "quest";
	filters: FiltersetQuest[];
};

export type FilterInvasion = BaseFilter & {
	category: "invasion";
	filters: FiltersetInvasion[];
};

export type FilterContest = BaseFilter & {
	category: "contest";
	filters: never[];
};

export type FilterKecleon = BaseFilter & {
	category: "kecleon";
	filters: never[];
};

export type FilterGoldPokestop = BaseFilter & {
	category: "goldPokestop";
	filters: never[];
};

export type FilterLure = BaseFilter & {
	category: "lure";
	filters: FiltersetLure[];
};

export type FilterRoute = BaseFilter & {
	category: "route";
	filters: never[];
};

export type FilterGym = BaseFilter & {
	category: "gymMajor";
	gymPlain: FilterGymPlain;
	raid: FilterRaid;
	filters: never[];
};

export type FilterGymPlain = BaseFilter & {
	category: "gymPlain";
	filters: FiltersetGymPlain[];
};

export type FilterRaid = BaseFilter & {
	category: "raid";
	filters: FiltersetRaid[];
};

export type FilterStation = BaseFilter & {
	category: "stationMajor";
	stationPlain: FilterStationPlain;
	maxBattle: FilterMaxBattle;
	filters: never[];
};

export type FilterStationPlain = BaseFilter & {
	category: "stationPlain";
	filters: FiltersetStationPlain[];
};

export type FilterMaxBattle = BaseFilter & {
	category: "maxBattle";
	filters: FiltersetMaxBattle[];
};

export type FilterS2Cell = BaseFilter & {
	category: "s2cell";
	filters: FiltersetS2Cell[];
};
