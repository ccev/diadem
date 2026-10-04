import {
	fetchInstanceMapName,
	getInstanceUrl,
	isInstanceUrlBaked,
	isNative,
	setInstanceUrl
} from "@/lib/native/runtime";
import { clearStoredToken, completeNativeLogin } from "@/lib/native/auth";

/**
 * Handle an incoming deep link URL (always the diadem:// scheme — that's the only
 * scheme the Android manifest registers):
 *  - diadem://instance?url=... — connect the generic app to a web instance.
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

	if (url.hostname === "instance") {
		if (!isNative() || isInstanceUrlBaked()) return;
		const rawInstance = url.searchParams.get("url");
		if (!rawInstance) return;
		let instance: URL;
		try {
			instance = new URL(rawInstance);
		} catch {
			return;
		}
		if (
			!["https:", "http:"].includes(instance.protocol) ||
			instance.username ||
			instance.password ||
			instance.pathname !== "/" ||
			instance.search ||
			instance.hash
		)
			return;
		if (instance.origin === getInstanceUrl()) return;
		if ((await fetchInstanceMapName(instance.origin)) === null) return;
		// Clear the previous instance's session before any request can use the new origin.
		await clearStoredToken();
		await setInstanceUrl(instance.origin);
		window.location.assign("/");
		return;
	}

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

const pendingLinks = new Set<string>();

async function handleIncomingLink(url: string): Promise<void> {
	if (pendingLinks.has(url)) return;
	pendingLinks.add(url);
	try {
		await handleDeepLink(url);
	} finally {
		pendingLinks.delete(url);
	}
}

/** Register the OS deep-link listener + handle a cold-start launch URL. No-op off native. */
export async function installDeepLinks(): Promise<void> {
	if (!isNative()) return;
	const { App } = await import("@capacitor/app");
	await App.addListener("appUrlOpen", (event) => {
		void handleIncomingLink(event.url);
	});
	// Cold start: the app may have been launched by a deep link.
	const launch = await App.getLaunchUrl();
	if (launch?.url) void handleIncomingLink(launch.url);
}
