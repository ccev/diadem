import { dispatchPokemon } from "@/lib/server/push/dispatch";
import { mapGolbatPokemon } from "@/lib/server/push/mapWebhook";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { json } from "@sveltejs/kit";
import { timingSafeEqual } from "node:crypto";

const log = getLogger("push");

function secretMatches(provided: string, expected: string): boolean {
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export async function POST({ request }) {
	const push = getServerConfig().push;
	if (!push?.enabled) return json({ error: "Push disabled" }, { status: 503 });

	const header = request.headers.get("authorization") ?? "";
	const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
	if (!provided || !secretMatches(provided, push.intakeSecret)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	const pokemon = mapGolbatPokemon(body);
	// Ack immediately; matching is fast (in-memory) so we await it here.
	try {
		await dispatchPokemon(pokemon);
	} catch (err) {
		log.error(`intake dispatch failed: ${err}`);
	}
	return json({ ok: true, received: pokemon.length });
}
