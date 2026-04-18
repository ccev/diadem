// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeFlexoki from "starlight-theme-flexoki";
import starlightPageActions from "starlight-page-actions";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			plugins: [
				starlightThemeFlexoki({ accentColor: "orange" }),
				starlightPageActions()
			],
			title: "Diadem Docs",
			social: [
				{ icon: "github", label: "GitHub", href: "https://github.com/ccev/discord" },
				{ icon: "discord", label: "Discord", href: "https://discord.com/invite/VGgsQN2hYG" }
			],
			sidebar: [
				{
					label: "Guides",
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: "Getting started", slug: "guides/getting-started" }
					]
				},
				{
					label: "Reference",
					autogenerate: { directory: "reference" }
				}
			]
		})
	]
});
