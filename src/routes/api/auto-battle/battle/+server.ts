import { enrichAutoBattleResponse, proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";
import { error } from "@sveltejs/kit";

export async function POST({ locals, request }) {
	if (!locals.user) error(401, "Authentication is required");
	return enrichAutoBattleResponse(await proxyAutoBattleRequest(request, "battle", true));
}
