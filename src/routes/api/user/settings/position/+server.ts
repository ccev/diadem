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

function validateBody(body: PositionBody): boolean {
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

export async function POST({ locals, request }) {
	if (!locals.user) {
		return json({ error: "Not logged in", result: {} }, { headers: noStoreHttpHeaders });
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

	if (!body || !validateBody(body)) {
		return json({ error: "Invalid position" }, { status: 400, headers: noStoreHttpHeaders });
	}

	await setUserMapPosition(locals.user.id, {
		center: { lat: body.lat!, lng: body.lng! },
		zoom: body.zoom!
	});

	return json({ error: null }, { headers: noStoreHttpHeaders });
}
