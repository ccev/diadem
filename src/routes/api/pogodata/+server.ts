import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { json } from "@sveltejs/kit";

export async function GET() {
	const masterfile = await masterfileProvider.get();

	return json(masterfile, {
		headers: {
			...cacheHttpHeaders(3600)
		}
	});
}
