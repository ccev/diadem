import { enrichAutoBattleResponse, proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";
import { error } from "@sveltejs/kit";

export async function GET({ locals, request, params }) {
	if (!locals.user) error(401, "Authentication is required");
	return enrichAutoBattleResponse(
		await proxyAutoBattleRequest(request, `battle/status/${encodeURIComponent(params.sessionId)}`)
	);
}
