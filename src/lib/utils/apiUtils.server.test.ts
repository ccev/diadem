import { describe, it, expect } from "vitest";
import { cacheHttpHeaders } from "./apiUtils.server";

describe("cacheHttpHeaders", () => {
	it("returns default 120-day cache age", () => {
		expect(cacheHttpHeaders()).toEqual({
			"Cache-Control": `public, max-age=${86400 * 120}`
		});
	});

	it("uses custom age", () => {
		expect(cacheHttpHeaders(3600)).toEqual({
			"Cache-Control": "public, max-age=3600"
		});
	});

	it("handles zero age", () => {
		expect(cacheHttpHeaders(0)).toEqual({
			"Cache-Control": "public, max-age=0"
		});
	});
});
