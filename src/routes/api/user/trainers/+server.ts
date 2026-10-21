import { readRequestBody } from "@/lib/server/api/requestBody";
import { respond } from "@/lib/server/api/respond";
import { allowSettingsWrite } from "@/lib/server/api/settingsRateLimit";
import {
	canUsePersonalShiny,
	createPlayerIdLink,
	getPlayerIdLink,
	normalizeFriendCode
} from "@/lib/server/api/playerIdApi";
import {
	addLinkedTrainerToPoracle,
	resyncLinkedTrainersToPoracle
} from "@/lib/server/api/poracleSync";
import type { LinkedTrainer } from "@/lib/server/db/internal/schema";
import {
	deleteTrainer,
	insertPendingTrainer,
	listLinkedTrainers,
	updateTrainer
} from "@/lib/server/db/internal/trainers";
import { isLinkPending } from "@/lib/features/linkedTrainerStatus";
import { getServerConfig } from "@/lib/services/config/config.server";
import type { LinkedTrainerInfo } from "@/lib/services/linkedTrainers.svelte";
import type { RequestHandler } from "./$types";

const DEFAULT_MAX_TRAINERS = 10;

function toInfo(row: LinkedTrainer): LinkedTrainerInfo {
	return { id: row.id, status: row.status, trainerName: row.trainerName ?? undefined };
}

// Advances a pending link by asking PlayerID for its ticket. Returns the row as it now stands,
// or undefined when it was dropped because the same player is already linked.
async function refreshPending(
	userId: string,
	row: LinkedTrainer,
	linkedPlayers: Set<string>
): Promise<LinkedTrainer | undefined> {
	if (!row.jobId || !isLinkPending(row.status)) return row;

	const result = await getPlayerIdLink(row.jobId);
	if (!result.ok) {
		if (result.error !== "not_found") return row;
		await updateTrainer(userId, row.id, { status: "expired", jobId: null });
		return { ...row, status: "expired", jobId: null };
	}

	const { link } = result;
	if (link.status === "complete" && link.playerId) {
		if (linkedPlayers.has(link.playerId)) {
			await deleteTrainer(userId, row.id);
			return undefined;
		}
		linkedPlayers.add(link.playerId);
		const values = {
			status: "complete",
			jobId: null,
			playerId: link.playerId,
			trainerName: link.trainerName ?? null
		};
		await updateTrainer(userId, row.id, values);
		return { ...row, ...values };
	}
	if (!isLinkPending(link.status)) {
		await updateTrainer(userId, row.id, { status: link.status, jobId: null });
		return { ...row, status: link.status, jobId: null };
	}
	if (link.status !== row.status) {
		await updateTrainer(userId, row.id, { status: link.status });
		return { ...row, status: link.status };
	}
	return row;
}

export const GET: RequestHandler = async ({ locals, request }) => {
	if (!canUsePersonalShiny(locals) || !locals.user) {
		return respond(request, { error: "Not allowed", result: [] }, { status: 403 });
	}
	const userId = locals.user.id;

	const rows = await listLinkedTrainers(userId);
	const linkedPlayers = new Set(rows.flatMap((row) => (row.playerId ? [row.playerId] : [])));
	const refreshed = await Promise.all(
		rows.map((row) => refreshPending(userId, row, linkedPlayers))
	);

	// Optional Poracle sync, in the background: newly linked trainers are added right away, and
	// the rest are checked now and then in case Poracle is missing any
	const discordId = locals.user.discordId;
	const linked = refreshed.flatMap((row) =>
		row?.status === "complete" && row.playerId
			? [{ id: row.id, playerId: row.playerId, trainerName: row.trainerName }]
			: []
	);
	const wasLinked = new Set(rows.filter((row) => row.status === "complete").map((row) => row.id));
	for (const trainer of linked) {
		if (!wasLinked.has(trainer.id)) void addLinkedTrainerToPoracle(discordId, trainer);
	}
	void resyncLinkedTrainersToPoracle(discordId, linked);

	return respond(request, {
		error: null,
		result: refreshed.flatMap((row) => (row ? [toInfo(row)] : []))
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!canUsePersonalShiny(locals) || !locals.user) {
		return respond(request, { error: "not_allowed" }, { status: 403 });
	}
	const userId = locals.user.id;

	if (!(await allowSettingsWrite(userId))) {
		return respond(request, { error: "rate_limited" }, { status: 429 });
	}

	let body: { friendCode?: unknown };
	try {
		body = await readRequestBody(request);
	} catch {
		return respond(request, { error: "invalid_body" }, { status: 400 });
	}
	const friendCode = normalizeFriendCode(body?.friendCode);
	if (!friendCode) {
		return respond(request, { error: "invalid_friend_code" }, { status: 400 });
	}

	const rows = await listLinkedTrainers(userId);
	const maxTrainers = getServerConfig().playerId?.maxTrainers ?? DEFAULT_MAX_TRAINERS;
	if (
		rows.filter((row) => isLinkPending(row.status) || row.status === "complete").length >=
		maxTrainers
	) {
		return respond(request, { error: "too_many_trainers" }, { status: 400 });
	}

	const result = await createPlayerIdLink(friendCode);
	if (!result.ok) {
		return respond(request, { error: result.error }, { status: result.status });
	}

	// A code looked up before can come back already finished. It is stored as pending anyway,
	// so the next GET fills in the player through refreshPending (from the ticket cache)
	const status = isLinkPending(result.link.status) ? result.link.status : "queued";
	const id = await insertPendingTrainer(userId, result.link.id, status);
	return respond(
		request,
		{ error: null, result: { id, status } as LinkedTrainerInfo },
		{ status: 202 }
	);
};
