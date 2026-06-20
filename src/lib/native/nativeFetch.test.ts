import { describe, it, expect } from "vitest";
import { capacitorResponseBytes } from "@/lib/native/nativeFetch";

const decode = (b: Uint8Array) => new TextDecoder().decode(b);

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
