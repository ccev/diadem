import { getServerConfig } from "@/lib/services/config/config.server";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("playerid");

// A pending ticket is read from the service at most this often, however often clients poll.
// Known trainers are found within seconds, so a ticket is read more often while it's new
const FAST_RECHECK_MS = 5_000;
const FAST_RECHECK_FOR_MS = 60_000;
const RECHECK_MS = 60_000;
// When the service answers 429 without Retry-After, nothing is sent for this long
const DEFAULT_BACKOFF_MS = 60_000;

/**
 * Link status as stored by Diadem. PlayerID's own statuses are kept, except `done`,
 * which becomes `complete`.
 */
export type PlayerIdLinkStatus =
	| "queued"
	| "pending"
	| "delayed"
	| "complete"
	| "invalid_code"
	| "failed"
	| "expired"
	| (string & {});

export type PlayerIdLink = {
	id: string;
	status: PlayerIdLinkStatus;
	playerId?: string;
	trainerName?: string;
};

export type PlayerIdResult =
	| { ok: true; link: PlayerIdLink }
	| { ok: false; status: number; error: "queue_full" | "not_found" | "unavailable" };

type Ticket = {
	id: string | number;
	status: string;
	player_id?: string | null;
	name?: string | null;
};

const ticketCache = new Map<string, { at: number; firstSeen: number; link: PlayerIdLink }>();

/** How long a ticket's last answer is reused, by how long ago Diadem first saw the ticket. */
export function recheckIntervalMs(sinceFirstSeenMs: number) {
	return sinceFirstSeenMs < FAST_RECHECK_FOR_MS ? FAST_RECHECK_MS : RECHECK_MS;
}
let backoffUntil = 0;

export function isPlayerIdEnabled() {
	const playerId = getServerConfig().playerId;
	return Boolean(playerId?.url && playerId?.apiKey);
}

/** Logged in, PlayerID configured, and granted personal shinies somewhere. */
export function canUsePersonalShiny(locals: App.Locals) {
	return (
		Boolean(locals.user) &&
		isPlayerIdEnabled() &&
		hasFeatureAnywhere(locals.perms, Features.POKEMON_PERSONAL_SHINY)
	);
}

function toLink(ticket: Ticket): PlayerIdLink {
	return {
		id: String(ticket.id),
		status: ticket.status === "done" ? "complete" : ticket.status,
		playerId: ticket.player_id ?? undefined,
		trainerName: ticket.name ?? undefined
	};
}

async function callPlayerId(
	path: string,
	method: "GET" | "POST",
	body?: unknown
): Promise<PlayerIdResult> {
	const playerId = getServerConfig().playerId;
	if (!playerId?.url || !playerId.apiKey) return { ok: false, status: 503, error: "unavailable" };
	if (Date.now() < backoffUntil) return { ok: false, status: 429, error: "queue_full" };

	const headers: HeadersInit = {
		Authorization: `Bearer ${playerId.apiKey}`,
		Accept: "application/json"
	};
	if (body !== undefined) headers["Content-Type"] = "application/json";

	let response: Response;
	try {
		response = await fetch(new URL(path, playerId.url), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(10_000)
		});
	} catch (err) {
		log.error("[%s %s] PlayerID request failed: %s", method, path, err);
		return { ok: false, status: 503, error: "unavailable" };
	}

	if (response.status === 429) {
		// Limits are per API key, so one user hitting them pauses lookups for everyone
		const retryAfter = Number(response.headers.get("Retry-After"));
		backoffUntil = Date.now() + (retryAfter > 0 ? retryAfter * 1000 : DEFAULT_BACKOFF_MS);
		log.warning("[%s %s] PlayerID rate limit hit, pausing lookups", method, path);
		return { ok: false, status: 429, error: "queue_full" };
	}
	if (response.status === 404) return { ok: false, status: 404, error: "not_found" };
	if (!response.ok) {
		log.error(
			"[%s %s] PlayerID returned %d: %s",
			method,
			path,
			response.status,
			await response.text()
		);
		return { ok: false, status: 502, error: "unavailable" };
	}

	const json = (await response.json()) as { data?: Ticket };
	if (!json.data) return { ok: false, status: 502, error: "unavailable" };
	const link = toLink(json.data);
	if (ticketCache.size > 1000) {
		for (const [id, entry] of ticketCache)
			if (Date.now() - entry.at >= RECHECK_MS) ticketCache.delete(id);
	}
	const firstSeen = ticketCache.get(link.id)?.firstSeen ?? Date.now();
	ticketCache.set(link.id, { at: Date.now(), firstSeen, link });
	return { ok: true, link };
}

/**
 * Asks for the player id behind a friend code. Tickets are keyed by the code, so a code
 * that was looked up before (by anyone on this map) is answered from its existing ticket
 * without using up the daily ticket quota, and an ended one goes back in the queue.
 */
export function createPlayerIdLink(friendCode: string) {
	return callPlayerId("/api/v1/tickets", "POST", {
		friend_code: friendCode,
		unique_id: `fc-${friendCode}`
	});
}

export async function getPlayerIdLink(ticketId: string): Promise<PlayerIdResult> {
	const cached = ticketCache.get(ticketId);
	if (cached && Date.now() - cached.at < recheckIntervalMs(Date.now() - cached.firstSeen)) {
		return { ok: true, link: cached.link };
	}
	return callPlayerId(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, "GET");
}

/** Friend codes are 12 digits; spaces and dashes are allowed in input. */
export function normalizeFriendCode(input: unknown): string | undefined {
	if (typeof input !== "string") return undefined;
	const digits = input.replace(/[\s-]/g, "");
	return /^\d{12}$/.test(digits) ? digits : undefined;
}
