import type { RequestEvent } from "@sveltejs/kit";
import {
	getAuthBaseUrl,
	isAuthFeatureEnabled,
	signInWithDiscord
} from "@/lib/server/auth/betterAuth";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";

const SCOPES = ["identify", "guilds.members.read"];

function sanitizeRedirectPath(redirectPath: string | null, fallback: string) {
	if (!redirectPath) return fallback;
	if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) return fallback;
	return redirectPath;
}

export async function GET(event: RequestEvent): Promise<Response> {
	if (!isAuthFeatureEnabled()) return new Response(null, { status: 404 });

	const redirectPath = sanitizeRedirectPath(
		event.url.searchParams.get("redir"),
		getMapPath(getClientConfig())
	);

	const callbackBaseUrl = getAuthBaseUrl()!;
	const successCallbackURL = new URL("/login/discord/callback", callbackBaseUrl);
	successCallbackURL.searchParams.set("redir", redirectPath);

	const errorCallbackURL = new URL("/login/discord/callback", callbackBaseUrl);
	errorCallbackURL.searchParams.set("redir", redirectPath);
	errorCallbackURL.searchParams.set("error", "1");

	const response = await signInWithDiscord(event, {
		callbackURL: successCallbackURL.toString(),
		errorCallbackURL: errorCallbackURL.toString(),
		scopes: SCOPES
	});

	if (!response?.url) {
		return new Response(null, { status: 500 });
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: response.url
		}
	});
}
