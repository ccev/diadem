import { baseLocale, isLocale, locales, type Locale } from "@/lib/paraglide/runtime";

export const seoLocales = locales.filter((locale) => locale !== baseLocale);
export const localizedPagePaths = ["/", "/map", "/coverage", "/wayfarer"] as const;

export function splitLocalePath(pathname: string): { path: string; locale?: Locale } {
	const prefix = /^\/([^/]+)/.exec(pathname)?.[1];
	if (!prefix) return { path: pathname };
	// SvelteKit matches decoded segments, while URL.pathname keeps their original encoding.
	try {
		const locale = decodeURIComponent(prefix);
		if (isLocale(locale) && locale !== baseLocale) {
			return { path: pathname.slice(prefix.length + 1) || "/", locale };
		}
	} catch {
		// An invalid escape can't be a supported locale.
	}
	return { path: pathname };
}

export function stripSeoLocale(pathname: string): string {
	return splitLocalePath(pathname).path;
}

export function localizePath(pathname: string, locale: Locale): string {
	const path = stripSeoLocale(pathname);
	if (locale === baseLocale) return path;
	return `/${locale}${path === "/" ? "" : path}`;
}

export function getLegacyShareRedirect(url: URL): URL | undefined {
	const lang = url.searchParams.get("lang");
	if (lang === null) return;
	const target = new URL(url);
	const { locale } = splitLocalePath(url.pathname);
	target.pathname = localizePath(url.pathname, locale ?? (isLocale(lang) ? lang : baseLocale));
	target.searchParams.delete("lang");
	return target;
}

export function getSeoOrigin(configuredUrl: string | undefined, requestOrigin: string): string {
	if (configuredUrl && URL.canParse(configuredUrl)) {
		const url = new URL(configuredUrl);
		if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
	}
	return requestOrigin;
}
