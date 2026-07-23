import { proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";
import { error } from "@sveltejs/kit";

export function POST({ locals, request }) {
	if (!locals.user) error(401, "Authentication is required");
	return proxyAutoBattleRequest(request, "friends", true);
}
