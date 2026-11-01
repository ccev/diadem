import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { isAuthEnabled } from "@/lib/server/auth/betterAuth";
import { issueNativeCode } from "@/lib/server/auth/nativeHandoff";
import { consumeNativeLoginAttempt, nativeReturnUrl } from "@/lib/server/auth/nativeLogin";

export const ssr = true;
export const prerender = false;

export const load: PageServerLoad = async (event) => {
	if (!isAuthEnabled()) error(404);

	event.setHeaders({
		"Cache-Control": "no-store",
		"Referrer-Policy": "no-referrer",
		"Content-Security-Policy": "base-uri 'none'; frame-ancestors 'none'",
		"X-Content-Type-Options": "nosniff"
	});

	const appId = event.url.searchParams.get("app");
	const challenge = event.url.searchParams.get("challenge") ?? "";
	const redir = sanitizeRedirectPath(event.url.searchParams.get("redir"), "/");
	const validAttempt = consumeNativeLoginAttempt(event, { challenge, appId, redir });
	const success = Boolean(
		validAttempt &&
		!event.url.searchParams.has("error") &&
		event.locals.user &&
		event.locals.session?.token &&
		/^[\w-]{43}$/.test(challenge)
	);
	const params = new URLSearchParams({ error: "1" });
	if (success) {
		params.delete("error");
		params.set("code", await issueNativeCode(event.locals.session!.token, challenge));
		params.set("redir", redir);
	}

	return { success, returnUrl: nativeReturnUrl(`auth?${params}`, appId) };
};
