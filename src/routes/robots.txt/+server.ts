import { getClientConfig } from "@/lib/services/config/config.server";
import { getDisallowedPaths } from "@/lib/utils/disallowedPaths";

export function GET() {
	const general = getClientConfig().general;

	let options: string[];

	if (general.allowCrawlers) {
		options = ["User-agent: *", "Allow: /"];

		for (const path of getDisallowedPaths()) {
			options.push(`Disallow: ${path}`);
		}
	} else {
		options = ["User-agent: *", "Disallow: /"];
	}

	return new Response(options.join("\n"), {
		headers: { "Content-Type": "text/plain" }
	});
}
