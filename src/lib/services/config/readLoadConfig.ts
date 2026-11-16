import { z } from "zod";

const integer = (min: number, max: number, fallback: number) =>
	z.number().int().min(min).max(max).default(fallback);

export const readLoadSchema = z
	.object({
		concurrency: integer(1, 32, 4),
		queueLimit: integer(0, 256, 16),
		queueTimeoutMs: integer(1, 10_000, 1000),
		statementTimeoutMs: integer(100, 60_000, 8000),
		deadline: z.enum(["auto", "mysql", "mariadb"]).default("auto")
	})
	.strict();

export const liveStatsSchema = z
	.object({
		pokemonRefreshSeconds: integer(120, 86_400, 180),
		fortRefreshSeconds: integer(300, 604_800, 3600),
		staleSeconds: integer(3600, 604_800, 86_400)
	})
	.strict();

export type ReadLoadConfig = z.input<typeof readLoadSchema>;
export type LiveStatsConfig = z.input<typeof liveStatsSchema>;
