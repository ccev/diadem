import { respond } from "@/lib/server/api/respond";
import { allowSettingsWrite } from "@/lib/server/api/settingsRateLimit";
import { canUsePersonalShiny } from "@/lib/server/api/playerIdApi";
import { removeLinkedTrainerFromPoracle } from "@/lib/server/api/poracleSync";
import { deleteTrainer, listLinkedTrainers } from "@/lib/server/db/internal/trainers";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ locals, request, params }) => {
	if (!canUsePersonalShiny(locals) || !locals.user) {
		return respond(request, { error: "not_allowed" }, { status: 403 });
	}
	const userId = locals.user.id;

	if (!(await allowSettingsWrite(userId))) {
		return respond(request, { error: "rate_limited" }, { status: 429 });
	}

	const row = (await listLinkedTrainers(userId)).find((trainer) => trainer.id === params.id);
	if (!row) return respond(request, { error: "not_found" }, { status: 404 });

	// PlayerID has no way to cancel a ticket; it is keyed by friend code and reused if relinked
	await deleteTrainer(userId, row.id);
	if (row.status === "complete" && row.playerId) {
		void removeLinkedTrainerFromPoracle(locals.user.discordId, row.playerId);
	}

	return respond(request, { error: null });
};
