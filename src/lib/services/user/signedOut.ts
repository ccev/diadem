import { goto } from "$app/navigation";
import { SESSION_ENDED_HEADER } from "@/lib/constants";
import { clearStoredToken } from "@/lib/native/auth";
import { isNative } from "@/lib/native/runtime";
import { clearMap } from "@/lib/mapObjects/updateMapObject";
import * as m from "@/lib/paraglide/messages";
import { getConfig } from "@/lib/services/config/config";
import { isSupportedFeature, updateSupportedFeatures } from "@/lib/services/supportedFeatures";
import { getLoginLink, startLogin } from "@/lib/services/user/login";
import { getUserDetails, updateUserDetails } from "@/lib/services/user/userDetails.svelte";
import { openToast } from "@/lib/ui/toasts.svelte";

/**
 * Resets the app to the signed-out state, once the session is gone on the server.
 * redirect: false keeps the current view (the login screen shows if auth is required).
 */
export async function applySignedOut(redirect = true) {
	clearMap();
	await Promise.all([updateSupportedFeatures(), updateUserDetails()]);

	// Only redirect after logout when the app requires auth to keep using the current view.
	if (redirect && isSupportedFeature("authRequired")) {
		if (getConfig().general.customHome) {
			await goto("/");
		} else if (isNative()) {
			// /login/discord is a server route the static app can't navigate to;
			// start the native (system-browser) login flow instead.
			await startLogin();
		} else {
			await goto(getLoginLink());
		}
	}
}

let isApplying = false;

/**
 * Watches responses for the session-ended header, so a session closed elsewhere
 * (e.g. by the session limit) signs this app out without a reload.
 */
export function watchSessionEnded() {
	const originalFetch = window.fetch;
	window.fetch = async (...args) => {
		const response = await originalFetch(...args);
		if (response.headers.get(SESSION_ENDED_HEADER) && getUserDetails().details && !isApplying) {
			isApplying = true;
			// Never start a login here: Discord would sign in again without asking, and the
			// new session would close the other one, looping between them.
			(isNative() ? clearStoredToken() : Promise.resolve())
				.then(() => applySignedOut(false))
				.then(() => {
					// still signed in = another tab signed in meanwhile, nothing was lost
					if (!getUserDetails().details) openToast(m.session_ended_toast(), 10000);
				})
				.finally(() => (isApplying = false));
		}
		return response;
	};
}
