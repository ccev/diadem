import { describe, it, expect } from "vitest";
import { capacitorResponseBytes, rewriteInstanceUrl } from "@/lib/native/nativeFetch";

const decode = (b: Uint8Array) => new TextDecoder().decode(b);

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

describe("capacitorResponseBytes", () => {
	// CapacitorHttp auto-parses application/json responses into a JS object even
	// when responseType is "blob" — we must re-serialize it, not drop it.
	it("re-serializes a parsed JSON object", () => {
		const bytes = capacitorResponseBytes({ general: { customHome: true } });
		expect(JSON.parse(decode(bytes))).toEqual({ general: { customHome: true } });
	});
	it("re-serializes a parsed JSON array", () => {
		const bytes = capacitorResponseBytes([1, 2, 3]);
		expect(JSON.parse(decode(bytes))).toEqual([1, 2, 3]);
	});
	// Some JSON/text bodies come back as the raw literal text (e.g. SvelteKit's
	// json()); with a textual content-type they must be encoded as-is, NOT atob'd.
	it("encodes a raw JSON text string when content-type is application/json", () => {
		const body = '{"forts":[],"gymCounts":{}}';
		expect(decode(capacitorResponseBytes(body, "application/json"))).toBe(body);
	});
	it("encodes raw text for text/* content types", () => {
		expect(decode(capacitorResponseBytes("hello world", "text/plain; charset=utf-8"))).toBe(
			"hello world"
		);
	});
	// Binary responses (images, msgpack) come back as a base64 string.
	it("base64-decodes a binary content type", () => {
		expect(decode(capacitorResponseBytes(btoa("hello"), "image/png"))).toBe("hello");
	});
	it("falls back to text when a non-binary content type isn't valid base64", () => {
		// '{' is not valid base64; without a textual content-type we must not crash.
		expect(decode(capacitorResponseBytes("{not base64", ""))).toBe("{not base64");
	});
	it("returns empty bytes for null/undefined", () => {
		expect(capacitorResponseBytes(null).length).toBe(0);
		expect(capacitorResponseBytes(undefined).length).toBe(0);
	});
});
