import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { load } from "./+layout";

const state = vi.hoisted(() => ({
	defaults: { themeMode: "system" },
	setUserSettings: vi.fn(),
	updateUserSettings: vi.fn(),
	storage: vi.fn(),
	native: false,
	config: { general: { mapName: "Test map" } }
}));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("@/lib/services/config/config", () => ({ setConfig: vi.fn() }));
vi.mock("@/lib/utils/getMapPath", () => ({ getMapPath: () => "/map" }));
vi.mock("@/lib/native/runtime", () => ({
	isNative: () => state.native,
	getInstanceUrl: () => "https://map.example"
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	getDefaultUserSettings: () => state.defaults,
	setUserSettings: state.setUserSettings,
	updateUserSettings: state.updateUserSettings
}));
vi.mock("@/lib/utils/requests", () => ({
	getHeaders: () => new Headers(),
	parseResponse: () => state.config
}));

beforeEach(() => {
	vi.clearAllMocks();
	state.native = false;
	state.storage.mockReset();
	state.setUserSettings.mockReset();
	vi.stubGlobal("window", { localStorage: { getItem: state.storage } });
});
afterEach(() => vi.unstubAllGlobals());

it.each(["{broken", "null", "true", "42", '"text"', "[]", ""])(
	"boots with defaults when stored settings are corrupt or not an object: %s",
	async (value) => {
		state.storage.mockReturnValue(value);
		await expect(
			load({
				fetch: async () => Response.json(state.config),
				untrack: (fn: () => unknown) => fn(),
				route: { id: "/" },
				url: new URL("https://localhost/")
			} as any)
		).resolves.toBeUndefined();
		expect(state.setUserSettings).toHaveBeenCalledWith(state.defaults);
		expect(state.updateUserSettings).toHaveBeenCalledOnce();
	}
);

it("keeps valid saved settings", async () => {
	const saved = { themeMode: "dark", mapPosition: { zoom: 14 } };
	state.storage.mockReturnValue(JSON.stringify(saved));
	await load({
		fetch: async () => Response.json(state.config),
		untrack: (fn: () => unknown) => fn(),
		route: { id: "/" },
		url: new URL("https://localhost/")
	} as any);
	expect(state.setUserSettings).toHaveBeenCalledWith(saved);
});

it("recovers when applying a saved settings object fails", async () => {
	state.storage.mockReturnValue('{"recentSearches":3}');
	state.setUserSettings.mockImplementationOnce(() => {
		throw new TypeError("Invalid history");
	});
	await expect(
		load({
			fetch: async () => Response.json(state.config),
			untrack: (fn: () => unknown) => fn(),
			route: { id: "/" },
			url: new URL("https://localhost/")
		} as any)
	).resolves.toBeUndefined();
	expect(state.setUserSettings).toHaveBeenLastCalledWith(state.defaults);
});

it("renders the native auth handoff without loading map config or user settings", async () => {
	const fetch = vi.fn();
	await expect(
		load({
			fetch,
			untrack: (fn: () => unknown) => fn(),
			route: { id: "/(auth)/login/discord/native" },
			url: new URL("https://localhost/login/discord/native")
		} as any)
	).resolves.toEqual({ nativeAuthHandoff: true });
	expect(fetch).not.toHaveBeenCalled();
	expect(state.storage).not.toHaveBeenCalled();
	expect(state.setUserSettings).not.toHaveBeenCalled();
});

it.each([false, true])(
	"does not track route or path changes during bootstrap (native=%s)",
	async (native) => {
		state.native = native;
		let tracking = true;
		const navigationDependency = vi.fn();
		await load({
			fetch: async () => Response.json(state.config),
			url: {
				get pathname() {
					if (tracking) navigationDependency();
					return "/map";
				}
			},
			route: {
				get id() {
					if (tracking) navigationDependency();
					return "/(main)/[[map=map]]";
				}
			},
			untrack: (fn: () => unknown) => {
				tracking = false;
				try {
					return fn();
				} finally {
					tracking = true;
				}
			}
		} as any);
		expect(state.setUserSettings).toHaveBeenCalledOnce();
		expect(navigationDependency).not.toHaveBeenCalled();
	}
);

it("still redirects the initial native landing page to the map", async () => {
	state.native = true;
	await expect(
		load({
			fetch: async () => Response.json(state.config),
			untrack: (fn: () => unknown) => fn(),
			route: { id: "/(main)/[[map=map]]" },
			url: new URL("https://localhost/")
		} as any)
	).rejects.toMatchObject({ status: 307, location: "/map" });
});
