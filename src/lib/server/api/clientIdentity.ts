import type { RequestEvent } from "@sveltejs/kit";

import { CLIENT_ID_PATTERN } from "@/lib/services/clientId";

const CLIENT_ID_HEADER = "X-Client-Id";

/**
 * Key for per-client server-side state. Adapter-node reports the socket peer,
 * so the address alone is useless behind a reverse proxy (every logged-out
 * visitor shares one); prefer user id, then client header, then address.
 */
export function getClientIdentity(event: RequestEvent): string {
	if (event.locals.user?.id) return "u:" + event.locals.user.id;

	const clientId = event.request.headers.get(CLIENT_ID_HEADER);
	if (clientId && CLIENT_ID_PATTERN.test(clientId)) return "c:" + clientId;

	return "a:" + event.getClientAddress();
}
