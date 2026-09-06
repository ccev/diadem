import { describe, expect, it } from "vitest";

import type { AnyFilter } from "@/lib/features/filters/filters";
import { recallFilter, rememberFilter } from "@/lib/server/api/filterCache";

function filter(id: string): AnyFilter {
	return { category: "pokemon", enabled: true, filters: [{ id }] } as unknown as AnyFilter;
}

describe("filterCache", () => {
	it("remembers filters", () => {
		expect(rememberFilter("h1", filter("a"))).toBe(true);
		expect(recallFilter("h1")).toEqual(filter("a"));
	});

	it("misses on an unknown hash", () => {
		expect(recallFilter("unknown")).toBeUndefined();
	});

	it("refuses to cache an oversized filter", () => {
		const huge = {
			category: "pokemon",
			enabled: true,
			filters: [{ id: "x".repeat(20 * 1024) }]
		} as unknown as AnyFilter;
		expect(rememberFilter("big", huge)).toBe(false);
		expect(recallFilter("big")).toBeUndefined();
	});
});
