export const ALLOWED_WIDTHS = ["64"];
export const ALLOWED_FORMATS: ("webp" | "png")[] = ["webp", "png"];

type ResizeOptions = {
	width?: number;
};

export function resize(url: string, options?: ResizeOptions) {
	url += "?";
	const params = [];
	if (options && options.width) params.push(`w=${options.width}`);

	url += params.join("&");
	return url;
}

/**
 * Request the image padded to a centered square at its original largest
 * dimension (width === height === max(originalWidth, originalHeight)).
 */
export function square(url: string) {
	return url + "?square=1";
}
