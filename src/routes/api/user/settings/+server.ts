import { getUserSettings, setUserSettings } from "@/lib/server/db/internal/repository";
import { noStoreHttpHeaders } from "@/lib/utils/apiUtils.server";
import { json } from "@sveltejs/kit";

export async function POST({ locals, request }) {
	if (!locals.user) return json({ error: "Not logged in" }, { headers: noStoreHttpHeaders });
	await setUserSettings(locals.user.id, await request.json());
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
