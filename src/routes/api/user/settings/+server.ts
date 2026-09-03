import { getUserSettings, setUserSettings } from "@/lib/server/db/internal/repository";
import { readRequestBody } from "@/lib/server/api/requestBody";
import { allowSettingsWrite } from "@/lib/server/api/settingsRateLimit";
import { noStoreHttpHeaders } from "@/lib/utils/apiUtils.server";
import { json } from "@sveltejs/kit";

const MAX_SETTINGS_BYTES = 512 * 1024;

export async function POST({ locals, request }) {
	if (!locals.user) {
		return json({ error: "Not logged in", result: {} }, { headers: noStoreHttpHeaders });
	}

	if (!(await allowSettingsWrite(locals.user.id))) {
		return json({ error: "Too many requests" }, { status: 429, headers: noStoreHttpHeaders });
	}

	let settings: unknown;
	try {
		// keepNulls: this is stored verbatim, so a null is the user's data.
		settings = await readRequestBody(request, { keepNulls: true, maxBytes: MAX_SETTINGS_BYTES });
	} catch {
		return json({ error: "Invalid body" }, { status: 400, headers: noStoreHttpHeaders });
	}
	if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
		return json({ error: "Invalid body" }, { status: 400, headers: noStoreHttpHeaders });
	}

	await setUserSettings(locals.user.id, settings as never);
	return json({ error: null }, { headers: noStoreHttpHeaders });
}

export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: "Not logged in", result: {} }, { headers: noStoreHttpHeaders });
	}

	const userSettings = await getUserSettings(locals.user.id);

	if (!userSettings) return json({ error: "No data", result: {} }, { headers: noStoreHttpHeaders });

	return json({ result: JSON.parse(userSettings) }, { headers: noStoreHttpHeaders });
}
