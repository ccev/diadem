import { baseLocale, locales } from "@/lib/paraglide/runtime";
import type { ClientConfig } from "@/lib/services/config/configTypes";
import { localizePath } from "@/lib/utils/localePaths";
import { beforeEach, expect, it, vi } from "vitest";
import { GET as getRobots } from "../robots.txt/+server";
import { GET as getSitemap } from "./+server";

const config = vi.hoisted(() => ({
	general: {} as Pick<ClientConfig["general"], "allowCrawlers" | "disallowedPaths" | "url">
}));
vi.mock("@/lib/services/config/config.server", () => ({ getClientConfig: () => config }));

const origin = "https://map.example";
const sitemap = () =>
	getSitemap({ url: new URL("https://internal.example/sitemap.xml") } as Parameters<
		typeof getSitemap
	>[0]);
const robots = () =>
	getRobots({ url: new URL("https://internal.example/robots.txt") } as Parameters<
		typeof getRobots
	>[0]);

beforeEach(() => {
	config.general = { allowCrawlers: true, url: origin };
});

it("lists canonical language variants of stable public pages and links each group reciprocally", async () => {
	const response = await sitemap();
	expect(response.status).toBe(200);
	expect(response.headers.get("Content-Type")).toContain("application/xml");
	const xml = await response.text();
	const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
	expect(entries).toHaveLength(2 * locales.length);
	for (const path of ["/", "/wayfarer"]) {
		const variants = locales.map((locale) => ({
			locale,
			url: origin + localizePath(path, locale)
		}));
		for (const { url } of variants) {
			const entry = entries.find((entry) => entry.includes(`<loc>${url}</loc>`));
			for (const variant of variants) {
				expect(entry).toContain(`hreflang="${variant.locale}" href="${variant.url}"`);
			}
			expect(entry).toContain(
				`hreflang="x-default" href="${origin + localizePath(path, baseLocale)}"`
			);
		}
	}
	expect(await (await robots()).text()).toContain(`Sitemap: ${origin}/sitemap.xml`);
});

it("omits blocked locales from both entries and alternate links", async () => {
	config.general.disallowedPaths = ["/de/wayfarer", "/pl$"];
	const xml = await (await sitemap()).text();
	expect(xml).not.toContain(`${origin}/de/wayfarer`);
	expect(xml).not.toContain(`"${origin}/pl"`);
	expect(xml).not.toContain(`<loc>${origin}/pl</loc>`);
	expect(xml).toContain(`<loc>${origin}/de</loc>`);
	expect(xml).toContain(`<loc>${origin}/pl/wayfarer</loc>`);
	const robotsText = await (await robots()).text();
	expect(robotsText).toContain("Disallow: /de/wayfarer");
	expect(robotsText).toContain("Disallow: /pl$");
});

it("uses the request origin if the public URL is not configured", async () => {
	config.general.url = undefined;
	expect(await (await sitemap()).text()).toContain("<loc>https://internal.example/de</loc>");
	expect(await (await robots()).text()).toContain("Sitemap: https://internal.example/sitemap.xml");
});

it.each([["/"], ["/*"], ["/sitemap.xml"], ["/$", "/wayfarer"]])(
	"does not publish a sitemap when it has no crawlable URLs or is blocked (%j)",
	async (...rules) => {
		config.general.disallowedPaths = rules;
		expect((await sitemap()).status).toBe(404);
		expect(await (await robots()).text()).not.toContain("Sitemap:");
	}
);

it("does not expose or advertise the sitemap when crawling is disabled", async () => {
	config.general.allowCrawlers = false;
	expect((await sitemap()).status).toBe(404);
	expect(await (await robots()).text()).toBe("User-agent: *\nDisallow: /");
});
