import { loadLocale } from "wuchale/load-utils";
import "../../locales/main.loader.svelte.js";
import {
	isLocale,
	localePreferenceKey,
	localeRedirect,
	preferredLocale,
	sessionLocaleCookie,
	type Locale
} from "./locales";

export async function initLocale(url: URL) {
	// Keep older shared ?lang= links working, with the same session-only semantics.
	const linkLocale = localeRedirect(url)?.locale ?? url.searchParams.get("lang");
	if (isLocale(linkLocale)) {
		document.cookie = `${sessionLocaleCookie}=${linkLocale}; Path=/; SameSite=Lax`;
	}
	const sessionLocale = document.cookie
		.split("; ")
		.find((cookie) => cookie.startsWith(`${sessionLocaleCookie}=`))
		?.slice(sessionLocaleCookie.length + 1);
	let savedLocale: string | null = null;
	try {
		savedLocale = localStorage.getItem(localePreferenceKey);
		// Preserve existing explicit choices while retiring the old storage key.
		const previousLocale = localStorage.getItem("PARAGLIDE_LOCALE");
		if (!isLocale(savedLocale) && isLocale(previousLocale)) {
			savedLocale = previousLocale;
			localStorage.setItem(localePreferenceKey, savedLocale);
		}
		localStorage.removeItem("PARAGLIDE_LOCALE");
	} catch {
		// Locale selection also works when persistent storage is unavailable.
	}
	const locale = isLocale(linkLocale)
		? linkLocale
		: isLocale(sessionLocale)
			? sessionLocale
			: isLocale(savedLocale)
				? savedLocale
				: preferredLocale(navigator.languages);
	await loadLocale(locale);
	document.documentElement.lang = locale;
}

export function setLocale(locale: Locale) {
	if (!isLocale(locale)) return;
	try {
		localStorage.setItem(localePreferenceKey, locale);
	} catch {
		// Still apply the explicit choice for this session.
	}
	document.cookie = `${sessionLocaleCookie}=${locale}; Path=/; SameSite=Lax`;
	const url = new URL(window.location.href);
	url.searchParams.delete("lang");
	// Rebuild cached map labels and game data in the selected language as well.
	window.location.replace(url.href);
}
