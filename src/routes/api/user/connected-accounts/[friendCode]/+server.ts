import { deleteConnectedAccount } from "@/lib/server/db/internal/repository";
import { error, json } from "@sveltejs/kit";

export async function DELETE({ locals, params }) {
	if (!locals.user) error(401, "Authentication is required");
	const friendCode = params.friendCode.replaceAll(/\D/g, "");
	if (!/^\d{12}$/.test(friendCode)) error(400, "Friend code must contain 12 digits");
	await deleteConnectedAccount(locals.user.id, friendCode);
	return json({ error: null });
}
