import { describe, it, expect } from "vitest";
import { resize } from "./assets";

describe("resize", () => {
	it("appends ? with no options", () => {
		expect(resize("http://img.png")).toBe("http://img.png?");
	});

	it("appends ? with empty options", () => {
		expect(resize("http://img.png", {})).toBe("http://img.png?");
	});

	it("appends width param", () => {
		expect(resize("http://img.png", { width: 64 })).toBe("http://img.png?w=64");
	});

	it("appends ? when width is 0", () => {
		expect(resize("http://img.png", { width: 0 })).toBe("http://img.png?");
	});
});
