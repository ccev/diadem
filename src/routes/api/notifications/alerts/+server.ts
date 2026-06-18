import { getPushAlerts, setPushAlerts } from "@/lib/server/db/internal/repository";
import { invalidateUser } from "@/lib/server/push/registry";
import { pushAlertRulesSchema } from "@/lib/server/push/schemas";
import { emptyPushAlertRules } from "@/lib/server/push/types";
import { json } from "@sveltejs/kit";

export async function GET({ locals }) {
	if (!locals.user)
		return json({ error: "Not logged in", result: emptyPushAlertRules() }, { status: 401 });
	return json({ error: null, result: await getPushAlerts(locals.user.id) });
}

export async function PUT({ locals, request }) {
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const parsed = pushAlertRulesSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: "Invalid rules" }, { status: 400 });

	await setPushAlerts(locals.user.id, parsed.data);
	invalidateUser(locals.user.id);
	return json({ error: null });
}
