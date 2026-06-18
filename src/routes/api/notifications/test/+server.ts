import { dispatchTest } from "@/lib/server/push/dispatch";
import { getServerConfig } from "@/lib/services/config/config.server";
import { json } from "@sveltejs/kit";

export async function POST({ locals }) {
	if (!getServerConfig().push?.enabled) return json({ error: "Push disabled" }, { status: 503 });
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const sent = await dispatchTest(locals.user.id);
	return json({ error: null, sent });
}
