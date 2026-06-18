import { deletePushSubscriptionByEndpoint } from "@/lib/server/db/internal/repository";
import { invalidateUser } from "@/lib/server/push/registry";
import { unsubscribeSchema } from "@/lib/server/push/schemas";
import { json } from "@sveltejs/kit";

export async function POST({ locals, request }) {
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const parsed = unsubscribeSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });

	await deletePushSubscriptionByEndpoint(locals.user.id, parsed.data.endpoint);
	invalidateUser(locals.user.id);
	return json({ error: null });
}
