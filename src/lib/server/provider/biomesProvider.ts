import { getServerConfig } from "@/lib/services/config/config.server";
import type { BiomePools, BiomeProfile } from "@/lib/types/mapObjectData/biome";
import { getLogger } from "@/lib/utils/logger";
import { TTLCache } from "@isaacs/ttlcache";
import { error } from "@sveltejs/kit";
import { z } from "zod";

const log = getLogger("biomes");
const CACHE_TTL = 60_000;
const MAX_CONCURRENT_REQUESTS = 4;
const probability = z.number().min(0).max(1);

const profileSchema = z.object({
	cell_id: z.string(),
	fields: z
		.looseObject({
			landform: z.number().int().optional(),
			landcover: z.number().int().optional(),
			temperature: z.number().int().optional(),
			features: z.array(z.number().int()).optional()
		})
		.nullable(),
	geography_updated_at: z.number().nonnegative().optional(),
	pools_updated_at: z.number().nonnegative().optional()
});

const profilesResponseSchema = z.object({ biomes: z.array(profileSchema) });

const spawnsSchema = z.array(
	z.object({
		pokemon_id: z.number().int().positive(),
		form: z.number().int(),
		weight: probability
	})
);

const poolsSchema = z.object({
	cell_id: z.string(),
	components: z.array(
		z.union([
			z.object({ name: z.string().nullable(), share: probability, spawns: spawnsSchema }),
			z.object({
				name: z.string().nullable(),
				share: probability,
				variants: z.array(z.object({ spawns: spawnsSchema }))
			})
		])
	)
});

export class BiomesProvider {
	private profiles = new TTLCache<string, BiomeProfile>({ max: 50_000, ttl: CACHE_TTL });
	private pools = new TTLCache<string, BiomePools>({ max: 1_000, ttl: CACHE_TTL });
	private pendingProfiles = new Map<string, Promise<BiomeProfile>>();
	private pendingPools = new Map<string, Promise<BiomePools>>();
	private activeRequests = 0;
	private requestQueue: (() => void)[] = [];

	get enabled(): boolean {
		return Boolean(getServerConfig().biomes?.url?.trim());
	}

	private async request(path: string, thisFetch: typeof fetch, cells?: string[]): Promise<unknown> {
		const config = getServerConfig().biomes;
		const baseUrl = config?.url?.trim();
		if (!baseUrl) error(404, "Biomes are disabled");

		while (this.activeRequests >= MAX_CONCURRENT_REQUESTS) {
			await new Promise<void>((resolve) => this.requestQueue.push(resolve));
		}
		this.activeRequests++;

		try {
			const url = new URL(path, baseUrl.replace(/\/?$/, "/"));
			const headers: Record<string, string> = { Accept: "application/json" };
			if (config?.secret) headers.Authorization = `Bearer ${config.secret}`;
			const options: RequestInit = {
				method: "GET",
				headers,
				signal: AbortSignal.timeout(15_000)
			};
			if (cells) {
				options.method = "POST";
				options.body = JSON.stringify({ cells });
				headers["Content-Type"] = "application/json";
			}

			const response = await thisFetch(url, options);
			if (!response.ok) {
				await response.body?.cancel();
				throw new Error(`HTTP ${response.status}`);
			}
			return await response.json();
		} catch (e) {
			log.warning("Biomes request failed (%s)", e instanceof Error ? e.name : "unknown error");
			error(502, "Biome service unavailable");
		} finally {
			this.activeRequests--;
			this.requestQueue.shift()?.();
		}
	}

	async getProfiles(ids: string[], thisFetch: typeof fetch = fetch): Promise<BiomeProfile[]> {
		if (!this.enabled) error(404, "Biomes are disabled");

		const missing = [...new Set(ids)].filter(
			(id) => !this.profiles.has(id) && !this.pendingProfiles.has(id)
		);

		if (missing.length > 0) {
			const pending = this.request("api/biomes", thisFetch, missing)
				.then((response) => {
					const parsed = profilesResponseSchema.safeParse(response);
					if (!parsed.success || parsed.data.biomes.length !== missing.length) {
						error(502, "Invalid biome service response");
					}
					const profiles = parsed.data.biomes;
					if (profiles.some((profile, index) => profile.cell_id !== missing[index])) {
						error(502, "Invalid biome cell in service response");
					}

					for (const profile of profiles) {
						this.profiles.set(profile.cell_id, profile);
					}
					return profiles;
				})
				.finally(() => {
					for (const id of missing) this.pendingProfiles.delete(id);
				});

			for (const [index, id] of missing.entries()) {
				this.pendingProfiles.set(
					id,
					pending.then((profiles) => profiles[index])
				);
			}
		}

		return Promise.all(ids.map((id) => this.profiles.get(id) ?? this.pendingProfiles.get(id)!));
	}

	async getPools(id: string, thisFetch: typeof fetch = fetch): Promise<BiomePools> {
		if (!this.enabled) error(404, "Biomes are disabled");
		const cached = this.pools.get(id);
		if (cached) return cached;
		const existing = this.pendingPools.get(id);
		if (existing) return existing;

		const pending = this.request(`api/biomes/${encodeURIComponent(id)}/pools`, thisFetch)
			.then((response) => {
				const parsed = poolsSchema.safeParse(response);
				if (!parsed.success || parsed.data.cell_id !== id)
					error(502, "Invalid biome pool response");
				this.pools.set(id, parsed.data);
				return parsed.data;
			})
			.finally(() => this.pendingPools.delete(id));
		this.pendingPools.set(id, pending);
		return pending;
	}
}

export const biomesProvider = new BiomesProvider();
