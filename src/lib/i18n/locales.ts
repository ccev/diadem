export const locales = ["en", "de", "es", "pt", "pl"] as const;
export type Locale = (typeof locales)[number];
export const baseLocale: Locale = "en";
export const sessionLocaleCookie = "diadem_session_locale";
export const localePreferenceKey = "diadem_locale";

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function preferredLocale(languages: readonly string[]): Locale {
	for (const language of languages) {
		const locale = language.toLowerCase().split("-")[0];
		if (isLocale(locale)) return locale;
	}
	return baseLocale;
}

export function localeRedirect(url: URL) {
	const locale = url.pathname.split("/")[1];
	if (!isLocale(locale)) return;

	// An absolute same-origin URL also keeps paths starting with // or /\\ local.
	const target = new URL(url);
	target.pathname = url.pathname.slice(locale.length + 1) || "/";
	// The path's explicit language wins over an older share-link query parameter.
	if (target.searchParams.has("lang")) target.searchParams.delete("lang");
	return { locale, location: target.href };
}
