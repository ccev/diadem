import { expect, it, vi } from "vitest";
import { reroute } from "./hooks";

it.each([
	["/de", "/"],
	["/de/", "/"],
	["/de/map?lat=50&lon=8#point", "/map"],
	["/pl/coverage", "/coverage"],
	["/de/wayfarer", "/wayfarer"],
	["/de/gym/123/thumbnail.png", "/gym/123/thumbnail.png"],
	["/de/filter/pokemon/abc", "/filter/pokemon/abc"],
	["/de/a/Bad%20Homburg", "/a/Bad%20Homburg"],
	["/d%65/%6dap", "/%6dap"]
])("routes %s internally to %s without changing the original URL", (input, path) => {
	const url = new URL(`https://map.example${input}`);
	const href = url.href;
	expect(reroute({ url, fetch: vi.fn() })).toBe(path);
	expect(url.href).toBe(href);
});

it.each([
	"/map",
	"/en/map",
	"/xx/map",
	"/details/map",
	"/de/api/config",
	"/de/%61pi/config",
	"/de/login/discord",
	"/de/logout",
	"/de/assets/foo/index.json",
	"/de/robots.txt",
	"/de//",
	"/de/es/map",
	"/de/a/%zz"
])("does not rewrite %s", (input) => {
	expect(reroute({ url: new URL(`https://map.example${input}`), fetch: vi.fn() })).toBeUndefined();
});
