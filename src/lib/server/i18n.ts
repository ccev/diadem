import type { Handle } from "@sveltejs/kit";
import { loadLocales, runWithLocale } from "wuchale/load-utils/server";
import * as main from "../../locales/main.loader.server.svelte.js";
import {
	baseLocale,
	isLocale,
	locales,
	localeRedirect,
	sessionLocaleCookie
} from "@/lib/i18n/locales";
import { getClientConfig } from "@/lib/services/config/config.server";

const catalogsReady = loadLocales(main.key, main.loadCount, main.loadCatalog, [...locales]);

export const handleLocale: Handle = async ({ event, resolve }) => {
	const localized = localeRedirect(event.url);
	const linkLocale = localized?.locale ?? event.url.searchParams.get("lang");
	const cookieOptions = {
		path: "/",
		httpOnly: false,
		sameSite: "lax" as const,
		secure: event.url.protocol === "https:"
	};
	if (isLocale(linkLocale)) {
		event.cookies.set(sessionLocaleCookie, linkLocale, cookieOptions);
	}
	if (localized && !event.isDataRequest) {
		// Do not let a cached redirect skip setting the next visitor's session cookie.
		// Early hook responses must include their own cookies and headers.
		return new Response(null, {
			status: 307,
			headers: {
				location: localized.location,
				"cache-control": "private, no-store",
				"set-cookie": event.cookies.serialize(sessionLocaleCookie, localized.locale, cookieOptions)
			}
		});
	}
	// Client data requests resolve normally so Kit can deliver the cookie. The
	// locale route's universal load then redirects after the root loads the catalog.
	const sessionLocale = event.cookies.get(sessionLocaleCookie);
	const defaultLocale = getClientConfig().general.defaultLocale;
	const locale = isLocale(linkLocale)
		? linkLocale
		: isLocale(sessionLocale)
			? sessionLocale
			: isLocale(defaultLocale)
				? defaultLocale
				: baseLocale;
	await catalogsReady;
	return runWithLocale(locale, () =>
		resolve(event, {
			transformPageChunk: ({ html }) => html.replace("%lang%", locale)
		})
	);
};
