import { locales } from "@/lib/paraglide/runtime";
import { remoteLocaleProvider } from "@/lib/server/provider/remoteLocaleProvider";
import { error, json } from "@sveltejs/kit";

export async function GET({ params }) {
	const locale = params.tag as (typeof locales)[number];

	if (!locales.includes(locale)) {
		error(404);
	}

	return json(await remoteLocaleProvider.getSingle(locale));
}
