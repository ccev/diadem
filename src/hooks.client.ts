import type { ClientInit } from "@sveltejs/kit";
import { installNativeFetch } from "@/lib/native/nativeFetch";
import { installNativeUi } from "@/lib/native/nativeUi";
import { loadStoredToken } from "@/lib/native/auth";
import { installDeepLinks } from "@/lib/native/deepLinks";

// Runs once, before any +layout.ts/+page.ts load function — so the very first
// fetch("/api/config") in the root layout is already redirected (and, if logged
// in, bearer-authenticated) on native.
export const init: ClientInit = async () => {
	await loadStoredToken();
	installNativeFetch();
	installNativeUi();
	await installDeepLinks();
};
