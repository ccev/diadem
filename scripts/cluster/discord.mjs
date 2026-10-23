import { TTLCache } from "@isaacs/ttlcache";
import { createHash, randomUUID } from "node:crypto";

/** @typedef {{ roles?: string[], user?: { id: string } }} GuildMember */
/** @typedef {{ status: number, data?: GuildMember, retryAfter?: number }} GuildResult */

const requestType = "diadem:discord-guild:request";
const responseType = "diadem:discord-guild:response";
/** @type {TTLCache<string, GuildResult>} */
const cache = new TTLCache({ max: 10_000, ttl: 30_000, checkAgeOnGet: true });
/** @type {Map<string, Promise<GuildResult>>} */
const inFlight = new Map();
/** @type {Map<string, (result: GuildResult) => void>} */
const pending = new Map();

/** @param {string} guildId @param {string} accessToken @returns {Promise<GuildResult>} */
async function lookup(guildId, accessToken) {
	// Do not retain bearer tokens as cache keys.
	const tokenHash = createHash("sha256").update(accessToken).digest("hex");
	const key = `${tokenHash}:${guildId}`;
	const cached = cache.get(key);
	if (cached) return cached;
	const cooldown = cache.get(tokenHash);
	if (cooldown)
		return {
			...cooldown,
			retryAfter: Math.max(1, Math.ceil(cache.getRemainingTTL(tokenHash) / 1000))
		};
	const active = inFlight.get(key);
	if (active) return active;

	const request = (async () => {
		/** @type {GuildResult} */
		let result;
		try {
			const response = await fetch(
				`https://discord.com/api/users/@me/guilds/${encodeURIComponent(guildId)}/member`,
				{
					headers: { Authorization: `Bearer ${accessToken}` },
					signal: AbortSignal.timeout(10_000)
				}
			);
			if (response.status === 404) {
				result = { status: 404, data: { roles: [] } };
			} else if (response.ok) {
				/** @type {{ user?: { id?: unknown }, roles?: unknown }} */
				const data = await response.json();
				if (
					typeof data?.user?.id !== "string" ||
					!Array.isArray(data.roles) ||
					!data.roles.every((role) => typeof role === "string")
				)
					throw new Error("Invalid Discord guild member response");
				result = { status: 200, data: { user: { id: data.user.id }, roles: data.roles } };
			} else {
				let retryAfter = 5;
				if (response.status === 429) {
					const body = await response.json().catch(() => null);
					const delay = Number(body?.retry_after ?? response.headers.get("Retry-After"));
					if (Number.isFinite(delay) && delay > 0) retryAfter = Math.ceil(delay);
				}
				result = { status: response.status, retryAfter };
			}
		} catch {
			result = { status: 503, retryAfter: 5 };
		}
		if (result.status === 429) {
			// Concurrent requests to different guilds must not shorten an existing cooldown.
			result.retryAfter = Math.max(
				result.retryAfter ?? 5,
				Math.ceil(cache.getRemainingTTL(tokenHash) / 1000)
			);
		}
		cache.set(result.status === 429 ? tokenHash : key, result, {
			ttl: result.retryAfter ? result.retryAfter * 1000 : 30_000
		});
		return result;
	})().finally(() => inFlight.delete(key));
	inFlight.set(key, request);
	return request;
}

/** Install the shared lookup service before forking any workers. @param {import("node:cluster").Cluster} cluster */
export function serveDiscordGuildLookups(cluster) {
	cluster.on("message", (worker, message) => {
		if (
			message?.type !== requestType ||
			typeof message.id !== "string" ||
			typeof message.guildId !== "string" ||
			typeof message.accessToken !== "string"
		)
			return;
		void lookup(message.guildId, message.accessToken).then((result) => {
			if (worker.isConnected()) {
				// A worker can exit between the connection check and send.
				worker.send({ type: responseType, id: message.id, result }, () => {});
			}
		});
	});
}

if (process.env.DIADEM_CLUSTER_DISCORD === "1" && process.send) {
	process.on("message", (message) => {
		if (!message || typeof message !== "object") return;
		const reply = /** @type {{ type?: string, id?: string, result?: GuildResult }} */ (message);
		if (reply.type === responseType && reply.id && reply.result)
			pending.get(reply.id)?.(reply.result);
	});
	process.once("disconnect", () => {
		for (const finish of pending.values()) finish({ status: 503, retryAfter: 5 });
	});
}

/** Shared across cluster workers, or local in single-process mode. @param {string} guildId @param {string} accessToken @returns {Promise<GuildResult>} */
export function getDiscordGuildMember(guildId, accessToken) {
	if (process.env.DIADEM_CLUSTER_DISCORD !== "1") return lookup(guildId, accessToken);
	const send = process.send?.bind(process);
	if (!send || !process.connected) return Promise.resolve({ status: 503, retryAfter: 5 });

	return new Promise((resolve) => {
		const id = randomUUID();
		/** @param {GuildResult} result */
		const finish = (result) => {
			clearTimeout(timeout);
			pending.delete(id);
			resolve(result);
		};
		const timeout = setTimeout(() => finish({ status: 503, retryAfter: 5 }), 15_000).unref();
		pending.set(id, finish);
		send({ type: requestType, id, guildId, accessToken }, (error) => {
			if (error) finish({ status: 503, retryAfter: 5 });
		});
	});
}
