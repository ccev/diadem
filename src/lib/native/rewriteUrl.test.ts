import { describe, it, expect } from "vitest";
import { rewriteInstanceUrl } from "@/lib/native/rewriteUrl";

const INSTANCE = "https://demap.co";
const LOCAL = "https://localhost"; // the native webview origin

describe("rewriteInstanceUrl", () => {
	it("rewrites a local-origin /api request to the instance", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/api/config`, INSTANCE, LOCAL)).toBe(
			"https://demap.co/api/config"
		);
	});
	it("rewrites a local-origin /assets request to the instance", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/assets/pokemon/1.png`, INSTANCE, LOCAL)).toBe(
			"https://demap.co/assets/pokemon/1.png"
		);
	});
	it("preserves query strings", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/api/search/forts?q=x`, INSTANCE, LOCAL)).toBe(
			"https://demap.co/api/search/forts?q=x"
		);
	});
	it("does NOT rewrite an unrelated local path", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/map`, INSTANCE, LOCAL)).toBeNull();
	});
	it("does NOT rewrite an absolute external URL (e.g. basemap tiles)", () => {
		const tile = "https://tiles.example.com/12/34/56.pbf";
		expect(rewriteInstanceUrl(tile, INSTANCE, LOCAL)).toBeNull();
	});
	it("returns null when there is no instance configured", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/api/config`, "", LOCAL)).toBeNull();
	});
	// SvelteKit's load fetch passes same-origin requests as relative paths
	// (it strips the origin in resolve_fetch_url), so the rewriter must resolve
	// them against localOrigin instead of throwing on `new URL(relative)`.
	it("rewrites a RELATIVE /api path (the form SvelteKit load fetch passes)", () => {
		expect(rewriteInstanceUrl("/api/config", INSTANCE, LOCAL)).toBe("https://demap.co/api/config");
	});
	it("rewrites a relative /assets path", () => {
		expect(rewriteInstanceUrl("/assets/pokemon/1.png", INSTANCE, LOCAL)).toBe(
			"https://demap.co/assets/pokemon/1.png"
		);
	});
	it("does NOT rewrite an unrelated relative path", () => {
		expect(rewriteInstanceUrl("/map", INSTANCE, LOCAL)).toBeNull();
	});
	// UICONS image URLs are built absolute (instance base) on native; they must
	// still be routed through CapacitorHttp (returned unchanged), not left to a
	// cross-origin webview fetch that would taint the WebGL texture.
	it("routes an already-absolute instance URL through unchanged", () => {
		expect(rewriteInstanceUrl("https://demap.co/assets/DEFAULT/pokemon/1.png", INSTANCE, LOCAL)).toBe(
			"https://demap.co/assets/DEFAULT/pokemon/1.png"
		);
	});
	it("still ignores absolute external URLs even when an instance is set", () => {
		expect(rewriteInstanceUrl("https://tiles.example.com/1.pbf", INSTANCE, LOCAL)).toBeNull();
	});
});
