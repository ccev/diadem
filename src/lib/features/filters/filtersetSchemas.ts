import { z } from "zod";
import { IconCategory } from "@/lib/features/filters/icons";

const BaseFiltersetSchema = z.object({
	id: z.string(),
	title: z.object({
		title: z.string().optional(),
		message: z.string(),
		params: z.record(z.string(), z.string()).optional()
	}),
	enabled: z.boolean(),
	icon: z.object({
		isUserSelected: z.boolean(),
		emoji: z.string().optional(),
		uicon: z.object({
			category: z.enum(Object.values(IconCategory)),
			params: z.record(z.string(), z.any())
		}).optional()
	}),
});

const MinMaxSchema = z.object({
	min: z.number(),
	max: z.number()
})

const PokemonSchema = z.object({
	pokemon_id: z.number(),
	form: z.number()
})

const QuestRewardSchema = z.object({
	id: z.string(),
	amount: MinMaxSchema.optional()
})

export const FiltersetPokemonSchema = BaseFiltersetSchema.extend({
	pokemon: z.array(PokemonSchema).optional(),
	iv: MinMaxSchema.optional(),
	cp: MinMaxSchema.optional(),
	ivAtk: MinMaxSchema.optional(),
	ivDef: MinMaxSchema.optional(),
	ivSta: MinMaxSchema.optional(),
	level: MinMaxSchema.optional(),
	gender: z.array(z.number()).optional(),
	size: MinMaxSchema.optional(),
	pvpRankLittle: MinMaxSchema.optional(),
	pvpRankGreat: MinMaxSchema.optional(),
	pvpRankUltra: MinMaxSchema.optional(),
});

export const FiltersetPokestopPlainSchema = BaseFiltersetSchema.extend({
	isSponsored: z.boolean().optional(),
	powerUpLevel: MinMaxSchema.optional(),
	isArScanEligible: z.boolean().optional(),
	hasDetatils: z.boolean().optional(),
});

export const FiltersetQuestSchema = BaseFiltersetSchema.extend({
	ar: z.enum(["ar", "noar", "all"]).optional(),
	pokemon: z.array(PokemonSchema).optional(),
	item: z.array(QuestRewardSchema).optional(),
	megaResource: z.array(QuestRewardSchema).optional(),
	stardust: MinMaxSchema.optional(),
	xp: MinMaxSchema.optional(),
	candy: z.array(QuestRewardSchema).optional(),
	xlCandy: z.array(QuestRewardSchema).optional(),
});

export const FiltersetInvasionSchema = BaseFiltersetSchema.extend({
	characters: z.array(z.number()).optional(),
	rewards: z.array(PokemonSchema).optional(),
});

export const FiltersetLureSchema = BaseFiltersetSchema.extend({
	items: z.array(z.number()),
});

export const FiltersetGymPlainSchema = BaseFiltersetSchema.extend({
	isSponsored: z.boolean().optional(),
	powerUpLevel: MinMaxSchema.optional(),
	isArScanEligible: z.boolean().optional(),
	hasDetatils: z.boolean().optional(),
	defenderAmount: MinMaxSchema.optional(),
});

export const FiltersetRaidSchema = BaseFiltersetSchema.extend({
	levels: z.array(z.number()).optional(),
	bosses: z.array(PokemonSchema).optional(),
	show: z.array(z.enum(["egg", "boss"])).optional(),
});

export const FiltersetStationPlainSchema = BaseFiltersetSchema.extend({});

export const FiltersetMaxBattleSchema = BaseFiltersetSchema.extend({
	levels: z.array(z.number()).optional(),
	bosses: z.array(PokemonSchema).optional(),
	isActive: z.boolean().optional(),
	hasGmax: z.boolean().optional(),
});

export const FiltersetS2CellSchema = BaseFiltersetSchema.extend({
	level: z.number().optional(),
});
