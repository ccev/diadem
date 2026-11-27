import type { ClientInit } from "@sveltejs/kit";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { installNativeFetch } from "@/lib/native/nativeFetch";
import { installNativeUi } from "@/lib/native/nativeUi";
import { loadStoredToken } from "@/lib/native/auth";
import { isNative, loadInstanceUrl } from "@/lib/native/runtime";
import { installDeepLinks } from "@/lib/native/deepLinks";
import { getLocale } from "@/lib/paraglide/runtime";

maplibregl.setWorkerUrl(workerUrl);

export const init: ClientInit = async () => {
	// SSR labels the preview; the app itself follows the user's language preference.
	document.documentElement.lang = getLocale();

	// native setup hooks, runs on initial load
	if (isNative()) {
		await loadInstanceUrl();
		await loadStoredToken();
		installNativeFetch();
		installNativeUi();
		await installDeepLinks();
	}
};
