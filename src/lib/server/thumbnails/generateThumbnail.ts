import { dev } from "$app/environment";
import { cacheHttpHeaders } from "@/lib/utils/apiUtils.server";
import { getLogger } from "@/lib/utils/logger";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join } from "path";
import satori from "satori";
import { html } from "satori-html";
import { render } from "svelte/server";

const log = getLogger("thumbnail");

let interRegular: Buffer;
let interBold: Buffer;

function loadFonts() {
	if (!interRegular || !interBold) {
		const base = dev ? "static" : "build/client";
		const fontsDir = join(process.cwd(), base, "fonts");
		interRegular = readFileSync(join(fontsDir, "Inter-Regular.ttf"));
		interBold = readFileSync(join(fontsDir, "Inter-Bold.ttf"));
	}
}

export async function generateThumbnail(rendered: ReturnType<typeof render>) {
	loadFonts();

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
