import { getClientConfig } from "@/lib/services/config/config.server";
import { respond } from "@/lib/server/api/respond";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";

export async function GET({ request }) {
	return respond(request, getClientConfig(), { headers: cacheHttpHeaders(300, 3600, 86400) });
}
