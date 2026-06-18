import { z } from "zod";

const minMax = z.object({ min: z.number(), max: z.number() });

export const alertRuleSchema = z.object({
	id: z.string().min(1).max(64),
	enabled: z.boolean(),
	name: z.string().max(120).optional(),
	pokemon: z
		.array(z.object({ pokemon_id: z.number().int(), form: z.number().int().optional() }))
		.optional(),
	iv: minMax.optional(),
	level: minMax.optional(),
	cp: minMax.optional(),
	size: minMax.optional(),
	gender: z.array(z.number().int()).optional()
});

export const alertRulesSchema = z.array(alertRuleSchema).max(50);

export const subscriptionSchema = z.object({
	endpoint: z.string().url(),
	keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
});

export const unsubscribeSchema = z.object({ endpoint: z.string().url() });

/** Golbat posts a batched array of { type, message }. */
export const golbatWebhookSchema = z.array(
	z.object({ type: z.string(), message: z.record(z.string(), z.unknown()) })
);
