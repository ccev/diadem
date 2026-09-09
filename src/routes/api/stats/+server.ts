import { mergeFortAvailability } from "@/lib/server/api/queryStats";
import { FORT_API_REFRESH_SECONDS } from "@/lib/server/api/golbatFortApi";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { respond } from "@/lib/server/api/respond";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";

export async function GET({ request }) {
	try {
		const stats = await masterstatsProvider.get();
		return respond(request, mergeFortAvailability(stats), {
			headers: cacheHttpHeaders(FORT_API_REFRESH_SECONDS, FORT_API_REFRESH_SECONDS)
		});
	} catch (e) {
		return respond(
			request,
			{
				pokemon: {},
				generatedAt: 0
			},
			{ headers: cacheHttpHeaders(FORT_API_REFRESH_SECONDS, FORT_API_REFRESH_SECONDS) }
		);
	}
}
