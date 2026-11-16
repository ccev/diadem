import { randomUUID } from "node:crypto";

export const STATS_CHANNEL = "diadem:live-stats:v1";
export const STATS_LEASE_MS = 45_000;
export const STATS_REFRESH_MS = 35_000;
export const STATS_RETRY_MS = 10_000;

/** @typedef {number | Record<string, number>} StatsValue */
/** @typedef {{ value?: StatsValue, updatedAt: number, retryAt: number, token?: string }} Snapshot */
/** @typedef {{ value?: StatsValue, updatedAt: number, retryAt: number, lease?: { owner: string, token: string, until: number } }} Entry */

/** Only small global counters are accepted. This is deliberately not a map-result cache. */
function validValue(/** @type {unknown} */ value) {
	const count = (/** @type {unknown} */ n) => Number.isSafeInteger(n) && Number(n) >= 0;
	return (
		count(value) ||
		(value !== null &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			Object.keys(value).length <= 10 &&
			Object.entries(value).every(([key, n]) => /^[a-z]{1,32}$/.test(key) && count(n)))
	);
}

/** Bounded primary-owned last-known-good cache with expiring, fenced refresh leases. */
export class StatsCoordinator {
	/** @type {Map<string, Entry>} */
	entries = new Map();

	constructor(/** @type {() => number} */ now = Date.now, /** @type {number} */ maxEntries = 32) {
		this.now = now;
		this.maxEntries = maxEntries;
	}

	/** @returns {Snapshot} */
	handle(/** @type {string} */ owner, /** @type {unknown} */ input) {
		if (!input || typeof input !== "object") throw new Error("Invalid stats message");
		const msg = /** @type {Record<string, unknown>} */ (input);
		if (typeof msg.key !== "string" || !/^live:v1:[a-f0-9]{64}:(pokemon|forts)$/.test(msg.key))
			throw new Error("Invalid stats key");
		const now = this.now();
		let entry = this.entries.get(msg.key);
		if (!entry) {
			if (msg.op !== "get") throw new Error("Unknown stats entry");
			if (this.entries.size >= this.maxEntries) {
				const victim = [...this.entries].find(([, e]) => !e.lease || e.lease.until <= now);
				if (!victim) throw new Error("Stats cache full");
				this.entries.delete(victim[0]);
			}
			entry = { updatedAt: 0, retryAt: 0 };
			this.entries.set(msg.key, entry);
		}
		// LRU order; never evict a live refresh lease.
		this.entries.delete(msg.key);
		this.entries.set(msg.key, entry);
		if (entry.lease && entry.lease.until <= now) entry.lease = undefined;
		if (msg.op === "get") {
			const { refreshMs, staleMs } = msg;
			if (
				!Number.isSafeInteger(refreshMs) ||
				Number(refreshMs) < 120_000 ||
				Number(refreshMs) > 604_800_000 ||
				!Number.isSafeInteger(staleMs) ||
				Number(staleMs) < 3_600_000 ||
				Number(staleMs) > 604_800_000
			)
				throw new Error("Invalid stats durations");
			const fresh = entry.value !== undefined && now - entry.updatedAt < Number(refreshMs);
			let token;
			if (!fresh && !entry.lease && entry.retryAt <= now) {
				token = randomUUID();
				entry.lease = { owner, token, until: now + STATS_LEASE_MS };
			}
			return {
				value:
					entry.value !== undefined && now - entry.updatedAt < Number(refreshMs) + Number(staleMs)
						? entry.value
						: undefined,
				updatedAt: entry.updatedAt,
				retryAt: entry.retryAt,
				token
			};
		}
		if (!entry.lease || entry.lease.owner !== owner || entry.lease.token !== msg.token)
			throw new Error("Expired stats lease");
		if (msg.op === "publish" && validValue(msg.value)) {
			entry.value = /** @type {StatsValue} */ (msg.value);
			entry.updatedAt = now;
			entry.retryAt = 0;
		} else if (msg.op === "fail") {
			entry.retryAt = now + STATS_RETRY_MS;
		} else {
			throw new Error("Invalid stats publication");
		}
		entry.lease = undefined;
		return { value: entry.value, updatedAt: entry.updatedAt, retryAt: entry.retryAt };
	}

	release(/** @type {string} */ owner) {
		for (const entry of this.entries.values()) {
			if (entry.lease?.owner === owner) entry.lease = undefined;
		}
	}
}

/** Install only in the provided cluster primary. No IPC waiters are retained here. */
export function installStatsCoordinator(/** @type {import("node:cluster").Cluster} */ cluster) {
	const coordinator = new StatsCoordinator();
	cluster.on("message", (worker, message) => {
		if (
			message?.channel !== STATS_CHANNEL ||
			typeof message.id !== "string" ||
			message.id.length > 64
		)
			return;
		let result;
		let failed = false;
		try {
			result = coordinator.handle(String(worker.id), message);
		} catch {
			failed = true;
		}
		if (worker.isConnected()) {
			try {
				worker.send({ channel: STATS_CHANNEL, id: message.id, result, failed }, () => {});
			} catch {
				// A worker can disconnect between the connected check and send.
			}
		}
	});
	cluster.on("exit", (worker) => coordinator.release(String(worker.id)));
	cluster.on("disconnect", (worker) => coordinator.release(String(worker.id)));
	return coordinator;
}
