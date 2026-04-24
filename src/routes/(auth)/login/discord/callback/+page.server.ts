import type { PageServerLoad } from "./$types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";
import { isAuthRequiredEnabled } from "@/lib/server/auth/betterAuth";

function sanitizeRedirectPath(redirectPath: string | null | undefined, fallback: string) {
	if (!redirectPath) return fallback;
	if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) return fallback;
	return redirectPath;
}

export const load: PageServerLoad = async (event) => {
	const redirectLink = sanitizeRedirectPath(
		event.url.searchParams.get("redir"),
		isAuthRequiredEnabled() ? "/" : getMapPath(getClientConfig())
	);

	const response: { error: string | undefined; redir: string; name: string } = {
		error: undefined,
		redir: redirectLink,
		name: ""
	};

	if (event.url.searchParams.get("error") === "1") {
		response.error = "Discord Login failed";
		return response;
	}

	if (!event.locals.user || !event.locals.authUser) {
		response.error = "Discord Login failed";
		return response;
	}

	response.name = event.locals.authUser.name || event.locals.authUser.email || "";
	return response;
};
