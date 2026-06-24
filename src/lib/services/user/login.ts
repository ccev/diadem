import { isNative } from "@/lib/native/runtime";
import { startNativeLogin } from "@/lib/native/auth";
import { goto } from "$app/navigation";

export function getLoginLink() {
	return "/login/discord" + "?redir=" + encodeURIComponent(window.location.pathname);
}

export async function startLogin(provider = "discord") {
	if (isNative()) {
		await startNativeLogin(provider, window.location.pathname);
		return;
	}
	goto(getLoginLink()).then();
}
