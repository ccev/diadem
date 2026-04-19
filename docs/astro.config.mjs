// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeFlexoki from "starlight-theme-flexoki";
import starlightContextualMenu from "starlight-contextual-menu";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			plugins: [
				starlightThemeFlexoki({ accentColor: "orange" }),
				starlightContextualMenu({
					actions: ["copy", "view", "claude", "chatgpt", "lechat"]
				})
			],
			title: "Diadem Docs",
			favicon: "/favicon.svg",
			social: [
				{ icon: "github", label: "GitHub", href: "https://github.com/ccev/diadem" },
				{ icon: "discord", label: "Discord", href: "https://discord.com/invite/VGgsQN2hYG" }
			],
			sidebar: [
				{
					label: "Guides",
					items: [
						{ label: "Installation", slug: "guides/installation" },
						{ label: "Translate Diadem", slug: "guides/translating" },
						{ label: "Set up a CDN using Cloudflare Cache", slug: "guides/cloudflare-cache" },
						{ label: "Extending Diadem", slug: "guides/extending" },
						{ label: "Self-host address search using Photon", slug: "guides/photon" },
						{ label: "Self-host map tiles using Rampardos", slug: "guides/tileserver" }
					]
				},
				{
					label: "Reference",
					items: [{ label: "Configuration", slug: "reference/configuration" }]
				}
			]
		})
	]
});
