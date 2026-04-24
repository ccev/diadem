import type { RequestEvent } from "@sveltejs/kit";
import { isAuthFeatureEnabled, signOut as signOutFromAuth } from "@/lib/server/auth/betterAuth";
import { getServerLogger } from "@/lib/server/logging";

const authLogger = getServerLogger("auth");

async function handleSignOut(event: RequestEvent) {
	if (!isAuthFeatureEnabled()) return new Response(null, { status: 404 });

	const didSignOut = await signOutFromAuth(event);
	if (!didSignOut) {
		authLogger.error("Better Auth sign-out failed", {
			path: event.url.pathname
		});
		return new Response(null, { status: 500 });
	}

	return new Response(null, { status: 204 });
}

export async function POST(event: RequestEvent): Promise<Response> {
	return handleSignOut(event);
}
