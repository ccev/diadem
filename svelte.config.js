import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isNative = process.env.BUILD_TARGET === "native";
const nodeAdapter = adapterNode();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: isNative
			? adapterStatic({ fallback: "index.html", strict: false })
			: {
					...nodeAdapter,
					async adapt(builder) {
						await nodeAdapter.adapt(builder);
						builder.copy(
							"src/lib/server/workers/cpu.worker.mjs",
							"build/server/workers/cpu.worker.mjs"
						);
						builder.copy(
							"src/lib/server/encounterIdCrypto.mjs",
							"build/server/encounterIdCrypto.mjs"
						);
						builder.copy(
							"src/lib/geometry/permissionBounds.mjs",
							"build/geometry/permissionBounds.mjs"
						);
					}
				},
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
			register: false
		}
	},

	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
