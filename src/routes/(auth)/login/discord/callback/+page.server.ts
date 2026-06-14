import type { PageServerLoad } from "./$types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";
import { isAuthRequiredEnabled } from "@/lib/server/auth/betterAuth";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("callback-discord");

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
		log.info("Discord Login failed with error=1 url parameter");
		response.error = "Discord Login failed";
		return response;
	}

	if (!event.locals.user) {
		log.info("Discord Login failed: no event.locals.user");
		response.error = "Discord Login failed";
		return response;
	}

	response.name = event.locals.user.name || "";
	return response;
};
