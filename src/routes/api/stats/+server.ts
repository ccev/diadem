import { mergeFortAvailability } from "@/lib/server/api/queryStats";
import { masterstatsProvider } from "@/lib/server/provider/masterStatsProvider";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { json } from "@sveltejs/kit";

export async function GET() {
	try {
		const stats = await masterstatsProvider.get();
		return json(mergeFortAvailability(stats), { headers: cacheHttpHeaders(300, 3600, 3600) });
	} catch (e) {
		return json(
			{
				pokemon: {},
				generatedAt: 0
			},
			{ headers: cacheHttpHeaders(300, 3600, 3600) }
		);
	}
}
