import { error, json } from "@sveltejs/kit";
import type { ScoutRequest } from "@/lib/features/scout.svelte.js";
import { addScoutEntries, getScoutQueue } from "@/lib/server/api/dragoniteApi";

import { result } from "@/lib/server/api/results";
import { getLogger } from "@/lib/server/logging";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";

const log = getLogger("scout");

export async function POST({ request, locals }) {
	// TODO: rate limit
	if (!hasFeatureAnywhereServer(locals.perms, "scout", locals.user)) error(401);

	const scoutData: ScoutRequest = await request.json();

	if (!scoutData.coords) return json(result(undefined, "No Coords"));

	const username = locals.user?.username ?? "unknown user from maltemap";
	const locations = scoutData.coords.map((c) => [c.lat, c.lon]);
	const success = await addScoutEntries(username, locations);

	log.info("Queued scout entries / success: %s / locations: %d", "" + success, locations.length);

	if (success) {
		return json(result());
	} else {
		return json(result(undefined, "Internal Error"));
	}
}

export async function GET({ locals }) {
	if (!hasFeatureAnywhereServer(locals.perms, "scout", locals.user)) error(401);

	const response = await getScoutQueue();

	log.info("Fetched scout queue size");

	if (response === undefined) {
		return json(result(undefined, "Internal Error"));
	} else {
		return json(result(response));
	}
}
