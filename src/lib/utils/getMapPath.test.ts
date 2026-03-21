import { describe, it, expect, vi } from "vitest";
import { getMapPath, isOnMap } from "./getMapPath";
import type { ClientConfig } from "@/lib/services/config/configTypes";
import { page } from "$app/state";
import { getConfig } from "@/lib/services/config/config";

vi.mock("$app/state", () => ({
	page: { params: {} }
}));

vi.mock("@/lib/services/config/config", () => ({
	getConfig: vi.fn(() => ({ general: { customHome: false } }))
}));

const mockGetConfig = vi.mocked(getConfig);

function makeConfig(customHome: boolean): ClientConfig {
	return { general: { customHome } } as ClientConfig;
}

describe("getMapPath", () => {
	it("with customHome and suffix returns /map/suffix", () => {
		expect(getMapPath(makeConfig(true), "/pokemon")).toBe("/map/pokemon");
	});

	it("with customHome and no suffix returns /map", () => {
		expect(getMapPath(makeConfig(true))).toBe("/map");
	});

	it("with customHome and empty suffix returns /map", () => {
		expect(getMapPath(makeConfig(true), "")).toBe("/map");
	});

	it("without customHome and suffix returns suffix", () => {
		expect(getMapPath(makeConfig(false), "/pokemon")).toBe("/pokemon");
	});

	it("without customHome and no suffix returns /", () => {
		expect(getMapPath(makeConfig(false))).toBe("/");
	});
});

describe("isOnMap", () => {
	it("returns true when customHome is false", () => {
		mockGetConfig.mockReturnValue({ general: { customHome: false } } as any);
		expect(isOnMap()).toBe(true);
	});

	it("returns true when customHome is true and page param is 'map'", () => {
		mockGetConfig.mockReturnValue({ general: { customHome: true } } as any);
		(page as any).params = { map: "map" };
		expect(isOnMap()).toBe(true);
	});

	it("returns false when customHome is true and page param is not 'map'", () => {
		mockGetConfig.mockReturnValue({ general: { customHome: true } } as any);
		(page as any).params = {};
		expect(isOnMap()).toBe(false);
	});
});
