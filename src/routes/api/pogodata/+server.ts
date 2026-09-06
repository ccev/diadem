import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { respond } from "@/lib/server/api/respond";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";

export async function GET({ request }) {
	const masterfile = await masterfileProvider.get();

	return respond(request, masterfile, {
		headers: cacheHttpHeaders(3600, 3600, 86400)
	});
}
