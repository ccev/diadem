import { getUserSettings, setUserSettings } from "@/lib/server/db/internal/repository";
import { readRequestBody } from "@/lib/server/api/requestBody";
import { allowSettingsWrite } from "@/lib/server/api/settingsRateLimit";
import { respond } from "@/lib/server/api/respond";

export async function POST({ locals, request }) {
	if (!locals.user) {
		return respond(request, { error: "Not logged in" }, { status: 401 });
	}

	if (!(await allowSettingsWrite(locals.user.id))) {
		return respond(request, { error: "Too many requests" }, { status: 429 });
	}

	let settings: unknown;
	try {
		settings = await readRequestBody(request);
	} catch {
		return respond(request, { error: "Invalid body" }, { status: 400 });
	}
	if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
		return respond(request, { error: "Invalid body" }, { status: 400 });
	}

	await setUserSettings(locals.user.id, settings);
	return respond(request, { error: null });
}

export async function GET({ locals, request }) {
	if (!locals.user) {
		return respond(request, { error: "Not logged in", result: {} }, { status: 401 });
	}

	const userSettings = await getUserSettings(locals.user.id);

	if (!userSettings) return respond(request, { error: "No data", result: {} });

	return respond(request, {
		result: typeof userSettings === "string" ? JSON.parse(userSettings) : userSettings
	});
}
