import { adapter as svelte, svelteKitDefaultHeuristic } from "@wuchale/svelte";
import { defineConfig } from "wuchale";
import { adapter as vanilla } from "wuchale/adapter-vanilla";
import { locales } from "./src/lib/i18n/locales.ts";

// Keep protocol values, geometry types, icon names and styling out of the catalogs.
// Returning undefined delegates all user-facing text to Wuchale's default rules.
function heuristic(text) {
	if (
		text.path.some(
			(scope) =>
				(["attribute", "property"].includes(scope.type) &&
					["class", "className", "style", "d", "icon", "text-font"].includes(scope.name)) ||
				(scope.type === "call" && /^(logger|log)\./.test(scope.name))
		)
	)
		return false;
	if (
		typeof text.body === "string" &&
		[
			"Feature",
			"FeatureCollection",
			"Point",
			"MultiPoint",
			"LineString",
			"MultiLineString",
			"Polygon",
			"MultiPolygon",
			"GeometryCollection",
			"AbortError",
			"Enter",
			"Escape"
		].includes(text.body)
	)
		return false;
}

export default defineConfig({
	locales: [...locales],
	adapters: {
		main: svelte({
			loader: "sveltekit",
			heuristic: (text, file) => heuristic(text) ?? svelteKitDefaultHeuristic(text, file),
			files: {
				include: ["src/**/*.svelte", "src/**/*.svelte.{js,ts}"],
				ignore: ["src/locales/**", "src/**/*.test.*", "src/routes/test/**"]
			}
		}),
		js: vanilla({
			heuristic,
			files: {
				include: "src/**/*.{js,ts}",
				ignore: [
					"src/**/*.svelte.{js,ts}",
					"src/**/*.d.ts",
					"src/**/*.test.*",
					"src/locales/**",
					"src/lib/server/**",
					"src/lib/services/config/**",
					"src/lib/services/geocoding/**",
					"src/lib/native/**",
					"src/lib/map/render/**",
					"src/lib/map/framerate.ts",
					"src/lib/utils/requests.ts",
					"src/lib/utils/apiUtils.server.ts",
					"src/lib/i18n/**",
					"src/routes/api/**",
					"src/routes/assets/**",
					"src/routes/robots.txt/**",
					"src/hooks.*"
				]
			}
		})
	}
});
