import { describe, expect, it } from "vitest";

import { getFilterHash, stableStringify } from "@/lib/utils/filterHash";

describe("stableStringify", () => {
	it("is independent of key order", () => {
		expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
	});

	it("keeps array order significant", () => {
		expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
	});

	it("drops undefined properties", () => {
		expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
	});

	it("preserves null properties", () => {
		expect(stableStringify({ a: 1, b: null })).not.toBe(stableStringify({ a: 1 }));
	});

	it("uses JSON semantics for non-finite numbers", () => {
		expect(stableStringify({ min: 0, max: Infinity })).toBe(stableStringify({ min: 0, max: null }));
		expect(stableStringify({ n: NaN })).toBe(stableStringify({ n: null }));
	});

	it("sorts nested keys", () => {
		expect(stableStringify({ x: { b: 1, a: [{ d: 1, c: 2 }] } })).toBe(
			'{"x":{"a":[{"c":2,"d":1}],"b":1}}'
		);
	});
});

describe("getFilterHash", () => {
	it("matches for structurally equal filters", () => {
		const a = {
			category: "pokemon",
			enabled: true,
			filters: [{ id: "1", iv: { min: 100, max: 100 } }]
		};
		const b = {
			enabled: true,
			filters: [{ iv: { max: 100, min: 100 }, id: "1" }],
			category: "pokemon"
		};
		expect(getFilterHash(a)).toBe(getFilterHash(b));
	});

	it("differs when a value changes", () => {
		expect(getFilterHash({ enabled: true })).not.toBe(getFilterHash({ enabled: false }));
	});

	it("returns a sha-256 digest", () => {
		expect(getFilterHash({ enabled: true })).toMatch(/^[0-9a-f]{64}$/);
	});

	it("returns undefined without a filter", () => {
		expect(getFilterHash(undefined)).toBeUndefined();
	});
});
