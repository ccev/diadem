import type { RequestEvent } from "@sveltejs/kit";

import { CLIENT_ID_PATTERN } from "@/lib/services/clientId";

const CLIENT_ID_HEADER = "X-Client-Id";

/**
 * Identifies the browser a request came from, for per-client server-side state
 * such as the filter cache.
 *
 * Not a substitute for the rate limit key, which must stay on the user id or the
 * address — this one is client-supplied and therefore trivially rotated.
 *
 * The address alone is not enough: adapter-node reports the socket peer, so
 * behind a reverse proxy every logged-out visitor looks like one client and they
 * would all contend for a single client's worth of state.
 */
export function getClientIdentity(event: RequestEvent): string {
	if (event.locals.user?.id) return "u:" + event.locals.user.id;

	const clientId = event.request.headers.get(CLIENT_ID_HEADER);
	if (clientId && CLIENT_ID_PATTERN.test(clientId)) return "c:" + clientId;

	return "a:" + event.getClientAddress();
}
