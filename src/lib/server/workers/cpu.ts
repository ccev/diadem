import { building, dev } from "$app/environment";
import { deriveEncounterIdKey } from "@/lib/server/encounterIdCrypto.mjs";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { resolve } from "node:path";
import { CpuWorkerError, CpuWorkerPool } from "./pool";

const config = getServerConfig();
// Validate at startup, including when the pool is disabled. Workers receive only this derived key.
export const encounterIdKey = config.encounterIdObfuscation?.enabled
	? deriveEncounterIdKey(config.encounterIdObfuscation.secret)
	: undefined;

let pool: CpuWorkerPool | undefined;
let stopped = false;
const runtime = globalThis as typeof globalThis & {
	__diademCpuWorkers?: typeof closeCpuWorkers;
};

// Vite's SSR loader does not provide import.meta.hot. Retire the previous module's pool.
if (dev && !building) {
	const previous = runtime.__diademCpuWorkers;
	runtime.__diademCpuWorkers = closeCpuWorkers;
	void previous?.();
}

export function initCpuWorkers() {
	if (building) return;
	if (stopped) throw new CpuWorkerError("unavailable");
	if (pool) return;
	const log = getLogger("cpu-workers");
	const settings = config.tuning;
	if (
		settings !== undefined &&
		(!settings || typeof settings !== "object" || Array.isArray(settings))
	) {
		throw new TypeError("server.tuning must be a table");
	}
	const threads = settings?.cpuWorkers ?? 0;
	if (!Number.isSafeInteger(threads) || threads < 0) {
		throw new RangeError("server.tuning.cpuWorkers must be an integer >= 0");
	}
	pool = new CpuWorkerPool(
		resolve(dev ? "src/lib/server/workers/cpu.worker.mjs" : "build/server/workers/cpu.worker.mjs"),
		{ threads },
		(error) => log.error("CPU pool stopped after a worker error: %s", error),
		{ encounterIdKey }
	);
	if (pool.enabled) {
		log.info(
			"CPU workers enabled | threads: %d | queue: %d",
			pool.options.threads,
			pool.options.maxQueue
		);
		process.on("sveltekit:shutdown", closeCpuWorkers);
	}
}

export function getCpuWorkerPool() {
	initCpuWorkers();
	return pool?.enabled ? pool : undefined;
}

export function closeCpuWorkers() {
	stopped = true;
	process.off("sveltekit:shutdown", closeCpuWorkers);
	if (runtime.__diademCpuWorkers === closeCpuWorkers) delete runtime.__diademCpuWorkers;
	return pool?.close();
}
