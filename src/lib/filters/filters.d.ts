export type FilterCategory = "pokemonMajor"
	| "pokestopMajor"
	| "pokestopPlain"
	| "quest"
	| "invasion"
	| "contest"
	| "lure"
	| "gymMajor"
	| "gymPlain"
	| "raid"
	| "stationMajor"

export type AllFilters = FilterPokemon
	| FilterPokestopMajor
	| FilterPokestopPlain
	| FilterQuest
	| FilterInvasion
	| FilterContest
	| FilterLure
	| FilterGymMajor
	| FilterGymPlain
	| FilterRaid
	| FilterStationMajor

export type FilterTypeBool = "all" | "none"
export type FilerType = "all" | "none" | "filtered"

type minMax = {
	min?: number
	max?: number
}

export type FilterPokemon = {
	category: "pokemonMajor"
	type: FilterType
	filters?: {
		title: string
		enabled: boolean
		icon: any
		pokemon?: { id?: number, form?: number }
		iv?: minMax
		cp?: minMax
		ivAtk?: minMax
		ivDef?: minMax
		ivSta?: minMax
		level?: minMax
		gender?: minMax
		size?: minMax
		pvpRankLittle?: minMax
		pvpRankGreat?: minMax
		pvpRankUltra?: minMax
	}[]
}

export type FilterPokestopMajor = {
	category: "pokestopMajor"
	type: FilterTypeBool
}

export type FilterPokestopPlain = {
	category: "pokestopPlain"
	type: FilterTypeBool
	// sponsored, power up level, ar scan eligible, has image/name/description
}

export type FilterQuest = {
	category: "quest"
	type: FilerType
	filters?: {

	}
}

export type FilterInvasion = {
	category: "invasion"
	type: FilerType
	filters?: {

	}
}

export type FilterContest = {
	category: "contest"
	type: FilerType
	filters?: {

	}
}

export type FilterLure = {
	category: "lure"
	type: FilerType
	filters?: {

	}
}

export type FilterGymMajor = {
	category: "gymMajor"
	type: FilterTypeBool
}

export type FilterGymPlain = {
	category: "gymPlain"
	type: FilterTypeBool
}

export type FilterRaid = {
	category: "raid"
	type: FilterType
	filters?: {

	}
}

export type FilterStationMajor = {
	category: "stationMajor"
	type: FilterTypeBool
}
