import { readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vitest";

describe("biome popup icons", () => {
	it("uses runes mode so the rendered icon changes with the popup data", () => {
		const source = readFileSync(new URL("./BiomePopup.svelte", import.meta.url), "utf8");
		const { metadata } = compile(source, {
			filename: "BiomePopup.svelte",
			generate: "client"
		});

		expect(metadata.runes).toBe(true);
	});
});
