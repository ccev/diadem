import { isNative } from "@/lib/native/runtime";
import { completeNativeLogin } from "@/lib/native/auth";

/**
 * Handle an incoming deep link URL (always the diadem:// scheme — that's the only
 * scheme the Android manifest registers). Two kinds:
 *  - diadem://auth?code=... — the OAuth handoff: exchange the one-time code for a
 *    bearer session, then reload so all auth-gated data refetches authenticated.
 *  - diadem://<path> — a content link (/a, /pokemon/<id>, /wayfarer, …): navigate
 *    the SPA to that route.
 *
 * (Plain https://<instance>/<path> links are NOT handled: delivering them to the
 * app would require verified Android App Links, which aren't configured.)
 */
export async function handleDeepLink(rawUrl: string): Promise<void> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return;
	}

	if (url.protocol !== "diadem:") return;

	if (url.hostname === "auth") {
		const code = url.searchParams.get("code");
		if (code && (await completeNativeLogin(code))) {
			// Reboot the SPA so every load()/fetch reruns with the bearer token.
			window.location.reload();
		}
		return;
	}

	// diadem://pokemon/123  ->  /pokemon/123
	await routeDeepLink(`/${url.hostname}${url.pathname}`);
}

async function routeDeepLink(path: string): Promise<void> {
	const segments = path.split("/").filter(Boolean);
	const { goto } = await import("$app/navigation");

	// Direct map-object link (/pokemon/123, /gym/abc, …): the web route is SSR-only,
	// so on native we drive the client loader directly instead of navigating to it.
	if (segments.length === 2) {
		const [type, id] = segments;
		const { allMapObjectTypes } = await import("@/lib/mapObjects/mapObjectTypes");
		if ((allMapObjectTypes as readonly string[]).includes(type)) {
			const { getConfig } = await import("@/lib/services/config/config");
			const { getMapPath } = await import("@/lib/utils/getMapPath");
			const { openMapObjectFromId } = await import("@/lib/features/directLinks.svelte");
			await goto(getMapPath(getConfig()));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await openMapObjectFromId(type as any, id);
			return;
		}
	}

	// Client-side routes (e.g. /wayfarer, /coverage) navigate directly.
	await goto(path);
}

let lastHandled = "";

/** Register the OS deep-link listener + handle a cold-start launch URL. No-op off native. */
export async function installDeepLinks(): Promise<void> {
	if (!isNative()) return;
	const { App } = await import("@capacitor/app");
	await App.addListener("appUrlOpen", (event) => {
		if (event.url === lastHandled) return;
		lastHandled = event.url;
		void handleDeepLink(event.url);
	});
	// Cold start: the app may have been launched by a deep link.
	const launch = await App.getLaunchUrl();
	if (launch?.url && launch.url !== lastHandled) {
		lastHandled = launch.url;
		void handleDeepLink(launch.url);
	}
}
