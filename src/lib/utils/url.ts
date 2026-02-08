interface UrlOptions {
	path?: string;
	params?: Record<string, any>;
}

export function buildUrl(base: string, options: UrlOptions = {}) {
	const { path, params } = options;

	const normalizedBase = base.replace(/\/+$/, "");

	let pathSegment = "";
	if (path) {
		pathSegment = path.startsWith("/") ? path : `/${path}`;
		pathSegment = pathSegment.replace(/\/+$/, "");
	}

	const url = new URL(`${normalizedBase}${pathSegment}`);

	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			url.searchParams.append(key, String(value));
		});
	}

	return url
}