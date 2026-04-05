import { render } from "svelte/server";
import Base from "@/components/thumbnail/Base.svelte";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { html } from "satori-html";
import { readFileSync } from "fs";
import { join } from "path";
import { dev } from "$app/environment";
import { getClientConfig } from "@/lib/services/config/config.server";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("thumbnail");

let interRegular: ArrayBuffer;
let interBold: ArrayBuffer;

async function loadFonts() {
	if (!interRegular || !interBold) {
		const base = dev ? "static" : "build/client";
		const fontsDir = join(process.cwd(), base, "fonts");
		interRegular = await Bun.file(join(fontsDir, "Inter-Regular.ttf")).arrayBuffer();
		interBold = await Bun.file(join(fontsDir, "Inter-Bold.ttf")).arrayBuffer();
	}
}

export async function generateThumbnail(rendered: ReturnType<typeof render>) {
	await loadFonts();

	const markup = html("<style>" + rendered.head + "</style>" + rendered.body);

	const svg = await satori(markup, {
		width: 800,
		height: 400,
		fonts: [
			{
				name: "Inter",
				data: interRegular,
				weight: 400
			},
			{
				name: "Inter",
				data: interBold,
				weight: 700
			}
		]
	});

	const png = new Resvg(svg, {
		fitTo: { mode: "original" }
	})
		.render()
		.asPng();

	return new Response(png, {
		headers: {
			"Content-Type": "image/png",
			...cacheHttpHeaders(3600)
		}
	});
}
