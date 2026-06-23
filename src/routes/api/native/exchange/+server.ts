import { json, type RequestEvent } from "@sveltejs/kit";
import { isAuthEnabled } from "@/lib/server/auth/betterAuth";
import { consumeNativeCode } from "@/lib/server/auth/nativeHandoff";

/**
 * Exchange a one-time native login code (from the diadem://auth deep link) plus
 * its PKCE verifier for the session token, over HTTPS. See nativeHandoff.ts.
 */
export async function POST(event: RequestEvent): Promise<Response> {
	if (!isAuthEnabled()) return new Response(null, { status: 404 });

	let body: { code?: unknown; verifier?: unknown };
	try {
		body = await event.request.json();
	} catch {
		return new Response(null, { status: 400 });
	}

	const { code, verifier } = body ?? {};
	if (typeof code !== "string" || typeof verifier !== "string" || !code || !verifier) {
		return new Response(null, { status: 400 });
	}

	const token = consumeNativeCode(code, verifier);
	if (!token) return new Response(null, { status: 400 });

	return json({ token });
}
