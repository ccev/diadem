import { describe, expect, it } from "vitest";
import {
	calculateShowcaseScore,
	type ShowcaseMeasurements,
	type ShowcaseMetadata
} from "@/lib/utils/showcase";

const pikachu: ShowcaseMetadata = {
	height: 0.4,
	weight: 6,
	weightStdDev: 0.75,
	xxlUpperBound: 0.7
};
const measurements: ShowcaseMeasurements = {
	height: 0.67,
	weight: 11,
	size: 5,
	atk_iv: 15,
	def_iv: 15,
	sta_iv: 15
};

describe("biggest Showcase scoring", () => {
	it("keeps the published formula unrounded for thresholding and ordering", () => {
		const expected = (800 * 0.67) / 0.7 + (150 * 11) / (6 * 1.75 + 4 * 0.75) + 50 + 7300 / 41;
		const score = calculateShowcaseScore(pikachu, measurements);
		expect(score).toBeCloseTo(expected, 10);
		expect(score).not.toBe(Math.round(expected));
	});

	it("adds the XXL bonus only for category 5, including at the same height", () => {
		const xxl = calculateShowcaseScore(pikachu, measurements)!;
		for (const size of [1, 2, 3, 4]) {
			expect(xxl - calculateShowcaseScore(pikachu, { ...measurements, size })!).toBeCloseTo(
				7300 / 41,
				10
			);
		}
	});

	it.each([
		[1.095, 17.065, 416.4429181929182],
		[1.105, 17.075, 419.54365079365084],
		[1.425, 33.865, 531.314713064713],
		[1.435, 33.875, 534.4154456654455]
	])("matches the published Amaura example endpoint %s m / %s kg", (height, weight, expected) => {
		const meta = { height: 1.3, weight: 25.2, weightStdDev: 3.15, xxlUpperBound: 2.6 };
		const ivs = height < 1.2 ? [15, 10, 10] : [4, 4, 3];
		expect(
			calculateShowcaseScore(meta, {
				height,
				weight,
				size: 3,
				atk_iv: ivs[0],
				def_iv: ivs[1],
				sta_iv: ivs[2]
			})
		).toBeCloseTo(expected, 8);
	});

	it("matches the published Galarian Ponyta example with that form's dimensions", () => {
		const ponyta = { height: 0.8, weight: 24, weightStdDev: 3, xxlUpperBound: 1.4 };
		const input = { height: 1.335, weight: 38.675, size: 5, atk_iv: 15, def_iv: 14, sta_iv: 14 };
		expect(calculateShowcaseScore(ponyta, input)).toBeCloseTo(1096.1142566782814, 8);
		expect(calculateShowcaseScore(pikachu, input)).not.toBeCloseTo(1096.1142566782814, 8);
	});

	it("uses exceptional form deviations and height groups without universal defaults", () => {
		const originPalkia = { height: 6.3, weight: 660, weightStdDev: 42, xxlUpperBound: 9.765 };
		const input = { ...measurements, height: 9.765, weight: 1353 };
		expect(calculateShowcaseScore(originPalkia, input)).toBeCloseTo(1198.45180315783, 8);
	});

	it("accepts zero IVs and zero weight as known values", () => {
		expect(
			calculateShowcaseScore(pikachu, {
				...measurements,
				weight: 0,
				atk_iv: 0,
				def_iv: 0,
				sta_iv: 0
			})
		).toBeCloseTo((800 * 0.67) / 0.7 + 7300 / 41, 10);
	});

	it.each([undefined, NaN, Infinity, -1, 0.5, 16])("rejects unavailable/invalid IV %s", (iv) => {
		expect(calculateShowcaseScore(pikachu, { ...measurements, atk_iv: iv })).toBeUndefined();
		expect(calculateShowcaseScore(pikachu, { ...measurements, def_iv: iv })).toBeUndefined();
		expect(calculateShowcaseScore(pikachu, { ...measurements, sta_iv: iv })).toBeUndefined();
	});

	it.each([undefined, NaN, Infinity, -1, 0, 1.5, 6])(
		"rejects unavailable/invalid size %s",
		(size) => {
			expect(calculateShowcaseScore(pikachu, { ...measurements, size })).toBeUndefined();
		}
	);

	it.each([NaN, Infinity, -1])("rejects invalid dimensions %s", (value) => {
		expect(calculateShowcaseScore(pikachu, { ...measurements, height: value })).toBeUndefined();
		expect(calculateShowcaseScore(pikachu, { ...measurements, weight: value })).toBeUndefined();
	});

	it("rejects missing, invalid or incomplete metadata", () => {
		expect(calculateShowcaseScore(undefined, measurements)).toBeUndefined();
		for (const key of ["height", "weight", "weightStdDev", "xxlUpperBound"] as const) {
			for (const value of [undefined, NaN, Infinity, -1]) {
				expect(
					calculateShowcaseScore({ ...pikachu, [key]: value } as ShowcaseMetadata, measurements)
				).toBeUndefined();
			}
		}
		expect(
			calculateShowcaseScore({ ...pikachu, xxlUpperBound: 0.4 }, measurements)
		).toBeUndefined();
	});
});
