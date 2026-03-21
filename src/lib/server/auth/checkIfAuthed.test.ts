import { describe, it, expect, vi } from "vitest";
import { checkIfAuthed, hasFeatureAnywhereServer } from "./checkIfAuthed";
import { isAuthRequired } from "@/lib/services/config/config.server";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import type { User } from "@/lib/server/db/internal/schema";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Perms } from "@/lib/utils/features";

vi.mock("@/lib/services/user/checkPerm", () => ({
	hasFeatureAnywhere: vi.fn(() => true)
}));

const mockUser = { id: "1", discordId: "123" } as User;

describe("checkIfAuthed", () => {
	it("returns true when auth is not required", () => {
		vi.mocked(isAuthRequired).mockReturnValue(false);
		expect(checkIfAuthed(null)).toBe(true);
	});

	it("returns true when auth required and user present", () => {
		vi.mocked(isAuthRequired).mockReturnValue(true);
		expect(checkIfAuthed(mockUser)).toBe(true);
	});

	it("returns false when auth required and no user", () => {
		vi.mocked(isAuthRequired).mockReturnValue(true);
		expect(checkIfAuthed(null)).toBe(false);
	});
});

describe("hasFeatureAnywhereServer", () => {
	const perms: Perms = { everywhere: [MapObjectType.POKEMON], areas: [] };

	it("returns true when authed and has feature", () => {
		vi.mocked(isAuthRequired).mockReturnValue(false);
		vi.mocked(hasFeatureAnywhere).mockReturnValue(true);
		expect(hasFeatureAnywhereServer(perms, MapObjectType.POKEMON, null)).toBe(true);
	});

	it("returns false when not authed", () => {
		vi.mocked(isAuthRequired).mockReturnValue(true);
		expect(hasFeatureAnywhereServer(perms, MapObjectType.POKEMON, null)).toBe(false);
	});

	it("returns false when authed but no feature", () => {
		vi.mocked(isAuthRequired).mockReturnValue(false);
		vi.mocked(hasFeatureAnywhere).mockReturnValue(false);
		expect(hasFeatureAnywhereServer(perms, MapObjectType.POKEMON, null)).toBe(false);
	});
});
