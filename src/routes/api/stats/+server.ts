import { mergeFortAvailability } from "@/lib/server/api/queryStats";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { respond } from "@/lib/server/api/respond";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";

export async function GET({ request }) {
	try {
		const stats = await masterstatsProvider.get();
		return respond(request, mergeFortAvailability(stats), { headers: cacheHttpHeaders(300, 3600, 3600) });
	} catch (e) {
		return respond(
			request,
			{
				pokemon: {},
				generatedAt: 0
			},
			{ headers: cacheHttpHeaders(300, 3600, 3600) }
		);
	}
}
