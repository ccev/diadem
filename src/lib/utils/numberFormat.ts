import * as m from "@/lib/paraglide/messages";
import { getLocale } from "@/lib/paraglide/runtime";

export function round(num: number, places: number) {
	const factor = 10 ** places;
	return Math.round(num * factor) / factor;
}

/**
 * Format a number with full precision and locale-specific formatting
 * @param value The number to format
 * @param options Optional Intl.NumberFormat options
 * @returns Formatted number string (e.g., "1,000,000.34")
 */
export function formatNumber(
	value: number | null | undefined,
	options?: Intl.NumberFormatOptions
): string {
	if (value === null || value === undefined || isNaN(value)) return "N/A";

	return new Intl.NumberFormat(getLocale(), options).format(value);
}

/**
 * Format a number with abbreviated suffix (K, M, B, T)
 * @param value The number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Abbreviated number string (e.g., "1.2M", "500K")
 */
export function formatNumberCompact(
	value: number | null | undefined,
	decimals: number = 1
): string {
	if (value === null || value === undefined || isNaN(value)) return "N/A";

	const absValue = Math.abs(value);

	if (absValue < 1000) {
		return formatNumber(value, { maximumFractionDigits: decimals });
	}

	let locale = getLocale();

	if (getLocale() === "de") {
		locale = "en";
	}

	return new Intl.NumberFormat(locale, {
		notation: "compact",
		compactDisplay: "short",
		maximumFractionDigits: decimals,
		minimumFractionDigits: 0
	}).format(value);
}

/**
 * Format a ratio as "1:X" where X is formatted based on size
 * @param numerator The count of the specific item
 * @param denominator The total count
 * @returns Formatted ratio string (e.g., "1:500", "1:1.5M")
 */
export function formatRatio(
	numerator: number | null | undefined,
	denominator: number | null | undefined
): string {
	if (!numerator || !denominator) {
		return "N/A";
	}

	const ratio = denominator / numerator;

	if (ratio >= 100_000) {
		return `1:${formatNumberCompact(ratio, 1)}`;
	}

	return `1:${formatNumber(ratio, { maximumFractionDigits: ratio >= 100 ? 0 : 1 })}`;
}

type PercentageOptions = {
	minDecimals?: number;
	maxDecimals?: number;
};

/**
 * Format a percentage
 * @param value The decimal value (e.g., 0.5 for 50%)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "50.0%")
 */
export function formatPercentage(
	value: number | null | undefined,
	options?: PercentageOptions
): string {
	if (value === null || value === undefined || isNaN(value)) return "N/A";

	return new Intl.NumberFormat(getLocale(), {
		style: "percent",
		minimumFractionDigits: options?.minDecimals ?? 1,
		maximumFractionDigits: options?.maxDecimals ?? 1
	}).format(value);
}

/**
 * Format a decimal number with specified precision
 * @param value The number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted decimal string (e.g., "99.5")
 */
export function formatDecimal(value: number | null | undefined, decimals: number = 1): string {
	if (value === null || value === undefined || isNaN(value)) return "N/A";

	return new Intl.NumberFormat(getLocale(), {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}

/**
 * Format a distance in meters as a human-readable string
 * @param distance Distance in meters
 * @returns Formatted distance string (e.g., "500 m", "1.25 km")
 */
export function formatDistance(distance: number): string {
	if (distance < 1000) {
		return m.format_distance_meters({ distance: formatNumber(distance) });
	}

	return m.format_distance_kilometers({
		distance: formatNumber(distance / 1000, { maximumFractionDigits: 2 })
	});
}

/**
 * Format a duration in seconds as a human-readable string
 * @param duration Duration in seconds
 * @returns Formatted duration string (e.g., "5 min", "1 hr 30 min")
 */
export function formatDuration(duration: number): string {
	const minutes = Math.max(1, Math.ceil(duration / 60));
	if (minutes < 60) return m.format_duration_minutes({ minutes });

	return m.format_duration_hours_minutes({
		hours: Math.floor(minutes / 60),
		minutes: minutes % 60
	});
}

/**
 * Format an elevation in meters as a human-readable string
 * @param elevation Elevation in meters
 * @returns Formatted elevation string (e.g., "12.5 m")
 */
export function formatElevation(elevation: number): string {
	return m.format_elevation_meters({
		elevation: formatNumber(elevation, { maximumFractionDigits: 1 })
	});
}
