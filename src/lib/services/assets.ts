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
