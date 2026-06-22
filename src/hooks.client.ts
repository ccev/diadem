import type { ClientInit } from "@sveltejs/kit";
import { installNativeFetch } from "@/lib/native/nativeFetch";
import { installNativeUi } from "@/lib/native/nativeUi";
import { loadStoredToken } from "@/lib/native/auth";
import { isNative, loadInstanceUrl } from "@/lib/native/runtime";
import { installDeepLinks } from "@/lib/native/deepLinks";

export const init: ClientInit = async () => {
	// native setup hooks, runs on initial load
	if (isNative()) {
		await loadInstanceUrl();
		await loadStoredToken();
		installNativeFetch();
		installNativeUi();
		await installDeepLinks();
	}
};
