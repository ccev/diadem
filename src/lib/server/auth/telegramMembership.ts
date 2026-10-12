import { TTLCache } from "@isaacs/ttlcache";

export function isTelegramMember(result: unknown): boolean {
	if (!result || typeof result !== "object" || !("status" in result)) return false;
	switch (result.status) {
		case "creator":
		case "administrator":
		case "member":
			return true;
		case "restricted":
			return "is_member" in result && result.is_member === true;
		default:
			return false;
	}
}

// One bounded cache/queue per process. Never serve stale positives on error.
export function createTelegramMembershipLookup(botToken: string, thisFetch: typeof fetch = fetch) {
	const cache = new TTLCache<string, boolean>({ ttl: 60000, max: 10000, checkAgeOnGet: true });
	const inFlight = new Map<string, Promise<boolean>>();
	let windowStart = 0;
	let requests = 0;
	let retryAfter = 0;
	return async (chatId: string, userId: string): Promise<boolean> => {
		if (!botToken || !/^-?[1-9]\d*$/.test(chatId) || !/^[1-9]\d*$/.test(userId)) return false;
		const key = `${chatId}:${userId}`;
		const cached = cache.get(key);
		if (cached !== undefined) return cached;
		const pending = inFlight.get(key);
		if (pending) return pending;
		const now = Date.now();
		if (now - windowStart >= 1000) {
			windowStart = now;
			requests = 0;
		}
		if (now < retryAfter || requests >= 20 || inFlight.size >= 20) return false;
		requests++;
		const lookup = (async () => {
			let member = false;
			try {
				const response = await thisFetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ chat_id: chatId, user_id: Number(userId) }),
					signal: AbortSignal.timeout(5000)
				});
				const data = await response.json();
				if (response.status === 429) {
					const seconds = Number(data?.parameters?.retry_after);
					retryAfter = Date.now() + Math.min(300, Math.max(1, seconds || 30)) * 1000;
				}
				member =
					response.ok &&
					data?.ok === true &&
					String(data.result?.user?.id) === userId &&
					isTelegramMember(data.result);
			} catch {
				/* Fail closed without logging the token-bearing URL. */
			}
			cache.set(key, member);
			return member;
		})().finally(() => inFlight.delete(key));
		inFlight.set(key, lookup);
		return lookup;
	};
}
