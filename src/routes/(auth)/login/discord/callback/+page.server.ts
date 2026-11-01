import type { PageServerLoad } from "./$types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";
import { isAuthRequired } from "@/lib/server/auth/betterAuth";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { getServerLogger } from "@/lib/server/logging";

const log = getServerLogger("auth");

export const load: PageServerLoad = async (event) => {
	const redirectLink = sanitizeRedirectPath(
		event.url.searchParams.get("redir"),
		isAuthRequired() ? "/" : getMapPath(getClientConfig())
	);

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
