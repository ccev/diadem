import { isNative } from "@/lib/native/runtime";
import { startNativeLogin } from "@/lib/native/auth";

export function getLoginLink() {
	return "/login/discord" + "?redir=" + encodeURIComponent(window.location.pathname);
}

/**
 * Begin login. On native this opens the instance's OAuth flow in the system
 * browser (finishing via the diadem:// deep-link handoff); on web it navigates
 * to the server login route as before.
 */
export async function startLogin(provider = "discord") {
	if (isNative()) {
		await startNativeLogin(provider, window.location.pathname);
		return;
	}
	window.location.href = getLoginLink();
}
