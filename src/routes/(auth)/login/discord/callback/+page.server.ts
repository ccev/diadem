import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";
import { getNativeAuthToken, isAuthRequired } from "@/lib/server/auth/betterAuth";
import { issueNativeCode } from "@/lib/server/auth/nativeHandoff";
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
	if (event.url.searchParams.get("native") === "1") {
		const appId = event.url.searchParams.get("app");
		const challenge = event.url.searchParams.get("challenge");
		if (event.locals.user && challenge) {
			const token = getNativeAuthToken(event);
			if (token) {
				const code = issueNativeCode(token, challenge);
				const params = new URLSearchParams({ code, redir: redirectLink });
				throw redirect(302, nativeReturnUrl(`auth?${params.toString()}`, appId));
			}
		}
		log.info("Native Discord login failed before token handoff");
		throw redirect(302, nativeReturnUrl("auth?error=1", appId));
	}

	const response: { error: string | undefined; redir: string; name: string } = {
		error: undefined,
		redir: redirectLink,
		name: ""
	};

	if (event.locals.user) {
		response.name = event.locals.user.name || "";
		return response;
	}

	const reason =
		event.url.searchParams.get("error") === "1" ? "error=1 url parameter" : "no event.locals.user";
	log.info(`Discord Login failed: ${reason}`);
	response.error = "Discord Login failed";
	return response;
};
