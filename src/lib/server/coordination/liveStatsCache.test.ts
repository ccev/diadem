import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveStatsCache } from "./liveStatsCache";
import { StatsCoordinator, STATS_LEASE_MS, STATS_REFRESH_MS } from "./statsCoordinator.mjs";
import type { statsRequest } from "./statsTransport";

const key = `live:v1:${"a".repeat(64)}:pokemon`;
const refreshMs = 120_000;
const staleMs = 3_600_000;
const get = { op: "get", key, refreshMs, staleMs };

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

describe("global stats leases", () => {
	it("fences late publications, releases dead owners and preserves last-known-good after errors", () => {
		const broker = new StatsCoordinator();
		const first = broker.handle("worker1", get);
		expect(first.token).toBeDefined();
		expect(broker.handle("worker2", get).token).toBeUndefined();
		broker.release("worker1");
		const second = broker.handle("worker2", get);
		expect(() =>
			broker.handle("worker1", { op: "publish", key, token: first.token, value: 999 })
		).toThrow("Expired");
		broker.handle("worker2", { op: "publish", key, token: second.token, value: 25 });
		vi.advanceTimersByTime(refreshMs);
		const expired = broker.handle("worker1", get);
		vi.advanceTimersByTime(STATS_LEASE_MS);
		const takeover = broker.handle("worker2", get);
		expect(takeover.value).toBe(25);
		expect(takeover.token).toBeDefined();
		expect(() =>
			broker.handle("worker1", { op: "publish", key, token: expired.token, value: 999 })
		).toThrow("Expired");
		broker.handle("worker2", { op: "fail", key, token: takeover.token });
		expect(broker.handle("worker1", get)).toMatchObject({ value: 25, token: undefined });
		vi.advanceTimersByTime(10_000);
		expect(broker.handle("worker1", get).token).toBeDefined();
	});

	it("bounds keys/payloads, rejects invalid publications and does not evict live leases", () => {
		const broker = new StatsCoordinator(Date.now, 1);
		const first = broker.handle("worker1", get);
		expect(() => broker.handle("worker1", { ...get, key: "user-map-data" })).toThrow();
		expect(() =>
			broker.handle("worker2", { ...get, key: key.replace(":pokemon", ":forts") })
		).toThrow("full");
		expect(() =>
			broker.handle("worker1", { op: "publish", key, token: first.token, value: -1 })
		).toThrow();
		vi.advanceTimersByTime(STATS_LEASE_MS);
		expect(
			broker.handle("worker2", { ...get, key: key.replace(":pokemon", ":forts") }).token
		).toBeDefined();
		expect(broker.entries.size).toBe(1);
	});

	it("keeps namespaces separate", () => {
		const broker = new StatsCoordinator();
		broker.handle("worker1", get);
		expect(broker.handle("worker2", { ...get, key: key.replaceAll("a", "b") }).token).toBeDefined();
	});
});

function client(broker: StatsCoordinator, owner: string, load: () => Promise<number>) {
	const request: typeof statsRequest = async (msg) => broker.handle(owner, msg);
	return new LiveStatsCache(key, refreshMs, staleMs, load, request);
}

describe("singleflight stale-while-revalidate", () => {
	it("bounds cold follower waits and backs off rather than starting independent refreshes", async () => {
		const request = vi.fn<typeof statsRequest>().mockResolvedValue({ updatedAt: 0, retryAt: 0 });
		const load = vi.fn().mockResolvedValue(999);
		const worker = new LiveStatsCache(key, refreshMs, staleMs, load, request);
		const waiting = expect(worker.get()).rejects.toThrow("lease timeout");
		await vi.advanceTimersByTimeAsync(STATS_LEASE_MS + 1000);
		await waiting;
		expect(request.mock.calls.length).toBeLessThanOrEqual(461);
		expect(load).not.toHaveBeenCalled();
		await expect(worker.get()).rejects.toThrow("backing off");
	});
	it("shares a cold refresh within and across workers, then refreshes stale data just once", async () => {
		const broker = new StatsCoordinator();
		let finish!: (value: number) => void;
		const load = vi.fn(
			() =>
				new Promise<number>((resolve) => {
					finish = resolve;
				})
		);
		const worker1 = client(broker, "worker1", load);
		const worker2 = client(broker, "worker2", load);
		const requests = [worker1.get(), worker1.get(), worker2.get(), worker2.get()];
		await vi.advanceTimersByTimeAsync(0);
		expect(load).toHaveBeenCalledOnce();
		finish(42);
		await vi.advanceTimersByTimeAsync(100);
		expect(await Promise.all(requests)).toEqual([42, 42, 42, 42]);
		vi.advanceTimersByTime(refreshMs);
		expect(await Promise.all([worker1.get(), worker2.get(), worker1.get()])).toEqual([42, 42, 42]);
		expect(load).toHaveBeenCalledTimes(2);
		finish(43);
		await vi.advanceTimersByTimeAsync(0);
		expect(await worker2.get()).toBe(43);
	});

	it("serves stale after refresh/IPC errors, backs off, and refuses data beyond retention", async () => {
		const broker = new StatsCoordinator();
		const load = vi.fn().mockResolvedValueOnce(7).mockRejectedValue(new Error("backend down"));
		const worker = client(broker, "worker", load);
		expect(await worker.get()).toBe(7);
		vi.advanceTimersByTime(refreshMs);
		expect(await worker.get()).toBe(7);
		await vi.advanceTimersByTimeAsync(0);
		expect(await worker.get()).toBe(7);
		expect(load).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(staleMs + refreshMs);
		await expect(worker.get()).rejects.toThrow("backend down");
		await expect(worker.get()).rejects.toThrow("backing off");

		const request = vi
			.fn<typeof statsRequest>()
			.mockResolvedValueOnce({ value: 9, updatedAt: Date.now(), retryAt: 0 })
			.mockRejectedValue(new Error("IPC down"));
		const cached = new LiveStatsCache(key, refreshMs, staleMs, load, request);
		expect(await cached.get()).toBe(9);
		expect(await cached.get()).toBe(9);
		expect(load).toHaveBeenCalledTimes(3);
	});

	it("times out a hung loader and recovers without an unhandled rejection", async () => {
		const broker = new StatsCoordinator();
		const load = vi
			.fn()
			.mockImplementationOnce(() => new Promise(() => {}))
			.mockResolvedValue(8);
		const worker = client(broker, "worker", load);
		const first = expect(worker.get()).rejects.toThrow("timeout");
		await vi.advanceTimersByTimeAsync(STATS_REFRESH_MS);
		await first;
		vi.advanceTimersByTime(10_000);
		expect(await worker.get()).toBe(8);
	});
});
