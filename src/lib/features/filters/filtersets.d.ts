export type AnyFilterst =
	| FiltersetPokemon
	| FiltersetPokestopPlain
	| FiltersetQuest
	| FiltersetInvasion
	| FiltersetLure
	| FiltersetGymPlain
	| FiltersetRaid
	| FiltersetStationPlain
	| FiltersetMaxBattle
	| FiltersetS2Cell

type BaseFilterset = {
	id: string;
	title: string;
	enabled: boolean;
	icon: any;
};

type MinMax = {
	min: number;
	max: number;
};

type Pokemon = { pokemon_id: number; form: number };
type QuestReward = { id: string; amount?: MinMax };

export type FiltersetPokemon = BaseFilterset & {
	pokemon?: Pokemon[];
	iv?: MinMax;
	cp?: MinMax;
	ivAtk?: MinMax;
	ivDef?: MinMax;
	ivSta?: MinMax;
	level?: MinMax;
	gender?: MinMax;
	size?: MinMax;
	pvpRankLittle?: MinMax;
	pvpRankGreat?: MinMax;
	pvpRankUltra?: MinMax;
};

export type FiltersetPokestopPlain = BaseFilterset & {
	isSponsored?: boolean;
	powerUpLevel?: MinMax;
	isArScanEligible?: boolean;
	hasDetatils?: boolean;
};

export type FiltersetQuest = BaseFilterset & {
	ar?: "ar" | "noar" | "all";
	pokemon?: Pokemon[];
	item?: QuestReward[];
	megaResource?: QuestReward[];
	stardust?: MinMax;
	xp?: MinMax;
	candy?: QuestReward[]
	xlCandy?: QuestReward[]
};

export type FiltersetInvasion = BaseFilterset & {
	characters?: number[]
}

export type FiltersetLure = BaseFilterset & {
	items: number[]
}

export type FiltersetGymPlain = BaseFilterset & {
	isSponsored?: boolean;
	powerUpLevel?: MinMax;
	isArScanEligible?: boolean;
	hasDetatils?: boolean;
	defenderAmount?: MinMax
};

export type FiltersetRaid = BaseFilterset & {
	levels?: number[]
	bosses?: Pokemon[]
	hatchState?: "egg" | "boss" | "all"
};

export type FiltersetStationPlain = BaseFilterset & {

}

export type FiltersetMaxBattle = BaseFilterset & {
	levels?: number[]
	bosses?: Pokemon[]
	isActive?: boolean
	hasGmax?: boolean
}

export type FiltersetS2Cell = BaseFilterset & {
	level?: number
}
