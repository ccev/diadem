import { error } from "@sveltejs/kit";
import { getClientConfig } from "@/lib/services/config/config.server";
import { uiconsIndexProvider } from "@/lib/server/provider/uiconsIndexProvider";

const config = getClientConfig();

export async function GET({ params }) {
	const iconSetId = params.iconset;

	const iconSet = config.uiconSets.find((s) => s.id === iconSetId);
	if (!iconSet) {
		error(404, "Unknown Icon Set");
	}

	const index = await uiconsIndexProvider.getSingle(iconSetId);

	if (!index) {
		error(500, "Fetching index.json failed");
	}

	return new Response(index, {
		headers: {
			"Content-Type": "application/json"
		}
	});
}
