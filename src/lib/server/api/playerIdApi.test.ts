import { normalizeFriendCode, recheckIntervalMs } from "@/lib/server/api/playerIdApi";
import { describe, expect, it } from "vitest";

describe("normalizeFriendCode", () => {
	it("accepts 12 digits with optional spaces and dashes", () => {
		expect(normalizeFriendCode("123456789012")).toBe("123456789012");
		expect(normalizeFriendCode("1234 5678 9012")).toBe("123456789012");
		expect(normalizeFriendCode("1234-5678-9012")).toBe("123456789012");
	});

	it("rejects anything that isn't exactly 12 digits", () => {
		expect(normalizeFriendCode("12345678901")).toBeUndefined();
		expect(normalizeFriendCode("1234567890123")).toBeUndefined();
		expect(normalizeFriendCode("1234abcd9012")).toBeUndefined();
		expect(normalizeFriendCode(123456789012)).toBeUndefined();
		expect(normalizeFriendCode(undefined)).toBeUndefined();
	});
});

describe("recheckIntervalMs", () => {
	it("reads new tickets every few seconds, then once a minute", () => {
		expect(recheckIntervalMs(0)).toBe(5_000);
		expect(recheckIntervalMs(59_999)).toBe(5_000);
		expect(recheckIntervalMs(60_000)).toBe(60_000);
		expect(recheckIntervalMs(3_600_000)).toBe(60_000);
	});
});
