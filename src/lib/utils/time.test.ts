import { describe, it, expect } from "vitest";
import { time, getMmSsFromSeconds, sleep } from "./time";

describe("time (same day check)", () => {
	it("returns true for the same date", () => {
		const d1 = new Date(2024, 5, 15);
		const d2 = new Date(2024, 5, 15);
		expect(time(d1, d2)).toBe(true);
	});

	it("returns true for same day with different times", () => {
		const d1 = new Date(2024, 5, 15, 8, 30);
		const d2 = new Date(2024, 5, 15, 22, 45);
		expect(time(d1, d2)).toBe(true);
	});

	it("returns false for different days", () => {
		const d1 = new Date(2024, 5, 15);
		const d2 = new Date(2024, 5, 16);
		expect(time(d1, d2)).toBe(false);
	});

	it("returns false for different months", () => {
		const d1 = new Date(2024, 5, 15);
		const d2 = new Date(2024, 6, 15);
		expect(time(d1, d2)).toBe(false);
	});

	it("returns false for different years", () => {
		const d1 = new Date(2024, 5, 15);
		const d2 = new Date(2025, 5, 15);
		expect(time(d1, d2)).toBe(false);
	});

	it("handles month boundary", () => {
		const d1 = new Date(2024, 0, 31);
		const d2 = new Date(2024, 1, 1);
		expect(time(d1, d2)).toBe(false);
	});
});

describe("getMmSsFromSeconds", () => {
	it("formats zero seconds", () => {
		expect(getMmSsFromSeconds(0)).toBe("00:00");
	});

	it("formats seconds only", () => {
		expect(getMmSsFromSeconds(45)).toBe("01:45");
	});

	it("pads single digits", () => {
		expect(getMmSsFromSeconds(5)).toBe("00:05");
	});

	it("formats exact minutes", () => {
		expect(getMmSsFromSeconds(120)).toBe("02:00");
	});

	it("formats large values", () => {
		expect(getMmSsFromSeconds(3661)).toBe("61:01");
	});

	it("handles fractional seconds", () => {
		const result = getMmSsFromSeconds(90.7);
		expect(result).toBe("02:31");
	});
});

describe("sleep", () => {
	it("resolves after the given duration", async () => {
		const start = Date.now();
		await sleep(50);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeGreaterThanOrEqual(40);
	});
});
