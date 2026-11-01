import { describe, it, expect } from "vitest";
import { capacitorResponseBytes } from "@/lib/native/httpResponse";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("capacitorResponseBytes", () => {
	it("re-serializes JSON objects and arrays parsed by the native bridge", () => {
		expect(JSON.parse(decode(capacitorResponseBytes({ general: {} }, "application/json")))).toEqual(
			{
				general: {}
			}
		);
		expect(JSON.parse(decode(capacitorResponseBytes([1, 2], "application/json")))).toEqual([1, 2]);
	});

	it("preserves parsed JSON strings, booleans, and null", () => {
		for (const value of ["hello", true, false, null]) {
			expect(JSON.parse(decode(capacitorResponseBytes(value, "application/json")))).toBe(value);
		}
	});

	it("decodes binary MessagePack and image blob responses", () => {
		const bytes = Uint8Array.from([0x81, 0xa4, 0x6e, 0x61, 0x6d, 0x65, 0xa1, 0xff]);
		const base64 = btoa(String.fromCharCode(...bytes));
		for (const type of ["application/msgpack", "image/png"]) {
			expect(capacitorResponseBytes(base64, type)).toEqual(bytes);
		}
	});

	it("decodes text and vendor JSON blob responses instead of exposing base64", () => {
		for (const [type, value] of [
			["text/plain; charset=utf-8", "hello world"],
			["application/problem+json", '{"message":"test"}']
		]) {
			expect(decode(capacitorResponseBytes(btoa(value), type))).toBe(value);
		}
	});

	it("preserves Android errors returned as raw text", () => {
		expect(decode(capacitorResponseBytes("test", "text/plain", 400, "android"))).toBe("test");
		expect(
			JSON.parse(
				decode(capacitorResponseBytes({ errors: [] }, "application/vnd.api+json", 400, "android"))
			)
		).toEqual({ errors: [] });
	});

	it("decodes iOS error blobs", () => {
		expect(decode(capacitorResponseBytes(btoa("test"), "text/plain", 400, "ios"))).toBe("test");
	});

	it("falls back to raw text for an unexpected non-base64 string", () => {
		expect(decode(capacitorResponseBytes("{not base64"))).toBe("{not base64");
	});

	it("returns empty bytes for absent non-JSON bodies", () => {
		expect(capacitorResponseBytes(null).length).toBe(0);
		expect(capacitorResponseBytes(undefined).length).toBe(0);
	});
});
