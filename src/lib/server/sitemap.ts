import { locales } from "@/lib/paraglide/runtime";
import { isDisallowedPath } from "@/lib/utils/disallowedPaths";
import { localizedPagePaths, localizePath } from "@/lib/utils/localePaths";

export const sitemapPath = "/sitemap.xml";

export function getSitemapPages(disallowedPaths: readonly string[]) {
	if (isDisallowedPath(sitemapPath, disallowedPaths)) return [];

	// Only advertise stable pages, not one-off share links or live map objects.
	return localizedPagePaths
		.map((path) =>
			locales
				.map((locale) => ({ locale, path: localizePath(path, locale) }))
				.filter(({ path }) => !isDisallowedPath(path, disallowedPaths))
		)
		.filter((group) => group.length > 0);
}
