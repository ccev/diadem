import { locales } from "@/lib/paraglide/runtime";
import { respond } from "@/lib/server/api/respond";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { error } from "@sveltejs/kit";

export async function GET({ params, request }) {
	const locale = params.tag as (typeof locales)[number];

	if (!locales.includes(locale)) {
		error(404);
	}

	return respond(request, await remoteLocaleProvider.getSingle(locale), {
		headers: cacheHttpHeaders(3600, 10800, 86400)
	});
}
