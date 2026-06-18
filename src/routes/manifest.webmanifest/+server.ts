import { getClientConfig } from "@/lib/services/config/config.server";
import { json } from "@sveltejs/kit";

export const prerender = false;

export function GET() {
	const general = getClientConfig().general;
	const name = general.mapName || "Diadem";

	const manifest = {
		name,
		short_name: name.length > 12 ? name.slice(0, 12) : name,
		description: general.description || `${name} — Pokémon GO map`,
		start_url: "/",
		scope: "/",
		display: "standalone",
		orientation: "any",
		background_color: "#0b0b0c",
		theme_color: "#111827",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
			{ src: "/maskable-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
		]
	};

	return json(manifest, {
		headers: { "Content-Type": "application/manifest+json" }
	});
}
