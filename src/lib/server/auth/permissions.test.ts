import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleRule, getEveryonePerms } from "./permissions";
import type { Perms } from "@/lib/utils/features";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Permissions as ConfigRule } from "@/lib/services/config/configTypes";
import type { Polygon } from "geojson";
import type { KojiFeature } from "@/lib/features/koji";

// Mock getServerConfig
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: vi.fn(() => ({
		permissions: [],
		auth: { enabled: false }
	}))
}));

// Mock fetchKojiGeofences
vi.mock("@/lib/server/api/kojiApi", () => ({
	fetchKojiGeofences: vi.fn(() => undefined)
}));

// Mock setPermissions
vi.mock("@/lib/server/auth/auth", () => ({
	setPermissions: vi.fn()
}));

import { getServerConfig } from "@/lib/services/config/config.server";
import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";

const mockGetServerConfig = vi.mocked(getServerConfig);
const mockFetchKojiGeofences = vi.mocked(fetchKojiGeofences);

function makeSquarePolygon(
	minLon: number,
	minLat: number,
	maxLon: number,
	maxLat: number
): Polygon {
	return {
		type: "Polygon",
		coordinates: [
			[
				[minLon, minLat],
				[minLon, maxLat],
				[maxLon, maxLat],
				[maxLon, minLat],
				[minLon, minLat]
			]
		]
	};
}

function makeKojiFeature(name: string, polygon: Polygon): KojiFeature {
	return {
		type: "Feature",
		geometry: polygon,
		properties: { name } as any
	};
}

function makePerms(): Perms {
	return { everywhere: [], areas: [] };
}

describe("handleRule", () => {
	it("adds features to everywhere when no areas specified", () => {
		const perms = makePerms();
		const rule: ConfigRule = {
			everyone: true,
			features: [MapObjectType.POKEMON, MapObjectType.GYM]
		};
		handleRule(rule, perms, undefined);
		expect(perms.everywhere).toEqual([MapObjectType.POKEMON, MapObjectType.GYM]);
	});

	it("does nothing when rule has areas but no geofences", () => {
		const perms = makePerms();
		const rule: ConfigRule = {
			everyone: true,
			areas: ["TestArea"],
			features: [MapObjectType.POKEMON]
		};
		handleRule(rule, perms, undefined);
		expect(perms.areas).toHaveLength(0);
		expect(perms.everywhere).toHaveLength(0);
	});

	it("adds area with polygon from geofences when area matches", () => {
		const perms = makePerms();
		const polygon = makeSquarePolygon(-1, -1, 1, 1);
		const geofences = [makeKojiFeature("TestArea", polygon)];
		const rule: ConfigRule = {
			everyone: true,
			areas: ["TestArea"],
			features: [MapObjectType.POKEMON]
		};
		handleRule(rule, perms, geofences);
		expect(perms.areas).toHaveLength(1);
		expect(perms.areas[0].name).toBe("TestArea");
		expect(perms.areas[0].features).toEqual([MapObjectType.POKEMON]);
		expect(perms.areas[0].polygon).toBe(polygon);
	});

	it("matches area names case-insensitively", () => {
		const perms = makePerms();
		const polygon = makeSquarePolygon(-1, -1, 1, 1);
		const geofences = [makeKojiFeature("testarea", polygon)];
		const rule: ConfigRule = {
			everyone: true,
			areas: ["TestArea"],
			features: [MapObjectType.POKEMON]
		};
		handleRule(rule, perms, geofences);
		expect(perms.areas).toHaveLength(1);
	});

	it("skips areas that don't exist in geofences (logs error)", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const perms = makePerms();
		const geofences = [makeKojiFeature("OtherArea", makeSquarePolygon(-1, -1, 1, 1))];
		const rule: ConfigRule = {
			everyone: true,
			areas: ["NonExistent"],
			features: [MapObjectType.POKEMON]
		};
		handleRule(rule, perms, geofences);
		expect(perms.areas).toHaveLength(0);
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it("deduplicates features when adding to existing area", () => {
		const perms = makePerms();
		const polygon = makeSquarePolygon(-1, -1, 1, 1);
		const geofences = [makeKojiFeature("TestArea", polygon)];

		handleRule(
			{ everyone: true, areas: ["TestArea"], features: [MapObjectType.POKEMON] },
			perms,
			geofences
		);
		handleRule(
			{ everyone: true, areas: ["TestArea"], features: [MapObjectType.POKEMON, MapObjectType.GYM] },
			perms,
			geofences
		);

		expect(perms.areas).toHaveLength(1);
		expect(perms.areas[0].features).toEqual([MapObjectType.POKEMON, MapObjectType.GYM]);
	});

	it("deduplicates features in everywhere", () => {
		const perms = makePerms();
		handleRule({ everyone: true, features: [MapObjectType.POKEMON] }, perms, undefined);
		handleRule({ everyone: true, features: [MapObjectType.POKEMON, MapObjectType.GYM] }, perms, undefined);
		expect(perms.everywhere).toEqual([MapObjectType.POKEMON, MapObjectType.GYM]);
	});

	it("handles rule with no features", () => {
		const perms = makePerms();
		handleRule({ everyone: true }, perms, undefined);
		expect(perms.everywhere).toHaveLength(0);
	});

	it("handles multiple areas in one rule", () => {
		const perms = makePerms();
		const geofences = [
			makeKojiFeature("Area1", makeSquarePolygon(-1, -1, 0, 0)),
			makeKojiFeature("Area2", makeSquarePolygon(0, 0, 1, 1))
		];
		const rule: ConfigRule = {
			everyone: true,
			areas: ["Area1", "Area2"],
			features: [MapObjectType.POKEMON]
		};
		handleRule(rule, perms, geofences);
		expect(perms.areas).toHaveLength(2);
		expect(perms.areas[0].name).toBe("Area1");
		expect(perms.areas[1].name).toBe("Area2");
	});
});

describe("getEveryonePerms", () => {
	beforeEach(() => {
		// Reset the module-level singleton by re-importing
		// We can't easily reset the `initializedEveryonePerms` boolean,
		// so we rely on vi.resetModules() in a more complex setup.
		// For these tests, we test the behavior with mock config.
	});

	it("processes only everyone rules", async () => {
		// Need to reset module to clear singleton cache
		vi.resetModules();

		// Re-mock after resetModules
		vi.doMock("@/lib/services/config/config.server", () => ({
			getServerConfig: vi.fn(() => ({
				permissions: [
					{ everyone: true, features: [MapObjectType.POKEMON] },
					{ loggedIn: true, features: [MapObjectType.GYM] }, // should be skipped
					{ guildId: "123", features: [MapObjectType.POKESTOP] } // should be skipped
				],
				auth: { enabled: false }
			}))
		}));
		vi.doMock("@/lib/server/api/kojiApi", () => ({
			fetchKojiGeofences: vi.fn(() => undefined)
		}));
		vi.doMock("@/lib/server/auth/auth", () => ({
			setPermissions: vi.fn()
		}));
		vi.doMock("@/lib/utils/logger", () => ({
			getLogger: vi.fn(() => ({
				info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
			}))
		}));

		const { getEveryonePerms: freshGetEveryonePerms } = await import("./permissions");
		const perms = await freshGetEveryonePerms(fetch);
		expect(perms.everywhere).toEqual([MapObjectType.POKEMON]);
	});

	it("returns cached result on subsequent calls", async () => {
		vi.resetModules();

		let callCount = 0;
		vi.doMock("@/lib/services/config/config.server", () => ({
			getServerConfig: vi.fn(() => {
				callCount++;
				return {
					permissions: [
						{ everyone: true, features: [MapObjectType.POKEMON] }
					],
					auth: { enabled: false }
				};
			})
		}));
		vi.doMock("@/lib/server/api/kojiApi", () => ({
			fetchKojiGeofences: vi.fn(() => undefined)
		}));
		vi.doMock("@/lib/server/auth/auth", () => ({
			setPermissions: vi.fn()
		}));
		vi.doMock("@/lib/utils/logger", () => ({
			getLogger: vi.fn(() => ({
				info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
			}))
		}));

		const { getEveryonePerms: freshGetEveryonePerms } = await import("./permissions");
		await freshGetEveryonePerms(fetch);
		await freshGetEveryonePerms(fetch);
		// getServerConfig is called once per getEveryonePerms call, but the second call should be cached
		expect(callCount).toBe(1);
	});
});

describe("updatePermissions", () => {
	it("includes everyone + loggedIn rules for authenticated user", async () => {
		vi.resetModules();

		const mockSetPermissions = vi.fn();
		vi.doMock("@/lib/services/config/config.server", () => ({
			getServerConfig: vi.fn(() => ({
				permissions: [
					{ everyone: true, features: [MapObjectType.POKEMON] },
					{ loggedIn: true, features: [MapObjectType.GYM] },
					{ guildId: "guild-1", features: [MapObjectType.POKESTOP] }
				],
				auth: { enabled: true }
			}))
		}));
		vi.doMock("@/lib/server/api/kojiApi", () => ({
			fetchKojiGeofences: vi.fn(() => undefined)
		}));
		vi.doMock("@/lib/server/auth/auth", () => ({
			setPermissions: mockSetPermissions
		}));
		vi.doMock("@/lib/server/auth/discordDetails", () => ({
			getGuildMemberInfo: vi.fn(() => ({ user: { id: "user-1" }, roles: [] }))
		}));
		vi.doMock("@/lib/utils/logger", () => ({
			getLogger: vi.fn(() => ({
				info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
			}))
		}));

		const { updatePermissions } = await import("./permissions");
		const user = { id: "user-1" } as any;
		const perms = await updatePermissions(user, "token", fetch);

		// everyone + loggedIn + guild member (no role required)
		expect(perms.everywhere).toContain(MapObjectType.POKEMON);
		expect(perms.everywhere).toContain(MapObjectType.GYM);
		expect(perms.everywhere).toContain(MapObjectType.POKESTOP);
		expect(mockSetPermissions).toHaveBeenCalledWith("user-1", perms);
	});

	it("applies guild role-based rules when user has matching role", async () => {
		vi.resetModules();

		const mockSetPermissions = vi.fn();
		vi.doMock("@/lib/services/config/config.server", () => ({
			getServerConfig: vi.fn(() => ({
				permissions: [
					{ everyone: true, features: [MapObjectType.POKEMON] },
					{ guildId: "guild-1", roleId: "role-admin", features: [MapObjectType.NEST] }
				],
				auth: { enabled: true }
			}))
		}));
		vi.doMock("@/lib/server/api/kojiApi", () => ({
			fetchKojiGeofences: vi.fn(() => undefined)
		}));
		vi.doMock("@/lib/server/auth/auth", () => ({
			setPermissions: mockSetPermissions
		}));
		vi.doMock("@/lib/server/auth/discordDetails", () => ({
			getGuildMemberInfo: vi.fn(() => ({ user: { id: "user-1" }, roles: ["role-admin", "role-other"] }))
		}));
		vi.doMock("@/lib/utils/logger", () => ({
			getLogger: vi.fn(() => ({
				info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
			}))
		}));

		const { updatePermissions } = await import("./permissions");
		const perms = await updatePermissions({ id: "user-1" } as any, "token", fetch);

		expect(perms.everywhere).toContain(MapObjectType.POKEMON);
		expect(perms.everywhere).toContain(MapObjectType.NEST);
	});

	it("skips guild role-based rules when user lacks the role", async () => {
		vi.resetModules();

		const mockSetPermissions = vi.fn();
		vi.doMock("@/lib/services/config/config.server", () => ({
			getServerConfig: vi.fn(() => ({
				permissions: [
					{ everyone: true, features: [MapObjectType.POKEMON] },
					{ guildId: "guild-1", roleId: "role-admin", features: [MapObjectType.NEST] }
				],
				auth: { enabled: true }
			}))
		}));
		vi.doMock("@/lib/server/api/kojiApi", () => ({
			fetchKojiGeofences: vi.fn(() => undefined)
		}));
		vi.doMock("@/lib/server/auth/auth", () => ({
			setPermissions: mockSetPermissions
		}));
		vi.doMock("@/lib/server/auth/discordDetails", () => ({
			getGuildMemberInfo: vi.fn(() => ({ user: { id: "user-1" }, roles: ["role-other"] }))
		}));
		vi.doMock("@/lib/utils/logger", () => ({
			getLogger: vi.fn(() => ({
				info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
			}))
		}));

		const { updatePermissions } = await import("./permissions");
		const perms = await updatePermissions({ id: "user-1" } as any, "token", fetch);

		expect(perms.everywhere).toContain(MapObjectType.POKEMON);
		expect(perms.everywhere).not.toContain(MapObjectType.NEST);
	});

	it("skips all permission rules when auth is disabled", async () => {
		vi.resetModules();

		const mockSetPermissions = vi.fn();
		vi.doMock("@/lib/services/config/config.server", () => ({
			getServerConfig: vi.fn(() => ({
				permissions: [
					{ everyone: true, features: [MapObjectType.POKEMON] },
					{ loggedIn: true, features: [MapObjectType.GYM] },
					{ guildId: "guild-1", features: [MapObjectType.POKESTOP] }
				],
				auth: { enabled: false }
			}))
		}));
		vi.doMock("@/lib/server/api/kojiApi", () => ({
			fetchKojiGeofences: vi.fn(() => undefined)
		}));
		vi.doMock("@/lib/server/auth/auth", () => ({
			setPermissions: mockSetPermissions
		}));
		vi.doMock("@/lib/server/auth/discordDetails", () => ({
			getGuildMemberInfo: vi.fn()
		}));
		vi.doMock("@/lib/utils/logger", () => ({
			getLogger: vi.fn(() => ({
				info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()
			}))
		}));

		const { updatePermissions } = await import("./permissions");
		const perms = await updatePermissions({ id: "user-1" } as any, "token", fetch);

		// Only everyone rules apply when auth is disabled
		expect(perms.everywhere).toEqual([MapObjectType.POKEMON]);
	});
});
