import { readRequestBody } from "@/lib/server/api/requestBody";
import { setUserMapPosition } from "@/lib/server/db/internal/repository";
import { allowSettingsWrite } from "@/lib/server/api/settingsRateLimit";
import { noStoreHttpHeaders } from "@/lib/utils/apiUtils.server";
import { json } from "@sveltejs/kit";

type PositionBody = {
	lat?: number;
	lng?: number;
	zoom?: number;
};

function isValid(body: PositionBody): boolean {
	const { lat, lng, zoom } = body;
	return (
		typeof lat === "number" &&
		typeof lng === "number" &&
		typeof zoom === "number" &&
		Number.isFinite(lat) &&
		Number.isFinite(lng) &&
		Number.isFinite(zoom) &&
		lat >= -90 &&
		lat <= 90 &&
		zoom >= 0 &&
		zoom <= 30
	);
}

/**
 * Fold a longitude back into [-180, 180]. MapLibre keeps counting past the
 * antimeridian — a user panning east reports 185 rather than -175 — so a range
 * check on the raw value would reject a perfectly ordinary position.
 */
function wrapLongitude(lng: number): number {
	const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
	return wrapped === -180 ? 180 : wrapped;
}

/**
 * Store just where the user is looking. The map writes this on every move, so it
 * is split off from the settings endpoint, which replaces the entire stored
 * object — filters and all — for what is three numbers.
 */
export async function POST({ locals, request }) {
	// 401 rather than a 200 with an error body, matching the settings route: a
	// caller keying off response.ok would otherwise record a rejected write.
	if (!locals.user) {
		return json({ error: "Not logged in" }, { status: 401, headers: noStoreHttpHeaders });
	}

	if (!(await allowSettingsWrite(locals.user.id))) {
		return json({ error: "Too many requests" }, { status: 429, headers: noStoreHttpHeaders });
	}

	let body: PositionBody;
	try {
		body = await readRequestBody(request);
	} catch {
		return json({ error: "Invalid body" }, { status: 400, headers: noStoreHttpHeaders });
	}

	if (!body || !isValid(body)) {
		return json({ error: "Invalid position" }, { status: 400, headers: noStoreHttpHeaders });
	}

	await setUserMapPosition(locals.user.id, {
		center: { lat: body.lat!, lng: wrapLongitude(body.lng!) },
		zoom: body.zoom!
	});

	return json({ error: null }, { headers: noStoreHttpHeaders });
}
