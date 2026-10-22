import { describe, expect, it, vi } from "vitest";
import type { Handle, RequestEvent } from "@sveltejs/kit";
import { handleLocale } from "./i18n";
import { getLocale } from "@/lib/i18n/locale";
import { mapObjectLabel } from "@/lib/mapObjects/mapObjectLabels";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { localizeFilterTitle } from "@/lib/features/filters/filterTitle";
import { formatDistance } from "@/lib/utils/numberFormat";
import { sessionLocaleCookie } from "@/lib/i18n/locales";

vi.mock("@/lib/services/config/config.server", () => ({
	getClientConfig: () => ({ general: { defaultLocale: "en" } })
}));

function request(path: string, locale?: string) {
	const values = new Map(locale ? [[sessionLocaleCookie, locale]] : []);
	return {
		url: new URL(path, "https://map.example"),
		cookies: {
			get: (key: string) => values.get(key),
			serialize: (key: string, value: string) => `${key}=${value}; Path=/; SameSite=Lax`,
			set: vi.fn((key: string, value: string) => {
				values.set(key, value);
			})
		},
		setHeaders: vi.fn()
	} as unknown as RequestEvent;
}

describe("Wuchale server localization", () => {
	it.each([
		["en", "Gym"],
		["de", "Arena"],
		["es", "Gimnasio"],
		["pt", "Ginasio"],
		["pl", "Gym"]
	])("translates source-text labels in %s", async (locale, label) => {
		await handleLocale({
			event: request("/map", locale),
			resolve: async () => {
				expect(mapObjectLabel(MapObjectType.GYM)).toBe(label);
				return new Response();
			}
		});
	});
	it("redirects before resolving, setting a session-only cookie and disabling caching", async () => {
		const event = request("/de/map?lat=1&lon=2");
		const resolve = vi.fn();
		const response = await handleLocale({ event, resolve });
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("https://map.example/map?lat=1&lon=2");
		expect(resolve).not.toHaveBeenCalled();
		expect(event.cookies.set).toHaveBeenCalledWith(sessionLocaleCookie, "de", {
			path: "/",
			httpOnly: false,
			sameSite: "lax",
			secure: true
		});
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("set-cookie")).toContain(`${sessionLocaleCookie}=de`);
	});
	it("resolves client data requests so Kit can deliver the session cookie before client redirect", async () => {
		const event = request("/de/map");
		event.isDataRequest = true;
		const resolve = vi.fn(async () => new Response("data"));
		expect(await (await handleLocale({ event, resolve })).text()).toBe("data");
		expect(event.cookies.set).toHaveBeenCalled();
		expect(resolve).toHaveBeenCalled();
	});
	it("isolates concurrent requests and interpolates translated messages", async () => {
		const render = async (locale: string) => {
			const event = request("/map", locale);
			const resolve: Parameters<Handle>[0]["resolve"] = async (_event, options) => {
				await new Promise((done) => setTimeout(done, locale === "de" ? 10 : 1));
				if (locale === "de") {
					// The source is just the placeholder; German intentionally adds a noun.
					expect(localizeFilterTitle({ message: "{type}", params: { type: "Feuer" } })).toBe(
						"Feuer Rüpel"
					);
				}
				const title = localizeFilterTitle({
					message: "Legendary {kind}",
					params: { kind: "Raids" }
				});
				const html = `<html lang="%lang%">${getLocale()}: ${title}</html>`;
				return new Response(await options!.transformPageChunk!({ html, done: true }));
			};
			return (await handleLocale({ event, resolve })).text();
		};
		expect(await Promise.all([render("de"), render("es"), render("en")])).toEqual([
			'<html lang="de">de: Legendäre Raids</html>',
			'<html lang="es">es: Incursiones Legendarias</html>',
			'<html lang="en">en: Legendary Raids</html>'
		]);
	});
	it("falls back to English for missing translations and validates HTML language", async () => {
		const event = request("/map?lang=%22%3E%3Cscript%3E", "invalid");
		const resolve: Parameters<Handle>[0]["resolve"] = async (_event, options) => {
			expect(getLocale()).toBe("en");
			return new Response(
				await options!.transformPageChunk!({ html: '<html lang="%lang%">', done: true })
			);
		};
		expect(await (await handleLocale({ event, resolve })).text()).toBe('<html lang="en">');
		expect(event.cookies.set).not.toHaveBeenCalled();
		await handleLocale({
			event: request("/map", "pt"),
			resolve: async () => {
				expect(formatDistance(25)).toBe("25 m");
				return new Response();
			}
		});
	});
	it("reads old shared filter titles and parameters while preserving user text", async () => {
		await handleLocale({
			event: request("/map", "de"),
			resolve: async () => {
				expect(
					localizeFilterTitle({
						message: "filter_template_levels_legendary",
						params: { kind: "filter_template_raids_raids" }
					})
				).toBe("Legendäre Raids");
				expect(
					localizeFilterTitle({ message: "{task}", params: { task: "Catch 5 Pokémon" } })
				).toBe("Catch 5 Pokémon");
				expect(localizeFilterTitle({ title: "My raids", message: "Raid Filter" })).toBe("My raids");
				expect(localizeFilterTitle({ message: "My custom filter" })).toBe("My custom filter");
				expect(localizeFilterTitle({ message: "constructor" })).toBe("constructor");
				return new Response();
			}
		});
	});
});
