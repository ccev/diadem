import { getClientConfig } from "@/lib/services/config/config.server";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { json } from "@sveltejs/kit";

export async function GET() {
	return json(getClientConfig(), { headers: cacheHttpHeaders(300, 3600, 86400) });
}
