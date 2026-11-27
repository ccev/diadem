import { describe, expect, it } from "vitest";
import { getLegacyShareRedirect, getSeoOrigin, localizePath, splitLocalePath } from "./localePaths";

describe("localized share paths", () => {
	it.each([
		["/", "/de"],
		["/map", "/de/map"],
		["/es/pokemon/123", "/de/pokemon/123"],
		["/d%65/pokemon/123", "/de/pokemon/123"],
		["/a/new%20town", "/de/a/new%20town"]
	])("localizes %s to %s", (path, expected) => {
		expect(localizePath(path, "de")).toBe(expected);
	});

	it("only matches supported non-base locales as full segments", () => {
		expect(splitLocalePath("/de")).toEqual({ path: "/", locale: "de" });
		expect(splitLocalePath("/en/map")).toEqual({ path: "/en/map" });
		expect(splitLocalePath("/xx/map")).toEqual({ path: "/xx/map" });
		expect(splitLocalePath("/details/123")).toEqual({ path: "/details/123" });
		expect(localizePath("/de/gym/123", "en")).toBe("/gym/123");
	});

	it("migrates a legacy URL without losing map position or hash", () => {
		const oldUrl = new URL("https://map.example/map?lat=50.2&lon=8.1&lang=de&zoom=15#point");
		expect(getLegacyShareRedirect(oldUrl)?.href).toBe(
			"https://map.example/de/map?lat=50.2&lon=8.1&zoom=15#point"
		);
	});

	it("cleans up an invalid or redundant legacy parameter", () => {
		expect(getLegacyShareRedirect(new URL("https://map.example/?lang=xx"))?.href).toBe(
			"https://map.example/"
		);
		expect(getLegacyShareRedirect(new URL("https://map.example/de?lang=en"))?.href).toBe(
			"https://map.example/de"
		);
		expect(getLegacyShareRedirect(new URL("https://map.example/de"))).toBeUndefined();
	});
});

it("uses the instance URL for SEO when configured, otherwise the request origin", () => {
	expect(getSeoOrigin("https://map.example/", "http://localhost:5173")).toBe("https://map.example");
	expect(getSeoOrigin("map.example", "http://localhost:5173")).toBe("http://localhost:5173");
});
