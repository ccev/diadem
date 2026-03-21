import { describe, it, expect } from "vitest";
import { match } from "./map";

describe("map param matcher", () => {
	it('matches "map"', () => {
		expect(match("map")).toBe(true);
	});

	it("rejects other strings", () => {
		expect(match("maps")).toBe(false);
		expect(match("")).toBe(false);
		expect(match("MAP")).toBe(false);
		expect(match("Map")).toBe(false);
	});
});
