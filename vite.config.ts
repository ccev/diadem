import { wuchale } from "wuchale/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

process.title = "Diadem";

export default defineConfig({
	plugins: [wuchale(), tailwindcss(), sveltekit()],
	server: {
		allowedHosts: true
	}
});
