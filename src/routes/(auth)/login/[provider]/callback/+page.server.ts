import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";
import { getNativeAuthToken, isAuthRequired } from "@/lib/server/auth/betterAuth";
import { consumeNativeFlow, issueNativeCode } from "@/lib/server/auth/nativeHandoff";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { getServerLogger } from "@/lib/server/logging";

const log = getServerLogger("auth");

/**
 * Build the deep-link return URL. When the app id is known, use an Android
 * intent:// URL targeting that package so the browser launches the app directly
 * (no "open in app?" disambiguation prompt); otherwise the plain diadem:// scheme.
 */
function nativeReturnUrl(suffix: string, appId: string | null): string {
	if (appId && /^[a-zA-Z0-9._]+$/.test(appId)) {
		return `intent://${suffix}#Intent;scheme=diadem;package=${appId};end`;
	}
	return `diadem://${suffix}`;
}

export const load: PageServerLoad = async (event) => {
	const redirectLink = sanitizeRedirectPath(
		event.url.searchParams.get("redir"),
		isAuthRequired() ? "/" : getMapPath(getClientConfig())
	);

	// Native login: hand the freshly-established session to the app via a one-time
	// CODE on the diadem:// deep link (never the token itself). The app exchanges
	// the code + its PKCE verifier for the token over HTTPS — see nativeHandoff.ts.
	const nativeCookie = event.cookies.get("diadem_native_flow");
	const earlyError = event.params.provider === "error";
	if (event.url.searchParams.get("native") === "1" || (earlyError && nativeCookie)) {
		const flow = consumeNativeFlow(
			earlyError ? nativeCookie! : event.url.searchParams.get("flow"),
			nativeCookie
		);
		event.cookies.delete("diadem_native_flow", { path: "/login" });
		const appId = flow?.appId ?? null;
		if (event.locals.user && flow && !earlyError && !event.url.searchParams.has("error")) {
			const token = getNativeAuthToken(event);
			if (token) {
				const code = issueNativeCode(token, flow.challenge);
				const params = new URLSearchParams({ code, redir: redirectLink });
				throw redirect(302, nativeReturnUrl(`auth?${params.toString()}`, appId));
			}
		}
		log.info("Native login failed before token handoff");
		throw redirect(302, nativeReturnUrl("auth?error=1", appId));
	}

	const response: { error: string | undefined; redir: string; name: string } = {
		error: undefined,
		redir: redirectLink,
		name: ""
	};

	if (event.locals.user && !earlyError && !event.url.searchParams.has("error")) {
		response.name = event.locals.user.name || "";
		return response;
	}

	const reason =
		event.url.searchParams.get("error") === "1" ? "error=1 url parameter" : "no event.locals.user";
	log.info(`Provider login failed: ${reason}`);
	response.error = "Provider login failed";
	return response;
};
