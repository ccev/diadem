import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

// Optional: copies the player ids of linked trainers to the user's Poracle account
// (PoracleNG's /api/v2/humans/{id}/accounts), so personal shiny alerts work without linking the
// same trainers again in Poracle. Enabled by [server.poracle] syncLinkedTrainers. Every call is
// best effort: failures are logged and never affect linking in Diadem.

const log = getLogger("poracle");

const TIMEOUT_MS = 10_000;
// How long Poracle's /health answer (whether it supports linked accounts) is trusted
const CAPABILITY_TTL_MS = 5 * 60_000;
// Linked trainers that Poracle is missing are added at most this often per user
const RESYNC_MS = 60 * 60_000;
const MAX_LABEL_LENGTH = 64;
// Poracle's rule for player ids
const PLAYER_ID = /^[A-Za-z0-9]{1,256}$/;

export type PoracleTrainer = { playerId: string; trainerName?: string | null };

let capability: { at: number; supported: boolean } | undefined;
const lastResync = new Map<string, number>();

function getSettings() {
	const poracle = getServerConfig().poracle;
	if (!poracle?.syncLinkedTrainers || !poracle.url) return undefined;
	return poracle;
}

export function isPoracleSyncEnabled() {
	return Boolean(getSettings());
}

async function callPoracle(
	path: string,
	method: "GET" | "POST" | "DELETE",
	body?: unknown
): Promise<Response | undefined> {
	const poracle = getSettings();
	if (!poracle) return undefined;

	const headers: HeadersInit = { Accept: "application/json" };
	if (poracle.secret) headers["X-Poracle-Secret"] = poracle.secret;
	if (body !== undefined) headers["Content-Type"] = "application/json";

	try {
		return await fetch(new URL(path, poracle.url), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (err) {
		log.warning("[%s %s] Poracle request failed: %s", method, path, err);
		return undefined;
	}
}

/** Only PoracleNG with personal shiny support has the accounts API. */
async function supportsAccounts() {
	if (capability && Date.now() - capability.at < CAPABILITY_TTL_MS) return capability.supported;

	const response = await callPoracle("/health", "GET");
	const health = response?.ok ? await response.json().catch(() => undefined) : undefined;
	const supported = health?.capabilities?.personalShiny === true;
	if (capability?.supported !== supported) {
		if (supported) log.info("Syncing linked trainers to Poracle");
		else log.warning("Poracle doesn't support linked accounts; linked trainers aren't synced");
	}
	capability = { at: Date.now(), supported };
	return supported;
}

function accountsPath(discordId: string) {
	return `/api/v2/humans/${encodeURIComponent(discordId)}/accounts`;
}

/** Trainer names make readable Poracle labels; Poracle allows up to 64 characters. */
export function poracleLabel(trainerName?: string | null) {
	const label = trainerName?.trim().slice(0, MAX_LABEL_LENGTH);
	return label || undefined;
}

async function addAccount(discordId: string, trainer: PoracleTrainer) {
	if (!PLAYER_ID.test(trainer.playerId)) return;

	const label = poracleLabel(trainer.trainerName);
	let response = await callPoracle(accountsPath(discordId), "POST", {
		player_id: trainer.playerId,
		...(label ? { label } : {})
	});
	if (response?.status === 409 && label) {
		const detail = await response.text();
		// The player id is already linked, which is what we wanted
		if (!/label/i.test(detail)) return;
		// The label is taken by another of the user's accounts, so link it without one
		response = await callPoracle(accountsPath(discordId), "POST", { player_id: trainer.playerId });
	}

	if (!response || response.ok || response.status === 409) return;
	if (response.status === 404) {
		log.debug("User %s isn't registered in Poracle; trainer not synced", discordId);
		return;
	}
	log.warning(
		"Adding a linked trainer for %s to Poracle returned %d: %s",
		discordId,
		response.status,
		await response.text()
	);
}

/** Adds a newly linked trainer to the user's Poracle accounts. Never throws. */
export async function addLinkedTrainerToPoracle(discordId: string, trainer: PoracleTrainer) {
	try {
		if (!isPoracleSyncEnabled() || !(await supportsAccounts())) return;
		await addAccount(discordId, trainer);
	} catch (err) {
		log.error("Syncing a linked trainer to Poracle failed: %s", err);
	}
}

/** Removes an unlinked trainer from the user's Poracle accounts. Never throws. */
export async function removeLinkedTrainerFromPoracle(discordId: string, playerId: string) {
	try {
		if (!isPoracleSyncEnabled() || !PLAYER_ID.test(playerId) || !(await supportsAccounts())) {
			return;
		}
		const response = await callPoracle(
			`${accountsPath(discordId)}/${encodeURIComponent(playerId)}`,
			"DELETE"
		);
		// 404: not linked in Poracle (or the user isn't registered there), nothing to remove
		if (!response || response.ok || response.status === 404) return;
		log.warning(
			"Removing a linked trainer for %s from Poracle returned %d: %s",
			discordId,
			response.status,
			await response.text()
		);
	} catch (err) {
		log.error("Removing a linked trainer from Poracle failed: %s", err);
	}
}

/**
 * Adds any of the user's linked trainers that Poracle is missing, at most once an hour per user.
 * Covers trainers linked before syncing was enabled. Accounts added in Poracle directly are kept.
 * Never throws.
 */
export async function resyncLinkedTrainersToPoracle(discordId: string, trainers: PoracleTrainer[]) {
	try {
		if (!isPoracleSyncEnabled() || trainers.length === 0) return;
		const last = lastResync.get(discordId);
		if (last && Date.now() - last < RESYNC_MS) return;
		lastResync.set(discordId, Date.now());
		if (!(await supportsAccounts())) return;

		const response = await callPoracle(accountsPath(discordId), "GET");
		if (!response?.ok) return;
		const body = (await response.json()) as { accounts?: { player_id: string }[] };
		const linked = new Set((body.accounts ?? []).map((account) => account.player_id));
		for (const trainer of trainers) {
			if (!linked.has(trainer.playerId)) await addAccount(discordId, trainer);
		}
	} catch (err) {
		log.error("Resyncing linked trainers to Poracle failed: %s", err);
	}
}

/** For tests: forget the cached Poracle capability and resync times. */
export function resetPoracleSyncState() {
	capability = undefined;
	lastResync.clear();
}
