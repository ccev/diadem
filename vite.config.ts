import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

process.title = "Diadem";

const vaulSvelteEntry = fileURLToPath(new URL("./diadem-vaul-svelte/dist/index.js", import.meta.url));

export default defineConfig({
	plugins: [
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			strategy: ["localStorage", "preferredLanguage", "baseLocale"]
		}),
		tailwindcss(),
		sveltekit()
	],
	server: {
		allowedHosts: true
	},
	resolve: {
		alias: {
			"diadem-vaul-svelte": vaulSvelteEntry
		},
		conditions: ["svelte", "browser", "module", "node", "development|production"]
	}
});
