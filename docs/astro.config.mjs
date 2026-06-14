// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightContextualMenu from "starlight-contextual-menu";
import starlightThemeFlexoki from "starlight-theme-flexoki";

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
						{ label: "Caching", slug: "guides/cache" },
						{ label: "Extending Diadem", slug: "guides/extending" },
						{ label: "Self-host address search", slug: "guides/photon" },
						{ label: "Self-host map tiles", slug: "guides/tileserver" }
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
