import * as m from "@/lib/paraglide/messages";
import type { IconCategory } from "@/lib/features/filters/icons";
import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
import type { RewardType } from '@/lib/utils/pokestopUtils';

export type AnyFilterset =
	| FiltersetPokemon
	| FiltersetPokestopPlain
	| FiltersetQuest
	| FiltersetInvasion
	| FiltersetLure
	| FiltersetGymPlain
	| FiltersetRaid
	| FiltersetStationPlain
	| FiltersetMaxBattle
	| FiltersetS2Cell;

// remember to update zod schemas when editing filterset types!

export type BaseFilterset = {
	id: string;
	title: {
		// a user-selected name
		title?: string;

		// an auto-generated, localized name
		message: keyof typeof m;
	};
	enabled: boolean;
	icon: {
		isUserSelected: boolean;
		emoji?: string;
		uicon?: {
			category: IconCategory;
			params: { [key: string]: any };
		};
	};
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
	gender?: number[];
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
	ar?: QuestArType;
	rewardType?: RewardType;
	title?: string
	target?: number
	pokemon?: Pokemon[];
	item?: QuestReward[];
	megaResource?: QuestReward[];
	stardust?: MinMax;
	xp?: MinMax;
	candy?: QuestReward[];
	xlCandy?: QuestReward[];
};

export type FiltersetInvasion = BaseFilterset & {
	characters?: number[];
};

export type FiltersetLure = BaseFilterset & {
	items: number[];
};

export type FiltersetGymPlain = BaseFilterset & {
	isSponsored?: boolean;
	powerUpLevel?: MinMax;
	isArScanEligible?: boolean;
	hasDetatils?: boolean;
	defenderAmount?: MinMax;
};

export type RaidFilterShow = "egg" | "boss"

export type FiltersetRaid = BaseFilterset & {
	levels?: number[];
	bosses?: Pokemon[];
	show?: RaidFilterShow[];
};

export type FiltersetStationPlain = BaseFilterset & {};

export type FiltersetMaxBattle = BaseFilterset & {
	levels?: number[];
	bosses?: Pokemon[];
	isActive?: boolean;
	hasGmax?: boolean;
};

export type FiltersetS2Cell = BaseFilterset & {
	level?: number;
};
