import type { RequestEvent } from "@sveltejs/kit";
import { isAuthEnabled, signInWithProvider } from "@/lib/server/auth/betterAuth";
import { beginNativeFlow } from "@/lib/server/auth/nativeHandoff";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";

export async function GET(event: RequestEvent): Promise<Response> {
	if (!isAuthEnabled()) return new Response(null, { status: 404 });
	const provider = event.params.provider;
	if (
		(provider !== "discord" && provider !== "telegram") ||
		!getClientConfig().auth!.providers.includes(provider)
	)
		return new Response(null, { status: 404 });

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
	if (isNativeLogin && (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)))
		return new Response(null, { status: 400 });
	let nativeParam = "";
	if (isNativeLogin && challenge) {
		const flow = beginNativeFlow(challenge, appId);
		event.cookies.set("diadem_native_flow", flow, {
			path: "/login",
			httpOnly: true,
			sameSite: "lax",
			secure: event.url.protocol === "https:",
			maxAge: 600
		});
		nativeParam = `&native=1&flow=${flow}`;
	}

	const successCallback = `/login/${provider}/callback?redir=${encodeURIComponent(redirectPath)}${nativeParam}`;
	const errorCallback = `${successCallback}&error=1`;

	const response = await signInWithProvider(event, provider, {
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
