import { describe, expect, it } from "vitest";
import { isLocale, localeRedirect, preferredLocale } from "./locales";

describe("language links", () => {
	it("consumes a conflicting legacy language parameter", () => {
		expect(localeRedirect(new URL("https://map.example/de/map?lang=es&zoom=15"))).toEqual({
			locale: "de",
			location: "https://map.example/map?zoom=15"
		});
	});
	it.each(["en", "de", "es", "pt", "pl"])("redirects the %s root", (locale) => {
		expect(localeRedirect(new URL(`https://map.example/${locale}`))).toEqual({
			locale,
			location: "https://map.example/"
		});
	});
	it("preserves nested/encoded paths, queries and fragments", () => {
		expect(
			localeRedirect(new URL("https://map.example/de/a/hello%20world?x=1&y=%2F#position"))
		).toEqual({ locale: "de", location: "https://map.example/a/hello%20world?x=1&y=%2F#position" });
	});
	it.each(["/", "/map", "/api/locale/de", "/fr/map", "/deutsch/map", "/DE/map"])(
		"leaves %s to normal routing",
		(path) => expect(localeRedirect(new URL(path, "https://map.example"))).toBeUndefined()
	);
	it.each(["/de//evil.example/path", "/de/%2F%2Fevil.example", "/de/\\evil.example"])(
		"keeps unusual redirect paths on the same origin: %s",
		(path) => {
			const redirect = localeRedirect(new URL(path, "https://map.example"));
			expect(new URL(redirect!.location).origin).toBe("https://map.example");
		}
	);
});

describe("locale validation and browser preferences", () => {
	it("matches supported regional languages in preference order", () => {
		expect(preferredLocale(["fr-FR", "pt-BR", "de-DE"])).toBe("pt");
		expect(preferredLocale(["DE-de", "en"])).toBe("de");
		expect(preferredLocale(["fr"])).toBe("en");
		expect(preferredLocale([])).toBe("en");
	});
	it.each([null, undefined, "", "DE", "fr", "<script>"])("rejects invalid locale %s", (locale) => {
		expect(isLocale(locale)).toBe(false);
	});
});
