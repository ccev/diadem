import type { ServerConfig } from "@/lib/services/config/configTypes";
import { TTLCache } from "@isaacs/ttlcache";
import { aeskwp } from "@noble/ciphers/aes.js";
import { createCipheriv, hkdfSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({
	encounterIdObfuscation: undefined as ServerConfig["encounterIdObfuscation"],
	tuning: {} as ServerConfig["tuning"]
}));
vi.mock("$app/environment", () => ({ building: false, dev: true }));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));
vi.mock("@isaacs/ttlcache", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@isaacs/ttlcache")>();
	return { ...actual, TTLCache: vi.fn(class extends actual.TTLCache {}) };
});
vi.mock("node:crypto", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:crypto")>();
	return { ...actual, createCipheriv: vi.fn(actual.createCipheriv) };
});

const secret = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	config.encounterIdObfuscation = { enabled: true, secret };
	config.tuning = {};
});

afterEach(async () => {
	await (
		globalThis as typeof globalThis & { __diademCpuWorkers?: () => Promise<void> | undefined }
	).__diademCpuWorkers?.();
	vi.restoreAllMocks();
});

describe.each([0, 1])("encounter ID encryption (%i worker threads)", (threads) => {
	beforeEach(() => {
		config.tuning = { cpuWorkers: threads };
	});

	it.each(["0", "1", "9007199254740991", "9007199254740993", "18446744073709551615"])(
		"round-trips uint64 ID %s without losing precision",
		async (id) => {
			const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
			const token = await encodeEncounterId(id);
			expect(token).toMatch(/^pid_[A-Za-z0-9_-]{22}$/);
			expect(token).not.toBe(id);
			expect(decodeEncounterId(token)).toBe(id);
		}
	);

	it("keeps tokens stable across calls and server instances using the same key", async () => {
		const first = await import("./encounterIds");
		const token = await first.encodeEncounterId("18446744073709551615");
		expect(await first.encodeEncounterId("18446744073709551615")).toBe(token);
		expect(await first.encodeEncounterId("18446744073709551614")).not.toBe(token);

		vi.resetModules();
		const second = await import("./encounterIds");
		expect(await second.encodeEncounterId("18446744073709551615")).toBe(token);
		expect(second.decodeEncounterId(token)).toBe("18446744073709551615");
	});

	it.each([false, true])("rejects modifications to every byte (legacy: %s)", async (legacy) => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		const token = legacy
			? "pid_9bkW_dTQYqQ1Kj2lO4TAs8o060PxxGPo"
			: await encodeEncounterId("18446744073709551615");
		const encrypted = Buffer.from(token.slice(4), "base64url");
		for (let i = 0; i < encrypted.length; i++) {
			const modified = Buffer.from(encrypted);
			modified[i] ^= 1;
			expect(decodeEncounterId("pid_" + modified.toString("base64url"))).toBeUndefined();
		}
	});

	it.each([
		["0", "pid_kX69sdRS2ZEpaKctGwMSZS1w9uOgYRBA"],
		["9007199254740993", "pid_YbtsvIDt-W-ePrplAG1MVf4yU6rnNfcv"],
		["18446744073709551615", "pid_9bkW_dTQYqQ1Kj2lO4TAs8o060PxxGPo"]
	])("keeps existing SIV links readable for ID %s", async (id, token) => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		expect(decodeEncounterId(token)).toBe(id);
		expect(await encodeEncounterId(id)).toHaveLength(26);
	});

	it("matches an independent KWP implementation and a stable token fixture", async () => {
		const { encodeEncounterId } = await import("./encounterIds");
		const key = new Uint8Array(
			hkdfSync("sha256", Buffer.from(secret, "hex"), "", "diadem:encounter-id:v2", 32)
		);
		const expected = aeskwp(key).encrypt(Buffer.alloc(8, 255));
		expect(await encodeEncounterId("18446744073709551615")).toBe(
			"pid_" + Buffer.from(expected).toString("base64url")
		);
		expect(await encodeEncounterId("18446744073709551615")).toBe("pid_qFYCSTwL4ztemdNnqAtDdg");
	});

	it.each([1, 7])("rejects valid KWP ciphertext with a %s-byte plaintext", async (length) => {
		const { decodeEncounterId } = await import("./encounterIds");
		const key = new Uint8Array(
			hkdfSync("sha256", Buffer.from(secret, "hex"), "", "diadem:encounter-id:v2", 32)
		);
		const encrypted = aeskwp(key).encrypt(Buffer.alloc(length));
		expect(
			decodeEncounterId("pid_" + Buffer.from(encrypted).toString("base64url"))
		).toBeUndefined();
	});

	it("rejects noncanonical base64url encodings of an otherwise valid token", async () => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		const token = await encodeEncounterId("18446744073709551615");
		const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
		const last = alphabet.indexOf(token.at(-1)!);
		for (let bits = 1; bits < 16; bits++) {
			const alias = token.slice(0, -1) + alphabet[last | bits];
			expect(Buffer.from(alias.slice(4), "base64url")).toEqual(
				Buffer.from(token.slice(4), "base64url")
			);
			expect(decodeEncounterId(alias)).toBeUndefined();
		}
	});

	it("uses different tokens for a different secret and rejects the old tokens", async () => {
		const first = await import("./encounterIds");
		const token = await first.encodeEncounterId("12345678901234567890");
		config.encounterIdObfuscation!.secret = "ab".repeat(32);
		vi.resetModules();
		const second = await import("./encounterIds");
		expect(await second.encodeEncounterId("12345678901234567890")).not.toBe(token);
		expect(second.decodeEncounterId(token)).toBeUndefined();
		expect(second.decodeEncounterId("pid_9bkW_dTQYqQ1Kj2lO4TAs8o060PxxGPo")).toBeUndefined();
	});

	it("rejects raw IDs, malformed tokens, and unknown versions", async () => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		const token = await encodeEncounterId("12345678901234567890");
		for (const invalid of [
			"",
			"12345678901234567890",
			"pid_",
			token.replace("pid_", "enc1_"),
			token.slice(0, -1),
			token + "A",
			token + "=",
			token + "\n",
			"pid_" + "/".repeat(32),
			"pid_" + "A".repeat(32)
		]) {
			expect(decodeEncounterId(invalid)).toBeUndefined();
		}
	});

	it.each(["", "-1", "01", "1\n", "1.5", "1e3", "18446744073709551616", "9".repeat(100)])(
		"rejects invalid backend ID %j rather than emitting it",
		async (id) => {
			const { encodeEncounterId } = await import("./encounterIds");
			if (threads) {
				await expect(encodeEncounterId(id)).rejects.toMatchObject({
					code: "failed",
					cause: { message: "Invalid encounter ID from Golbat" }
				});
			} else {
				await expect(encodeEncounterId(id)).rejects.toThrow("Invalid encounter ID from Golbat");
			}
		}
	);

	it.each([
		undefined,
		"",
		"password",
		"a".repeat(63),
		"a".repeat(65),
		"g".repeat(64),
		secret + "\n"
	])("fails closed on startup with an invalid secret (%j)", async (invalid) => {
		config.encounterIdObfuscation!.secret = invalid;
		await expect(import("./encounterIds")).rejects.toThrow(
			"server.encounterIdObfuscation.secret must be a random 32-byte key"
		);
	});

	it.each([undefined, {}, { enabled: false, secret: "invalid" }, { secret }])(
		"preserves the existing ID format when disabled or omitted (%j)",
		async (options) => {
			config.encounterIdObfuscation = options;
			const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
			expect(await encodeEncounterId("18446744073709551615")).toBe("18446744073709551615");
			expect(decodeEncounterId("18446744073709551615")).toBe("18446744073709551615");
			expect(createCipheriv).not.toHaveBeenCalled();
			expect(TTLCache).not.toHaveBeenCalled();
		}
	);
});

describe("encounter ID encryption cache", () => {
	it("only initializes the cache when obfuscation is enabled", async () => {
		await import("./encounterIds");
		expect(TTLCache).toHaveBeenCalledExactlyOnceWith({
			max: 1_000_000,
			ttl: 60 * 60 * 1000,
			checkAgeOnGet: true
		});
	});

	it("reuses encrypted tokens without encrypting again", async () => {
		const { encodeEncounterId } = await import("./encounterIds");
		const token = await encodeEncounterId("18446744073709551615");
		expect(await encodeEncounterId("18446744073709551615")).toBe(token);
		expect(createCipheriv).toHaveBeenCalledTimes(1);

		expect(await encodeEncounterId("18446744073709551614")).not.toBe(token);
		expect(createCipheriv).toHaveBeenCalledTimes(2);
	});

	it("expires after one hour without extending the TTL on cache hits", async () => {
		const now = vi.spyOn(performance, "now").mockReturnValue(0);
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		const token = await encodeEncounterId("18446744073709551615");

		now.mockReturnValue(30 * 60 * 1000);
		expect(await encodeEncounterId("18446744073709551615")).toBe(token);
		now.mockReturnValue(60 * 60 * 1000 - 1);
		expect(await encodeEncounterId("18446744073709551615")).toBe(token);
		expect(createCipheriv).toHaveBeenCalledTimes(1);

		// Even if the purge timer has not run, an expired entry must be recomputed.
		now.mockReturnValue(60 * 60 * 1000);
		expect(await encodeEncounterId("18446744073709551615")).toBe(token);
		expect(createCipheriv).toHaveBeenCalledTimes(2);
		expect(decodeEncounterId(token)).toBe("18446744073709551615");
	});

	it("evicts the oldest entry when the cache limit is exceeded", async () => {
		vi.spyOn(performance, "now").mockReturnValue(0);
		const { encodeEncounterId } = await import("./encounterIds");
		const cache = vi.mocked(TTLCache).mock.results[0].value;
		// Exercise eviction without filling the entire production-size cache.
		cache.max = 2;

		const first = await encodeEncounterId("0");
		await encodeEncounterId("1");
		expect(await encodeEncounterId("0")).toBe(first);
		expect(createCipheriv).toHaveBeenCalledTimes(2);

		const newest = await encodeEncounterId("2");
		expect(await encodeEncounterId("2")).toBe(newest);
		expect(createCipheriv).toHaveBeenCalledTimes(3);
		expect(cache.size).toBe(2);

		expect(await encodeEncounterId("0")).toBe(first);
		expect(createCipheriv).toHaveBeenCalledTimes(4);
		expect(cache.size).toBe(2);
	});

	it("does not cache failed encryptions", async () => {
		const { encodeEncounterId, decodeEncounterId } = await import("./encounterIds");
		vi.mocked(createCipheriv).mockImplementationOnce(() => {
			throw new Error("Encryption failed");
		});
		await expect(encodeEncounterId("18446744073709551615")).rejects.toThrow("Encryption failed");
		const token = await encodeEncounterId("18446744073709551615");
		expect(createCipheriv).toHaveBeenCalledTimes(2);
		expect(decodeEncounterId(token)).toBe("18446744073709551615");
	});
});

describe("encounter ID worker batches", () => {
	beforeEach(() => {
		config.tuning = { cpuWorkers: 1 };
	});

	it("encrypts unique cache misses off-thread, preserves order, and matches compact token fixtures", async () => {
		const { encodeEncounterIds, decodeEncounterId } = await import("./encounterIds");
		const { CpuWorkerPool } = await import("./workers/pool");
		const original = CpuWorkerPool.prototype.run;
		const jobs: unknown[] = [];
		const run = vi.spyOn(CpuWorkerPool.prototype, "run").mockImplementation(function (
			this: InstanceType<typeof CpuWorkerPool>,
			encode,
			signal
		) {
			return original.call(
				this,
				() => {
					const input = encode();
					jobs.push(JSON.parse(new TextDecoder().decode(input)));
					return input;
				},
				signal
			);
		});
		const ids = ["18446744073709551615", "0", "1", "18446744073709551615", "9007199254740993"];
		const tokens = await encodeEncounterIds(ids);
		expect(tokens).toEqual([
			"pid_qFYCSTwL4ztemdNnqAtDdg",
			"pid_SyYjYvbmt4f5WIUIwNGoDg",
			"pid_mEOqjEIdFApcyhSCJT9l1A",
			"pid_qFYCSTwL4ztemdNnqAtDdg",
			"pid_N9jGG-JXp3fFVqUFaZy19w"
		]);
		expect(createCipheriv).not.toHaveBeenCalled(); // The worker has its own real crypto module.
		expect(jobs).toEqual([{ type: "encounterIds", ids: [...new Set(ids)] }]);
		expect(await encodeEncounterIds([...ids].reverse())).toEqual([...tokens].reverse());
		expect(await encodeEncounterIds([])).toEqual([]);
		expect(run).toHaveBeenCalledOnce();
		expect(tokens.map(decodeEncounterId)).toEqual(ids);
	});

	it("keeps the process-wide cache shared across workers and smaller than an individual batch", async () => {
		config.tuning = { cpuWorkers: 2 };
		const { encodeEncounterIds, decodeEncounterId } = await import("./encounterIds");
		const cache = vi.mocked(TTLCache).mock.results[0].value;
		cache.max = 2;
		const ids = ["0", "1", "2", "0", "3"];
		const tokens = await encodeEncounterIds(ids);
		expect(tokens.map(decodeEncounterId)).toEqual(ids);
		expect(cache.size).toBe(2);
		const { CpuWorkerPool } = await import("./workers/pool");
		const run = vi.spyOn(CpuWorkerPool.prototype, "run");
		expect(await encodeEncounterIds(["2", "3"])).toEqual([tokens[2], tokens[4]]);
		expect(run).not.toHaveBeenCalled();
	});

	it("does not cache a partial batch when a worker rejects an invalid ID", async () => {
		const { encodeEncounterIds, decodeEncounterId } = await import("./encounterIds");
		await expect(encodeEncounterIds(["0", "invalid"])).rejects.toMatchObject({ code: "failed" });
		expect(vi.mocked(TTLCache).mock.results[0].value.size).toBe(0);
		const [token] = await encodeEncounterIds(["0"]);
		expect(decodeEncounterId(token)).toBe("0");
	});

	it("shares admission limits with geometry instead of creating a separate encryption pool", async () => {
		config.tuning = { cpuWorkers: 1 };
		const { encodeEncounterIds } = await import("./encounterIds");
		const { checkFeaturesInBoundsServer } = await import("./workers/geometry");
		const { Features } = await import("@/lib/utils/features");
		const geometry = Array.from({ length: 9 }, () =>
			checkFeaturesInBoundsServer(
				{
					everywhere: [],
					areas: [
						{
							name: "test",
							features: [Features.GYM],
							polygon: {
								type: "Polygon",
								coordinates: [
									[
										[0, 0],
										[0, 2],
										[2, 2],
										[2, 0],
										[0, 0]
									]
								]
							}
						}
					]
				},
				[Features.GYM],
				{ minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 }
			)
		);
		await expect(encodeEncounterIds(["0"])).rejects.toMatchObject({ code: "busy" });
		for (const result of await Promise.all(geometry)) {
			expect(result?.polygon?.geometry.type).toBe("Polygon");
		}
		expect(await encodeEncounterIds(["0"])).toEqual(["pid_SyYjYvbmt4f5WIUIwNGoDg"]);
	});

	it.each(["busy", "too-large", "timeout", "aborted", "unavailable", "failed"] as const)(
		"rejects %s without a raw-ID or inline-encryption fallback, while serving cached tokens",
		async (code) => {
			const { encodeEncounterIds } = await import("./encounterIds");
			const cached = await encodeEncounterIds(["0"]);
			const { CpuWorkerPool, CpuWorkerError } = await import("./workers/pool");
			const run = vi
				.spyOn(CpuWorkerPool.prototype, "run")
				.mockRejectedValue(new CpuWorkerError(code));
			await expect(encodeEncounterIds(["0", "1"])).rejects.toMatchObject({ code });
			expect(await encodeEncounterIds(["0"])).toEqual(cached);
			expect(run).toHaveBeenCalledOnce();
			expect(createCipheriv).not.toHaveBeenCalled();
			expect(vi.mocked(TTLCache).mock.results[0].value.has("1")).toBe(false);
		}
	);

	it.each([
		null,
		{},
		[],
		["0"],
		["pid_SyYjYvbmt4f5WIUIwNGoDg", "extra"],
		["pid_kX69sdRS2ZEpaKctGwMSZS1w9uOgYRBA"]
	])(
		"rejects malformed, raw, or mis-sized worker output without caching it: %j",
		async (output) => {
			const { encodeEncounterIds } = await import("./encounterIds");
			const { CpuWorkerPool } = await import("./workers/pool");
			vi.spyOn(CpuWorkerPool.prototype, "run").mockResolvedValue(
				new TextEncoder().encode(JSON.stringify(output)).buffer
			);
			await expect(encodeEncounterIds(["0"])).rejects.toMatchObject({ code: "failed" });
			expect(vi.mocked(TTLCache).mock.results[0].value.size).toBe(0);
			expect(createCipheriv).not.toHaveBeenCalled();
		}
	);

	it("rejects an aborted request before dispatching encryption", async () => {
		const { encodeEncounterIds } = await import("./encounterIds");
		const { CpuWorkerPool } = await import("./workers/pool");
		const run = vi.spyOn(CpuWorkerPool.prototype, "run");
		await expect(encodeEncounterIds(["0"], AbortSignal.abort())).rejects.toMatchObject({
			code: "aborted"
		});
		expect(run).not.toHaveBeenCalled();
		expect(createCipheriv).not.toHaveBeenCalled();
	});

	it.each([
		{ maxTaskBytes: 16, ids: ["0"], code: "too-large" },
		{ maxTaskBytes: 48, ids: ["0", "1"], code: "failed" }
	])("bounds both encryption input and output: %j", async ({ maxTaskBytes, ids, code }) => {
		const cpu = await import("./workers/cpu");
		const { CpuWorkerPool } = await import("./workers/pool");
		const pool = new CpuWorkerPool(
			new URL("./workers/cpu.worker.mjs", import.meta.url),
			{ threads: 1, maxTaskBytes },
			undefined,
			{ encounterIdKey: cpu.encounterIdKey }
		);
		vi.spyOn(cpu, "getCpuWorkerPool").mockReturnValue(pool);
		const { encodeEncounterIds } = await import("./encounterIds");
		try {
			await expect(encodeEncounterIds(ids)).rejects.toMatchObject({ code });
			expect(vi.mocked(TTLCache).mock.results[0].value.size).toBe(0);
		} finally {
			await pool.close();
		}
	});
});
