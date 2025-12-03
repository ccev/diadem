import { hasFeatureAnywhere } from '@/lib/services/user/checkPerm';
import { json, redirect } from '@sveltejs/kit';
import type { MapObjectRequestData } from '@/lib/mapObjects/updateMapObject';
import type { ScoutRequest } from '@/lib/features/scout.svelte.js';
import { getServerConfig } from '@/lib/services/config/config.server';
import { addScoutEntries, getScoutQueue } from '@/lib/server/api/dragoniteApi';

import { noPermResult, result } from '@/lib/server/api/results';
import { getLogger } from '@/lib/server/logging';

const log = getLogger("scout")

export async function POST({ request, locals }) {
	// TODO: rate limit
	if (!hasFeatureAnywhere(locals.perms, "scout")) return json(noPermResult(undefined))

	const scoutData: ScoutRequest = await request.json()

	if (!scoutData.coords) return json(result(undefined, "No Coords"))

	const username = locals.user?.username ?? "unknown user from maltemap"
	const locations = scoutData.coords.map(c => [c.lat, c.lon])
	const success = await addScoutEntries(username, locations)

	log.info("Queued scout entries / success: %s / locations: %d", "" + success, locations.length)

	if (success) {
		return json(result())
	} else {
		return json(result(undefined, "Internal Error"))
	}
}

export async function GET({ locals }) {
	if (!hasFeatureAnywhere(locals.perms, "scout")) return json(noPermResult(undefined))

	const response = await getScoutQueue()

	log.info("Fetched scout queue size")

	if (response === undefined) {
		return json(result(undefined, "Internal Error"))
	} else {
		return json(result(response))
	}
}