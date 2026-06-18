import {
	FiltersetInvasionSchema,
	FiltersetMaxBattleSchema,
	FiltersetPokemonSchema,
	FiltersetQuestSchema,
	FiltersetRaidSchema
} from "@/lib/features/filters/filtersetSchemas";
import { z } from "zod";

export const pushAlertRulesSchema = z.object({
	pokemon: z.array(FiltersetPokemonSchema).max(100).default([]),
	raid: z.array(FiltersetRaidSchema).max(100).default([]),
	quest: z.array(FiltersetQuestSchema).max(100).default([]),
	invasion: z.array(FiltersetInvasionSchema).max(100).default([]),
	maxBattle: z.array(FiltersetMaxBattleSchema).max(100).default([])
});

export const subscriptionSchema = z.object({
	endpoint: z.string().url(),
	keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
});

export const unsubscribeSchema = z.object({ endpoint: z.string().url() });

/** Golbat posts a batched array of { type, message }. */
export const golbatWebhookSchema = z.array(
	z.object({ type: z.string(), message: z.record(z.string(), z.unknown()) })
);
