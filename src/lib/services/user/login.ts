import { isNative } from "@/lib/native/runtime";
import { startNativeLogin } from "@/lib/native/auth";
import { goto } from "$app/navigation";
import { getConfig } from "@/lib/services/config/config";
import { defaultAuthProviders } from "@/lib/services/config/authProviders";
import type { AuthProvider } from "@/lib/services/config/configTypes";
import { openModal, closeModal } from "@/lib/ui/modal.svelte";

export function getLoginLink(provider: AuthProvider) {
	return `/login/${provider}?redir=${encodeURIComponent(window.location.pathname)}`;
}

export async function startLogin(provider?: AuthProvider) {
	const providers = getConfig().auth?.providers ?? defaultAuthProviders;
	if (!provider && providers.length > 1) {
		openModal("authProvider");
		return;
	}
	provider ??= providers[0];
	if (!providers.includes(provider)) return;
	closeModal("authProvider");
	if (isNative()) {
		await startNativeLogin(provider, window.location.pathname);
		return;
	}
	await goto(getLoginLink(provider));
}
