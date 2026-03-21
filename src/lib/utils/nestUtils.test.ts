import { describe, it, expect, vi, beforeEach } from "vitest";
import { shouldDisplayNest, getActiveNestFilter } from "./nestUtils";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { getActiveSearch } from "@/lib/features/activeSearch.svelte";
import type { NestData } from "@/lib/types/mapObjectData/nest";

const mockIsOverwrite = vi.mocked(isCurrentSelectedOverwrite);
const mockGetUserSettings = vi.mocked(getUserSettings);
const mockGetActiveSearch = vi.mocked(getActiveSearch);

function makeNestData(overrides: Partial<NestData> = {}): NestData {
	return {
		id: "nest-1",
		mapId: "nest-nest-1",
		type: "nest" as any,
		lat: 0,
		lon: 0,
		name: "Test Nest",
		polygon: [],
		area_name: null,
		spawnpoints: null,
		m2: null,
		active: 1,
		pokemon_id: 25,
		pokemon_form: 0,
		pokemon_avg: null,
		pokemon_ratio: null,
		pokemon_count: null,
		discarded: null,
		updated: null,
		...overrides
	};
}

describe("shouldDisplayNest", () => {
	beforeEach(() => {
		mockIsOverwrite.mockReturnValue(false);
		mockGetActiveSearch.mockReturnValue(undefined);
		mockGetUserSettings.mockReturnValue({
			filters: {
				nest: { enabled: true, filters: [] }
			}
		} as any);
	});

	it("returns true when overwrite is active", () => {
		mockIsOverwrite.mockReturnValue(true);
		mockGetUserSettings.mockReturnValue({
			filters: { nest: { enabled: false, filters: [] } }
		} as any);
		expect(shouldDisplayNest(makeNestData())).toBe(true);
	});

	it("returns false when nest filter is disabled", () => {
		mockGetUserSettings.mockReturnValue({
			filters: { nest: { enabled: false, filters: [] } }
		} as any);
		expect(shouldDisplayNest(makeNestData())).toBe(false);
	});

	it("returns true when no filtersets are enabled (show all)", () => {
		mockGetUserSettings.mockReturnValue({
			filters: { nest: { enabled: true, filters: [{ enabled: false, pokemon: [{ pokemon_id: 1, form: 0 }] }] } }
		} as any);
		expect(shouldDisplayNest(makeNestData())).toBe(true);
	});

	it("returns true when no filtersets exist (show all)", () => {
		expect(shouldDisplayNest(makeNestData())).toBe(true);
	});

	it("returns true when pokemon matches filterset", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				nest: {
					enabled: true,
					filters: [{ enabled: true, pokemon: [{ pokemon_id: 25, form: 0 }] }]
				}
			}
		} as any);
		expect(shouldDisplayNest(makeNestData({ pokemon_id: 25, pokemon_form: 0 }))).toBe(true);
	});

	it("returns false when pokemon does not match filterset", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				nest: {
					enabled: true,
					filters: [{ enabled: true, pokemon: [{ pokemon_id: 1, form: 0 }] }]
				}
			}
		} as any);
		expect(shouldDisplayNest(makeNestData({ pokemon_id: 25, pokemon_form: 0 }))).toBe(false);
	});

	it("returns false when form does not match", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				nest: {
					enabled: true,
					filters: [{ enabled: true, pokemon: [{ pokemon_id: 25, form: 1 }] }]
				}
			}
		} as any);
		expect(shouldDisplayNest(makeNestData({ pokemon_id: 25, pokemon_form: 0 }))).toBe(false);
	});

	it("returns true when matching across multiple filtersets", () => {
		mockGetUserSettings.mockReturnValue({
			filters: {
				nest: {
					enabled: true,
					filters: [
						{ enabled: true, pokemon: [{ pokemon_id: 1, form: 0 }] },
						{ enabled: true, pokemon: [{ pokemon_id: 25, form: 0 }] }
					]
				}
			}
		} as any);
		expect(shouldDisplayNest(makeNestData({ pokemon_id: 25, pokemon_form: 0 }))).toBe(true);
	});

	it("uses active search filter when available", () => {
		mockGetActiveSearch.mockReturnValue({
			mapObject: "nest" as any,
			filter: {
				enabled: true,
				filters: [{ enabled: true, pokemon: [{ pokemon_id: 150, form: 0 }] }]
			}
		} as any);
		// Default settings would show all, but search filter restricts
		expect(shouldDisplayNest(makeNestData({ pokemon_id: 25, pokemon_form: 0 }))).toBe(false);
		expect(shouldDisplayNest(makeNestData({ pokemon_id: 150, pokemon_form: 0 }))).toBe(true);
	});
});
