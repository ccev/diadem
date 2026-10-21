import { decryptEncounterId, encryptEncounterId } from "@/lib/server/encounterIdCrypto.mjs";
import { encounterIdKey, getCpuWorkerPool } from "@/lib/server/workers/cpu";
import { CpuWorkerError } from "@/lib/server/workers/pool";
import { TTLCache } from "@isaacs/ttlcache";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encodedIds = encounterIdKey
	? new TTLCache<string, string>({
			max: 1_000_000,
			ttl: 60 * 60 * 1000,
			checkAgeOnGet: true
		})
	: undefined;

/** Cache hits stay local; encrypt only unique missing IDs in one bounded worker job. */
export async function encodeEncounterIds(
	ids: readonly string[],
	signal?: AbortSignal
): Promise<string[]> {
	if (signal?.aborted) throw new CpuWorkerError("aborted");
	const key = encounterIdKey;
	if (!key || !encodedIds) return [...ids];
	const tokens = new Map<string, string | undefined>();
	const missing: string[] = [];
	for (const id of ids) {
		if (tokens.has(id)) continue;
		const cached = encodedIds.get(id);
		tokens.set(id, cached);
		if (cached === undefined) missing.push(id);
	}

	if (missing.length) {
		const pool = getCpuWorkerPool();
		let encrypted: string[];
		if (pool) {
			const output = await pool.run(
				() => encoder.encode(JSON.stringify({ type: "encounterIds", ids: missing })).buffer,
				signal
			);
			try {
				const result: unknown = JSON.parse(decoder.decode(output));
				if (
					!Array.isArray(result) ||
					result.length !== missing.length ||
					!result.every(
						(token) =>
							typeof token === "string" &&
							token.length === 36 &&
							/^pid_[A-Za-z0-9_-]{32}$/.test(token)
					)
				)
					throw new Error("Invalid encounter ID worker output");
				encrypted = result;
			} catch (cause) {
				throw new CpuWorkerError("failed", { cause });
			}
		} else {
			encrypted = missing.map((id) => encryptEncounterId(id, key));
		}
		// Publish to the cache only after the entire batch succeeds and its output is validated.
		for (let i = 0; i < missing.length; i++) {
			tokens.set(missing[i], encrypted[i]);
			encodedIds.set(missing[i], encrypted[i]);
		}
	}
	return ids.map((id) => tokens.get(id)!);
}

/** Stable, authenticated tokens for map keys and shared links, without a nonce or persistent mapping. */
export async function encodeEncounterId(id: string, signal?: AbortSignal): Promise<string> {
	return (await encodeEncounterIds([id], signal))[0];
}

/** Reject raw IDs and invalid tokens while enabled, before they reach Golbat. */
export function decodeEncounterId(id: string): string | undefined {
	return encounterIdKey ? decryptEncounterId(id, encounterIdKey) : id;
}
