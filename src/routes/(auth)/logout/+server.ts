import type { RequestEvent } from "@sveltejs/kit";
import { isAuthEnabled, signOut } from "@/lib/server/auth/betterAuth";
import { getServerLogger } from "@/lib/server/logging";

const log = getServerLogger("auth");

export async function POST(event: RequestEvent): Promise<Response> {
	if (!isAuthEnabled()) return new Response(null, { status: 404 });

	const didSignOut = await signOut(event);
	if (!didSignOut) {
		log.error("Better Auth sign-out failed", { path: event.url.pathname });
		return new Response(null, { status: 500 });
	}

	return new Response(null, { status: 204 });
}
