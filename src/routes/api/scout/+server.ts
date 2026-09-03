import type { ScoutRequest } from "@/lib/features/scout.svelte.js";
import { addScoutEntries, getScoutQueue } from "@/lib/server/api/dragoniteApi";
import { readRequestBody } from "@/lib/server/api/requestBody";
import { respond } from "@/lib/server/api/respond";
import { error } from "@sveltejs/kit";

import { result } from "@/lib/server/api/results";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("scout");

export async function POST({ request, locals }) {
	// TODO: rate limit
	if (!hasFeatureAnywhereServer(locals.perms, Features.SCOUT, locals.user)) error(401);

	const scoutData = await readRequestBody<ScoutRequest>(request);

	if (!scoutData.coords) return respond(request, result(undefined, "No Coords"));

	const username = "Diadem: " + (locals.user?.name || "<unknown user>");
	const locations = scoutData.coords.map((c) => [c.lat, c.lon]);
	const success = await addScoutEntries(username, locations);

	log.info(
		"Queued scout entries / success: %s / user: %s / locations: %d",
		"" + success,
		locals.user?.id || "unauthed",
		locations.length
	);

	if (success) {
		return respond(request, result());
	} else {
		return respond(request, result(undefined, "Internal Error"));
	}
}

export async function GET({ locals, request }) {
	if (!hasFeatureAnywhereServer(locals.perms, Features.SCOUT, locals.user)) error(401);

	const response = await getScoutQueue();

	log.info("Fetched scout queue size");

	if (response === undefined) {
		return respond(request, result(undefined, "Internal Error"));
	} else {
		return respond(request, result(response));
	}
}
