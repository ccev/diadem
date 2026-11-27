import { getSitemapPages, sitemapPath } from "@/lib/server/sitemap";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getDisallowedPaths } from "@/lib/utils/disallowedPaths";
import { getSeoOrigin } from "@/lib/utils/localePaths";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ url }) => {
	const general = getClientConfig().general;

	let options: string[];

	if (general.allowCrawlers) {
		const disallowedPaths = getDisallowedPaths(general.disallowedPaths);
		options = ["User-agent: *", ...disallowedPaths.map((path) => `Disallow: ${path}`)];
		if (getSitemapPages(disallowedPaths).length) {
			const sitemapUrl = new URL(sitemapPath, getSeoOrigin(general.url, url.origin));
			options.push("", `Sitemap: ${sitemapUrl.href}`);
		}
	} else {
		options = ["User-agent: *", "Disallow: /"];
	}

	return new Response(options.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8" }
	});
};
