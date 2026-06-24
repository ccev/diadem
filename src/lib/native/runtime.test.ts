import { describe, it, expect } from "vitest";
import { normalizeInstanceUrl } from "@/lib/native/runtime";

describe("normalizeInstanceUrl", () => {
	it("strips a trailing slash", () => {
		expect(normalizeInstanceUrl("https://demap.co/")).toBe("https://demap.co");
	});
	it("adds https:// when no scheme is present", () => {
		expect(normalizeInstanceUrl("demap.co")).toBe("https://demap.co");
	});
	it("preserves an explicit http scheme", () => {
		expect(normalizeInstanceUrl("http://192.168.1.5:5173")).toBe("http://192.168.1.5:5173");
	});
	it("returns empty string for empty input", () => {
		expect(normalizeInstanceUrl("")).toBe("");
		expect(normalizeInstanceUrl("   ")).toBe("");
	});
});
