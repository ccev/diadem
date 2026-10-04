import { adapter as svelte } from "@wuchale/svelte";
import { defineConfig } from "wuchale";
import { locales } from "./src/lib/i18n/locales.ts";

export default defineConfig({
	locales: [...locales],
	adapters: {
		main: svelte({
			loader: "sveltekit",
			files: ["src/lib/i18n/messages.svelte.ts"],
			// Resolve the runtime inside each function, for both Svelte reactivity and SSR isolation.
			runtime: { initReactive: () => false, useReactive: false },
			// Every literal in the message module is user-facing, including abbreviations.
			heuristic: () => "message"
		})
	}
});
