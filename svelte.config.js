import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isNative = process.env.BUILD_TARGET === "native";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// Native builds use a separate working dir so they don't clobber the
		// generated types/files of a concurrently-running `pnpm run dev` server.
		outDir: isNative ? ".svelte-kit-native" : ".svelte-kit",
		adapter: isNative
			? adapterStatic({ fallback: "index.html", strict: false })
			: adapterNode(),
		alias: {
			"@": "src"
		},
		files: {
			serviceWorker: "src/lib/serviceWorker/index.ts"
		},
		// The PWA service worker is pointless inside Capacitor and actively breaks
		// cross-origin map tiles (it intercepts and fails them). Don't register it natively.
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
