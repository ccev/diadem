import type { ClientInit } from "@sveltejs/kit";
import { installNativeFetch } from "@/lib/native/nativeFetch";
import { installNativeUi } from "@/lib/native/nativeUi";
import { loadStoredToken } from "@/lib/native/auth";
import { loadInstanceUrl } from "@/lib/native/runtime";
import { installDeepLinks } from "@/lib/native/deepLinks";

// Runs once, before any +layout.ts/+page.ts load function — so the very first
// fetch("/api/config") in the root layout already resolves to the configured
// instance and (if logged in) is bearer-authenticated, on native.
export const init: ClientInit = async () => {
	await loadInstanceUrl();
	await loadStoredToken();
	installNativeFetch();
	installNativeUi();
	await installDeepLinks();
};
