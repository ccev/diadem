import { readRequestBody } from "@/lib/server/api/requestBody";
import { setUserMapPosition } from "@/lib/server/db/internal/repository";
import { allowSettingsWrite } from "@/lib/server/api/settingsRateLimit";
import { respond } from "@/lib/server/api/respond";

type PositionBody = {
	lat?: number;
	lng?: number;
	zoom?: number;
};

export async function POST({ locals, request }) {
	if (!locals.user) {
		return respond(request, { error: "Not logged in" }, { status: 401 });
	}

	if (!(await allowSettingsWrite(locals.user.id))) {
		return respond(request, { error: "Too many requests" }, { status: 429 });
	}

	let body: PositionBody;
	try {
		body = await readRequestBody(request);
	} catch {
		return respond(request, { error: "Invalid body" }, { status: 400 });
	}

	const { lat, lng, zoom } = body ?? {};
	if (
		typeof lat !== "number" ||
		typeof lng !== "number" ||
		typeof zoom !== "number" ||
		!Number.isFinite(lat) ||
		!Number.isFinite(lng) ||
		!Number.isFinite(zoom) ||
		lat < -90 ||
		lat > 90 ||
		zoom < 0 ||
		zoom > 30
	) {
		return respond(request, { error: "Invalid position" }, { status: 400 });
	}

	await setUserMapPosition(locals.user.id, {
		center: { lat, lng },
		zoom
	});

	return respond(request, { error: null });
}
