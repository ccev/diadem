import { upsertPushSubscription } from "@/lib/server/db/internal/repository";
import { invalidateUser } from "@/lib/server/push/registry";
import { subscriptionSchema } from "@/lib/server/push/schemas";
import { getServerConfig } from "@/lib/services/config/config.server";
import { json } from "@sveltejs/kit";

export async function POST({ locals, request }) {
	if (!getServerConfig().push?.enabled) return json({ error: "Push disabled" }, { status: 503 });
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const parsed = subscriptionSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: "Invalid subscription" }, { status: 400 });

	await upsertPushSubscription({
		userId: locals.user.id,
		endpoint: parsed.data.endpoint,
		p256dh: parsed.data.keys.p256dh,
		auth: parsed.data.keys.auth,
		userAgent: request.headers.get("user-agent")
	});
	invalidateUser(locals.user.id);
	return json({ error: null });
}
