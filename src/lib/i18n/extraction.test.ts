import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { compile, compileModule } from "svelte/compiler";
import { getConfig, IndexTracker, pofile } from "wuchale";

const root = path.resolve(import.meta.dirname, "../../..");
const config = await getConfig(path.join(root, "wuchale.config.js"));

describe("source-text extraction", () => {
	it("extracts the bottom navigation labels used after changing language", async () => {
		const filename = "src/components/ui/BottomNav.svelte";
		const result = await config.adapters.main.transform({
			filename,
			content: readFileSync(path.join(root, filename), "utf8"),
			index: new IndexTracker(true),
			expr: { plain: "load()", reactive: "load()" },
			matchUrl: () => null
		});
		expect(result.txts.map((text) => text.body)).toEqual(["Filters", "Tools", "Profile"]);
	});

	it.each(["js", "ts"])(
		"initializes translated function runtimes in .svelte.%s modules",
		async (ext) => {
			const filename = `src/Example.svelte.${ext}`;
			const result = await config.adapters.main.transform({
				filename,
				content: `let menu = $state("profile");
				export function title() {
					if (menu === "profile") return "Profile";
					return "Filters";
				}`,
				index: new IndexTracker(true),
				expr: { plain: "load()", reactive: "load()" },
				matchUrl: () => null
			});
			const code = result.output("").code!;
			const compiled = compileModule(code, { filename, generate: "server" }).js.code;
			const load = vi.fn(() => (index: number) => ["Profil", "Filter"][index]);
			const title = new Function(
				"load",
				compiled.replace(/^import .*;$/gm, "").replace("export function title", "function title") +
					"\nreturn title;"
			)(load);
			expect(load).not.toHaveBeenCalled();
			expect(title()).toBe("Profil");
			expect(load).toHaveBeenCalledOnce();
		}
	);

	it("extracts reactive Svelte text and abbreviations while preserving technical values", async () => {
		const result = await config.adapters.main.transform({
			filename: "src/Example.svelte",
			content: `<script lang="ts">
				let { ready, name }: { ready: boolean; name: string } = $props();
				const title = ready ? "Close" : "Retry";
				const geometry = { type: "FeatureCollection", features: [] };
			</script>
			<button title={title} class="{name} flex items-center">Hello <b>{name}</b>!</button>
			<span title={/* @wc-include */ "CP"}>Pokémon</span>`,
			index: new IndexTracker(true),
			expr: { plain: "load()", reactive: "load()" },
			matchUrl: () => null
		});
		const messages = result.txts.map((text) => text.body);
		expect(messages).toEqual(
			expect.arrayContaining(["Close", "Retry", "Hello <0/>!", "CP", "Pokémon"])
		);
		expect(messages).not.toContain("FeatureCollection");
		expect(messages.some((text) => String(text).includes("flex items-center"))).toBe(false);
		const code = result.output("").code!;
		expect(code).toContain("$derived(");
		expect(() => compile(code, { filename: "Example.svelte", generate: "client" })).not.toThrow();
	});

	it("keeps the complete sign-in sentence and its Portuguese prefix in one message", async () => {
		const filename = "src/components/ui/user/SignInButton.svelte";
		const result = await config.adapters.main.transform({
			filename,
			content: readFileSync(path.join(root, filename), "utf8"),
			index: new IndexTracker(true),
			expr: { plain: "load()", reactive: "load()" },
			matchUrl: () => null
		});
		const source = "<0>Link your Discord account</0> to access more features";
		expect(result.txts.some((text) => text.body === source)).toBe(true);
		const storage = await pofile()({
			root,
			localesDir: "src/locales",
			locales: ["en", "pt"],
			sourceLocale: "en",
			fs: {
				read: (file) => readFileSync(file, "utf8"),
				exists: existsSync,
				write: vi.fn(),
				mkdir: vi.fn(),
				unlink: () => false
			}
		});
		const messages = await storage.load();
		const prompt = messages.find((item) => item.translations.get("en") === source);
		expect(prompt?.translations.get("pt")).toMatch(
			/^Para desbloquear mais funcionalidades, <0>.+<\/0>/
		);
		expect(messages.some((item) => item.context?.includes("_"))).toBe(false);
	});
});
