import { enrichAutoBattleResponse, proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";
import { error } from "@sveltejs/kit";

export async function POST({ locals, request, params }) {
	if (!locals.user) error(401, "Authentication is required");
	return enrichAutoBattleResponse(
		await proxyAutoBattleRequest(request, `battle/gym/${encodeURIComponent(params.id)}`, true)
	);
}
