import type {
	FiltersetGymPlain,
	FiltersetInvasion,
	FiltersetLure,
	FiltersetMaxBattle,
	FiltersetNest,
	FiltersetPokemon,
	FiltersetPokestopPlain,
	FiltersetQuest,
	FiltersetRaid,
	FiltersetRoute,
	FiltersetS2Cell,
	FiltersetSpawnpoint,
	FiltersetStationPlain,
	FiltersetTappable
} from "@/lib/features/filters/filtersets";

export type FilterCategory =
	| "pokemon"
	| "pokestop"
	| "pokestopPlain"
	| "quest"
	| "invasion"
	| "contest"
	| "kecleon"
	| "goldPokestop"
	| "lure"
	| "route"
	| "gym"
	| "gymPlain"
	| "raid"
	| "station"
	| "stationPlain"
	| "maxBattle"
	| "s2cell"
	| "nest"
	| "spawnpoint"
	| "tappable"

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
	| FilterS2Cell
	| FilterNest
	| FilterSpawnpoint
	| FilterTappable

type BaseFilter = {
	category: FilterCategory;
	enabled: boolean;
};

export type FilterPokemon = BaseFilter & {
	category: "pokemon";
	filters: FiltersetPokemon[];
};

export type FilterPokestop = BaseFilter & {
	category: "pokestop";
	pokestopPlain: FilterPokestopPlain;
	quest: FilterQuest;
	invasion: FilterInvasion;
	contest: FilterContest;
	kecleon: FilterKecleon;
	goldPokestop: FilterGoldPokestop;
	lure: FilterLure;
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
	filters: FiltersetRoute[];
};

export type FilterGym = BaseFilter & {
	category: "gym";
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
	category: "station";
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

export type FilterNest = BaseFilter & {
	category: "nest";
	filters: FiltersetNest[];
}

export type FilterSpawnpoint = BaseFilter & {
	category: "spawnpoint";
	filters: FiltersetSpawnpoint[];
}

export type FilterTappable = BaseFilter & {
	category: "tappable";
	filters: FiltersetTappable[];
}