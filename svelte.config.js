import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isNative = process.env.BUILD_TARGET === "native";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: isNative ? adapterStatic({ fallback: "index.html", strict: false }) : adapterNode(),
		alias: {
			"@": "src"
		},
		prerender: {
			entries: isNative ? [] : ["*"]
		},
		files: {
			serviceWorker: "src/lib/serviceWorker/index.ts"
		},
		serviceWorker: {
			register: !isNative
		}
	},

	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
