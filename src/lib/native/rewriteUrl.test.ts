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
});
