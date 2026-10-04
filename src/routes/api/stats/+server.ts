import { mergeFortAvailability } from "@/lib/server/api/queryStats";
import { FORT_API_REFRESH_SECONDS } from "@/lib/server/api/golbat/fortAvailability";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { respond } from "@/lib/server/api/respond";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { tappableAvailabilityProvider } from "@/lib/server/provider/tappableAvailabilityProvider";

export async function GET({ request }) {
	const tappablesAvailable = await tappableAvailabilityProvider
		.get()
		.then((result) => result.available)
		.catch(() => undefined);
	try {
		const stats = await masterstatsProvider.get();
		return respond(
			request,
			{ ...mergeFortAvailability(stats), tappablesAvailable },
			{
				headers: cacheHttpHeaders(FORT_API_REFRESH_SECONDS)
			}
		);
	} catch (e) {
		return respond(
			request,
			{
				tappablesAvailable,
				pokemon: {},
				generatedAt: 0
			},
			{ headers: cacheHttpHeaders(FORT_API_REFRESH_SECONDS) }
		);
	}
}
