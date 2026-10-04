import { redirect } from "@sveltejs/kit";
import { localeRedirect } from "@/lib/i18n/locales";
import type { PageLoad } from "./$types";

// The server hook handles full requests; this also supports client navigation/native.
export const load: PageLoad = async ({ url, parent }) => {
	await parent();
	const localized = localeRedirect(url);
	if (localized) redirect(307, localized.location);
};
