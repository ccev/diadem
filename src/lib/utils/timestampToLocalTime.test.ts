import { describe, it, expect, vi, beforeEach } from "vitest";
import { timestampToLocalTime } from "./timestampToLocalTime";
import { time } from "@/lib/utils/time";

// time is not mocked globally, it's a pure function. We mock it here to control date comparison.
vi.mock("@/lib/utils/time", () => ({
	time: vi.fn()
}));

const mockTime = vi.mocked(time);

describe("timestampToLocalTime", () => {
	beforeEach(() => {
		mockTime.mockReturnValue(false);
	});

	it("returns empty string for null", () => {
		expect(timestampToLocalTime(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(timestampToLocalTime(undefined)).toBe("");
	});

	it("returns empty string for 0", () => {
		expect(timestampToLocalTime(0)).toBe("");
	});

	it("returns time string for valid timestamp", () => {
		const ts = Math.floor(new Date("2024-06-15T14:30:00").getTime() / 1000);
		const result = timestampToLocalTime(ts);
		// Should be a locale time string (HH:MM format)
		expect(result).toBeTruthy();
		expect(typeof result).toBe("string");
	});

	it("returns today_time message when showDate=true and date is today", () => {
		// First call to time() returns true (today match)
		mockTime.mockReturnValueOnce(true);

		const ts = Math.floor(Date.now() / 1000);
		const result = timestampToLocalTime(ts, true);
		expect(result).toContain("today_time");
	});

	it("returns yesterday_time message when showDate=true and date is yesterday", () => {
		// First call (today) returns false, second call (yesterday) returns true
		mockTime.mockReturnValueOnce(false).mockReturnValueOnce(true);

		const ts = Math.floor(Date.now() / 1000) - 86400;
		const result = timestampToLocalTime(ts, true);
		expect(result).toContain("yesterday_time");
	});

	it("returns tomorrow_time message when showDate=true and date is tomorrow", () => {
		// First call (today) returns false, second (yesterday) false, third (tomorrow) true
		mockTime.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true);

		const ts = Math.floor(Date.now() / 1000) + 86400;
		const result = timestampToLocalTime(ts, true);
		expect(result).toContain("tomorrow_time");
	});

	it("returns locale date+time string for other dates with showDate=true", () => {
		// All date comparisons return false
		mockTime.mockReturnValue(false);

		const ts = Math.floor(new Date("2023-01-15T10:00:00").getTime() / 1000);
		const result = timestampToLocalTime(ts, true);
		// Should be a locale string, not a message key
		expect(result).not.toContain("today_time");
		expect(result).not.toContain("yesterday_time");
		expect(result).not.toContain("tomorrow_time");
		expect(result).toBeTruthy();
	});
});
