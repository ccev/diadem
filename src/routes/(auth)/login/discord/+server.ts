import type { RequestEvent } from "@sveltejs/kit";
import { isAuthEnabled, signInWithDiscord } from "@/lib/server/auth/betterAuth";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";

export async function GET(event: RequestEvent): Promise<Response> {
	if (!isAuthEnabled()) return new Response(null, { status: 404 });

	const redirectPath = sanitizeRedirectPath(
		event.url.searchParams.get("redir"),
		getMapPath(getClientConfig())
	);

	// Native (Capacitor) logins finish by handing the session to the app via a
	// deep link instead of rendering the web callback page.
	const isNativeLogin = event.url.searchParams.get("native") === "1";
	const appId = event.url.searchParams.get("app");
	// PKCE challenge: bound to the one-time handoff code so only the app that
	// started the login (and holds the verifier) can exchange the code.
	const challenge = isNativeLogin ? event.url.searchParams.get("challenge") : null;
	const nativeParam = isNativeLogin ? "&native=1" : "";
	const appParam = isNativeLogin && appId ? `&app=${encodeURIComponent(appId)}` : "";
	const challengeParam = challenge ? `&challenge=${encodeURIComponent(challenge)}` : "";

	const successCallback = `/login/discord/callback?redir=${encodeURIComponent(redirectPath)}${nativeParam}${appParam}${challengeParam}`;
	const errorCallback = `${successCallback}&error=1`;

	const response = await signInWithDiscord(event, {
		callbackURL: successCallback,
		errorCallbackURL: errorCallback
	});

	if (!response?.url) {
		return new Response(null, { status: 500 });
	}

	return new Response(null, {
		status: 302,
		headers: { Location: response.url }
	});
}
