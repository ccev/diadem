import { baseLocale } from "@/lib/paraglide/runtime";
import { getSitemapPages } from "@/lib/server/sitemap";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getDisallowedPaths } from "@/lib/utils/disallowedPaths";
import { getSeoOrigin } from "@/lib/utils/localePaths";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ url }) => {
	const { general } = getClientConfig();
	if (!general.allowCrawlers) return new Response(null, { status: 404 });

	const pages = getSitemapPages(getDisallowedPaths(general.disallowedPaths));
	if (!pages.length) return new Response(null, { status: 404 });

	const origin = getSeoOrigin(general.url, url.origin);
	const entries = pages.flatMap((group) => {
		const variants = group.map(({ locale, path }) => ({
			locale,
			href: new URL(path, origin).href.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
		}));
		const defaultHref = variants.find(({ locale }) => locale === baseLocale)?.href;
		const alternates = variants.map(
			({ locale, href }) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${href}" />`
		);
		if (defaultHref) {
			alternates.push(
				`    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultHref}" />`
			);
		}
		return variants.map(({ href }) =>
			["  <url>", `    <loc>${href}</loc>`, ...alternates, "  </url>"].join("\n")
		);
	});
	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries,
		"</urlset>"
	].join("\n");
	return new Response(xml, {
		headers: { "Content-Type": "application/xml; charset=utf-8" }
	});
};
