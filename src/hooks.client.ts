import type { ClientInit } from "@sveltejs/kit";
import { installNativeFetch } from "@/lib/native/nativeFetch";
import { installNativeUi } from "@/lib/native/nativeUi";

// Runs once, before any +layout.ts/+page.ts load function — so the very first
// fetch("/api/config") in the root layout is already redirected on native.
export const init: ClientInit = () => {
	installNativeFetch();
	installNativeUi();
};
