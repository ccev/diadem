import { describe, expect, it } from "vitest";

import type { AnyFilter } from "@/lib/features/filters/filters";
import { recallFilter, rememberFilter } from "@/lib/server/api/filterCache";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

function filter(id: string): AnyFilter {
	return { category: "pokemon", enabled: true, filters: [{ id }] } as unknown as AnyFilter;
}

let nextClient = 0;
/** A fresh key per test — the cache is module state shared across them. */
function client(): string {
	return "c:test-" + nextClient++;
}

describe("filterCache", () => {
	// The first remember for a key is preceded by a lookup that misses. A cache
	// configured to refresh ages on read registers an expiry for that missing key,
	// and the write right after it then disposes a value that was never stored.
	it("remembers a filter the first time it is seen", () => {
		const key = client();
		expect(rememberFilter(key, MapObjectType.POKEMON, "h1", filter("a"))).toBe(true);
		expect(recallFilter(key, MapObjectType.POKEMON, "h1")).toEqual(filter("a"));
	});

	it("remembers after a miss for the same key", () => {
		const key = client();
		expect(recallFilter(key, MapObjectType.POKEMON, "h1")).toBeUndefined();
		expect(rememberFilter(key, MapObjectType.POKEMON, "h1", filter("a"))).toBe(true);
		expect(recallFilter(key, MapObjectType.POKEMON, "h1")).toEqual(filter("a"));
	});

	it("keeps filters of different types apart", () => {
		const key = client();
		rememberFilter(key, MapObjectType.POKEMON, "h", filter("mon"));
		rememberFilter(key, MapObjectType.GYM, "h", filter("gym"));
		expect(recallFilter(key, MapObjectType.POKEMON, "h")).toEqual(filter("mon"));
		expect(recallFilter(key, MapObjectType.GYM, "h")).toEqual(filter("gym"));
	});

	it("misses on an unknown hash", () => {
		const key = client();
		rememberFilter(key, MapObjectType.POKEMON, "h1", filter("a"));
		expect(recallFilter(key, MapObjectType.POKEMON, "h2")).toBeUndefined();
	});

	it("stores a copy, so a later mutation of the caller's object can't leak in", () => {
		const key = client();
		const original = filter("a") as unknown as { filters: { id: string }[] };
		rememberFilter(key, MapObjectType.POKEMON, "h", original as unknown as AnyFilter);
		original.filters[0]!.id = "mutated";

		const recalled = recallFilter(key, MapObjectType.POKEMON, "h") as unknown as {
			filters: { id: string }[];
		};
		expect(recalled.filters[0]!.id).toBe("a");
	});

	it("keeps the actively polled hash when the per-key slots fill up", () => {
		const key = client();
		rememberFilter(key, MapObjectType.POKEMON, "hot", filter("hot"));

		// Poll it, then push four more through the same key.
		for (let i = 0; i < 4; i++) {
			expect(recallFilter(key, MapObjectType.POKEMON, "hot")).toBeDefined();
			rememberFilter(key, MapObjectType.POKEMON, "cold" + i, filter("cold" + i));
		}

		expect(recallFilter(key, MapObjectType.POKEMON, "hot")).toBeDefined();
	});

	// A logged-out client's key is whatever it sent as its id, so one address can
	// mint keys freely. Signed-in entries must not be collateral damage.
	it("does not let anonymous churn evict a signed-in client's filter", () => {
		const user = "u:signed-in-" + nextClient++;
		rememberFilter(user, MapObjectType.POKEMON, "mine", filter("mine"));

		// Far more distinct anonymous identities than a single cache would hold.
		const big = { category: "pokemon", enabled: true, filters: [{ id: "x".repeat(8 * 1024) }] };
		for (let i = 0; i < 1500; i++) {
			rememberFilter("c:churn" + i, MapObjectType.POKEMON, "h" + i, big as unknown as AnyFilter);
		}

		expect(recallFilter(user, MapObjectType.POKEMON, "mine")).toEqual(filter("mine"));
	});

	// The cached object is handed to the query path on every later poll, so a
	// mutation would outlive the request that made it.
	it("hands back a filter that cannot be mutated", () => {
		const key = client();
		rememberFilter(key, MapObjectType.POKEMON, "h", filter("a"));
		const recalled = recallFilter(key, MapObjectType.POKEMON, "h") as unknown as {
			filters: { id: string }[];
		};

		expect(() => (recalled.filters[0]!.id = "mutated")).toThrow(TypeError);
		expect(recalled.filters[0]!.id).toBe("a");
	});

	it("refuses to cache an oversized filter", () => {
		const key = client();
		const huge = {
			category: "pokemon",
			enabled: true,
			filters: [{ id: "x".repeat(20 * 1024) }]
		} as unknown as AnyFilter;
		expect(rememberFilter(key, MapObjectType.POKEMON, "big", huge)).toBe(false);
		expect(recallFilter(key, MapObjectType.POKEMON, "big")).toBeUndefined();
	});
});
