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
	// Binary / blob responses (images, msgpack) come back as a base64 string.
	it("decodes a base64 string body", () => {
		expect(decode(capacitorResponseBytes(btoa("hello")))).toBe("hello");
	});
	it("returns empty bytes for null/undefined", () => {
		expect(capacitorResponseBytes(null).length).toBe(0);
		expect(capacitorResponseBytes(undefined).length).toBe(0);
	});
});
