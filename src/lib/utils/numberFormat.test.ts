import { describe, it, expect } from "vitest";
import { formatNumber, formatNumberCompact, formatRatio, formatPercentage, formatDecimal } from "./numberFormat";

describe("formatNumber", () => {
	it("returns N/A for null, undefined, and NaN", () => {
		expect(formatNumber(null)).toBe("N/A");
		expect(formatNumber(undefined)).toBe("N/A");
		expect(formatNumber(NaN)).toBe("N/A");
	});

	it("formats zero", () => {
		expect(formatNumber(0)).toBe("0");
	});

	it("formats positive integers", () => {
		expect(formatNumber(1000)).toMatch(/1.?000/); // locale-dependent separator
	});

	it("formats negative numbers", () => {
		const result = formatNumber(-42);
		expect(result).toContain("42");
	});

	it("accepts Intl.NumberFormat options", () => {
		const result = formatNumber(3.14159, { maximumFractionDigits: 2 });
		expect(result).toMatch(/3[\.,]14/);
	});
});

describe("formatNumberCompact", () => {
	it("returns N/A for null, undefined, and NaN", () => {
		expect(formatNumberCompact(null)).toBe("N/A");
		expect(formatNumberCompact(undefined)).toBe("N/A");
		expect(formatNumberCompact(NaN)).toBe("N/A");
	});

	it("does not abbreviate numbers below 1000", () => {
		expect(formatNumberCompact(500)).toBe("500");
		expect(formatNumberCompact(0)).toBe("0");
		expect(formatNumberCompact(999)).toBe("999");
	});

	it("abbreviates thousands", () => {
		const result = formatNumberCompact(1500);
		expect(result).toMatch(/1[\.,]5K/i);
	});

	it("abbreviates millions", () => {
		const result = formatNumberCompact(2500000);
		expect(result).toMatch(/2[\.,]5M/i);
	});

	it("handles custom decimal places", () => {
		const result = formatNumberCompact(1234, 0);
		expect(result).toMatch(/1K/i);
	});
});

describe("formatRatio", () => {
	it("returns N/A when numerator or denominator is falsy", () => {
		expect(formatRatio(0, 100)).toBe("N/A");
		expect(formatRatio(100, 0)).toBe("N/A");
		expect(formatRatio(null, 100)).toBe("N/A");
		expect(formatRatio(100, null)).toBe("N/A");
		expect(formatRatio(undefined, undefined)).toBe("N/A");
	});

	it("formats simple ratios", () => {
		const result = formatRatio(1, 500);
		expect(result).toMatch(/1:500/);
	});

	it("formats large ratios with compact notation", () => {
		const result = formatRatio(1, 200000);
		expect(result).toMatch(/1:200K/i);
	});

	it("formats ratios with decimals when small", () => {
		const result = formatRatio(1, 50);
		expect(result).toMatch(/1:50/);
	});
});

describe("formatPercentage", () => {
	it("returns N/A for null, undefined, and NaN", () => {
		expect(formatPercentage(null)).toBe("N/A");
		expect(formatPercentage(undefined)).toBe("N/A");
		expect(formatPercentage(NaN)).toBe("N/A");
	});

	it("formats 0%", () => {
		const result = formatPercentage(0);
		expect(result).toMatch(/0[\.,]0%/);
	});

	it("formats 100%", () => {
		const result = formatPercentage(1);
		expect(result).toMatch(/100[\.,]0%/);
	});

	it("formats 50%", () => {
		const result = formatPercentage(0.5);
		expect(result).toMatch(/50[\.,]0%/);
	});

	it("respects custom decimal options", () => {
		const result = formatPercentage(0.123456, { minDecimals: 2, maxDecimals: 2 });
		expect(result).toMatch(/12[\.,]35%/);
	});
});

describe("formatDecimal", () => {
	it("returns N/A for null, undefined, and NaN", () => {
		expect(formatDecimal(null)).toBe("N/A");
		expect(formatDecimal(undefined)).toBe("N/A");
		expect(formatDecimal(NaN)).toBe("N/A");
	});

	it("formats with default 1 decimal", () => {
		const result = formatDecimal(99.456);
		expect(result).toMatch(/99[\.,]5/);
	});

	it("formats with custom decimal places", () => {
		const result = formatDecimal(3.14159, 3);
		expect(result).toMatch(/3[\.,]142/);
	});
});
