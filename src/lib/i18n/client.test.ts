import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initLocale, setLocale } from "./client";
import { loadLocale } from "wuchale/load-utils";
import { localePreferenceKey, sessionLocaleCookie } from "./locales";

vi.mock("../../locales/main.loader.svelte.js", () => ({}));
vi.mock("wuchale/load-utils", () => ({ loadLocale: vi.fn(async () => {}) }));

describe("client language selection", () => {
	let storage: Map<string, string>;
	let cookies: Map<string, string>;
	let writtenCookies: string[];
	beforeEach(() => {
		vi.clearAllMocks();
		storage = new Map();
		cookies = new Map();
		writtenCookies = [];
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
			removeItem: (key: string) => storage.delete(key)
		});
		vi.stubGlobal("document", {
			documentElement: { lang: "en" },
			get cookie() {
				return [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
			},
			set cookie(value: string) {
				writtenCookies.push(value);
				const [key, val] = value.split(";")[0].split("=");
				cookies.set(key, val);
			}
		});
		vi.stubGlobal("navigator", { languages: ["de-DE", "en"] });
		vi.stubGlobal("window", {
			location: { href: "https://map.example/map?lang=de&zoom=12#position", replace: vi.fn() }
		});
	});
	afterEach(() => vi.unstubAllGlobals());

	it("applies a language link across navigation without modifying saved settings", async () => {
		storage.set(localePreferenceKey, "pl");
		storage.set("userSettings", '{"themeMode":"dark"}');
		await initLocale(new URL("https://map.example/es/map"));
		await initLocale(new URL("https://map.example/coverage"));
		expect(loadLocale).toHaveBeenLastCalledWith("es");
		expect(document.documentElement.lang).toBe("es");
		expect(storage.get(localePreferenceKey)).toBe("pl");
		expect(storage.get("userSettings")).toBe('{"themeMode":"dark"}');
		expect(writtenCookies[0]).not.toMatch(/max-age|expires/i);
		cookies.clear();
		await initLocale(new URL("https://map.example/map"));
		expect(loadLocale).toHaveBeenLastCalledWith("pl");
	});
	it("honors the redirect cookie on first load", async () => {
		cookies.set(sessionLocaleCookie, "pt");
		storage.set(localePreferenceKey, "en");
		await initLocale(new URL("https://map.example/map"));
		expect(loadLocale).toHaveBeenCalledWith("pt");
	});
	it("retains legacy saved preferences while a link overrides this session", async () => {
		storage.set("PARAGLIDE_LOCALE", "pl");
		await initLocale(new URL("https://map.example/map?lang=es"));
		expect(loadLocale).toHaveBeenCalledWith("es");
		expect(storage.get(localePreferenceKey)).toBe("pl");
		expect(storage.has("PARAGLIDE_LOCALE")).toBe(false);
	});
	it("ignores invalid inputs and falls back to browser language", async () => {
		cookies.set(sessionLocaleCookie, "fr");
		storage.set(localePreferenceKey, "<script>");
		await initLocale(new URL("https://map.example/map?lang=xx"));
		expect(loadLocale).toHaveBeenCalledWith("de");
		expect(writtenCookies).toHaveLength(0);
	});
	it("works with persistent storage disabled", async () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			}
		});
		await initLocale(new URL("https://map.example/en/map"));
		expect(loadLocale).toHaveBeenCalledWith("en");
	});
	it("saves only explicit selections and removes a conflicting legacy link parameter", () => {
		setLocale("pl");
		expect(storage.get(localePreferenceKey)).toBe("pl");
		expect(cookies.get(sessionLocaleCookie)).toBe("pl");
		expect(window.location.replace).toHaveBeenCalledWith(
			"https://map.example/map?zoom=12#position"
		);
		expect(storage.has("userSettings")).toBe(false);
	});
});
