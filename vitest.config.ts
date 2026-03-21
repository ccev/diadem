import { defineConfig, mergeConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src")
		}
	},
	test: {
		include: ["src/**/*.test.ts"],
		environment: "node",
		setupFiles: ["src/test/setup.ts"]
	}
});
