import { afterEach, expect, it, vi } from "vitest";
import { IconCache } from "./iconCache";
afterEach(() => vi.useRealTimers());
it("shares concurrent transformations and reuses successful bytes", async () => {
	const cache = new IconCache();
	const load = vi.fn(async () => Buffer.from("icon"));
	const [a, b] = await Promise.all([cache.get("same", load), cache.get("same", load)]);
	expect(a).toEqual(b);
	await cache.get("same", load);
	expect(load).toHaveBeenCalledTimes(1);
});
it("retries failures rather than poisoning the cache", async () => {
	const cache = new IconCache();
	const load = vi.fn().mockRejectedValueOnce(Error("offline")).mockResolvedValue(Buffer.from("ok"));
	await expect(cache.get("a", load)).rejects.toThrow("offline");
	expect(await cache.get("a", load)).toEqual(Buffer.from("ok"));
});
it("bounds bytes with LRU eviction and does not retain oversized outputs", async () => {
	const cache = new IconCache(4);
	const load = vi.fn(async () => Buffer.from("aa"));
	await cache.get("a", load);
	await cache.get("b", load);
	await cache.get("a", load);
	await cache.get("c", load);
	await cache.get("a", load);
	expect(load).toHaveBeenCalledTimes(3);
	await cache.get("b", load);
	expect(load).toHaveBeenCalledTimes(4);
	const large = vi.fn(async () => Buffer.alloc(5));
	await cache.get("large", large);
	await cache.get("large", large);
	expect(large).toHaveBeenCalledTimes(2);
});
it("expires results and keeps cache keys isolated", async () => {
	vi.useFakeTimers();
	const cache = new IconCache(1024, 1, 1000);
	const load = vi.fn(async () => Buffer.from("a"));
	await cache.get("a", load);
	await cache.get("b", load);
	await cache.get("a", load);
	expect(load).toHaveBeenCalledTimes(3);
	vi.advanceTimersByTime(1001);
	await cache.get("a", load);
	expect(load).toHaveBeenCalledTimes(4);
});
