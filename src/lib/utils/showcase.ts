export type ShowcaseMetadata = {
	height: number;
	weight: number;
	weightStdDev: number;
	xxlUpperBound: number;
};

export type ShowcaseMeasurements = {
	height: number;
	weight: number;
	size?: number;
	atk_iv?: number;
	def_iv?: number;
	sta_iv?: number;
};

/**
 * Predicted single-species biggest Showcase score, before display rounding.
 * Formula: FatalisticFeline's Showcase Points Calculator (SHOWCASE_SCORE).
 * https://docs.google.com/spreadsheets/d/1ZZwlZ2DOYeO0ouUgu-jXn3qmIf8jE4WTa3BhmtVupHc/edit
 * Callers must supply the exact form's metadata and the selected trainer's
 * dimensions. Unknown IVs/categories must not silently contribute zero points.
 */
export function calculateShowcaseScore(
	metadata: ShowcaseMetadata | undefined,
	measurements: ShowcaseMeasurements
): number | undefined {
	if (
		!metadata ||
		![metadata.height, metadata.weight, metadata.xxlUpperBound].every(
			(value) => Number.isFinite(value) && value > 0
		) ||
		!Number.isFinite(metadata.weightStdDev) ||
		metadata.weightStdDev < 0 ||
		metadata.xxlUpperBound <= metadata.height ||
		!Number.isFinite(measurements.height) ||
		measurements.height <= 0 ||
		!Number.isFinite(measurements.weight) ||
		measurements.weight < 0 ||
		!Number.isInteger(measurements.size) ||
		measurements.size! < 1 ||
		measurements.size! > 5
	) {
		return undefined;
	}

	const ivs = [measurements.atk_iv, measurements.def_iv, measurements.sta_iv];
	if (ivs.some((iv) => iv === undefined || !Number.isInteger(iv) || iv < 0 || iv > 15)) {
		return undefined;
	}

	const heightGroup = metadata.xxlUpperBound / metadata.height;
	const weightDenominator = metadata.weight * heightGroup + 4 * metadata.weightStdDev;
	if (!Number.isFinite(heightGroup) || !Number.isFinite(weightDenominator)) return undefined;

	const score =
		(800 * measurements.height) / metadata.xxlUpperBound +
		(150 * measurements.weight) / weightDenominator +
		(50 * (measurements.atk_iv! + measurements.def_iv! + measurements.sta_iv!)) / 45 +
		(measurements.size === 5 ? 7300 / 41 : 0);

	return Number.isFinite(score) ? score : undefined;
}
