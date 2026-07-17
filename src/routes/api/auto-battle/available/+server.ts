import { proxyAutoBattleRequest } from "@/lib/server/api/autoBattleApi";

export function GET({ request }) {
	return proxyAutoBattleRequest(request, "battle/available");
}
