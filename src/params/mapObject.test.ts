import { describe, it, expect } from "vitest";
import { match } from "./mapObject";

describe("mapObject param matcher", () => {
	it("matches all valid map object types", () => {
		expect(match("pokemon")).toBe(true);
		expect(match("pokestop")).toBe(true);
		expect(match("gym")).toBe(true);
		expect(match("station")).toBe(true);
		expect(match("s2cell")).toBe(true);
		expect(match("nest")).toBe(true);
		expect(match("spawnpoint")).toBe(true);
		expect(match("route")).toBe(true);
		expect(match("tappable")).toBe(true);
	});

	it("rejects invalid types", () => {
		expect(match("")).toBe(false);
		expect(match("Pokemon")).toBe(false);
		expect(match("POKEMON")).toBe(false);
		expect(match("player")).toBe(false);
		expect(match("weather")).toBe(false);
	});
});
