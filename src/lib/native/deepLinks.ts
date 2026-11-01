import { isNative } from "@/lib/native/runtime";
import { completeNativeLogin } from "@/lib/native/auth";

let resolveNavigationReady: (hasConfig: boolean) => void;
const navigationReady = new Promise<boolean>((resolve) => {
	resolveNavigationReady = resolve;
});

/** Called by the root layout once the router and instance configuration exist. */
export function markNativeNavigationReady(hasConfig: boolean): void {
	resolveNavigationReady(hasConfig);
}

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
		// Android keeps the original launch URL across a WebView reload. Do not
		// exchange a consumed handoff again when the authenticated app boots.
		try {
			if (sessionStorage.getItem("diadem_last_auth_link") === rawUrl) return;
		} catch {
			/* session storage may be unavailable */
		}
		// Dismiss the originating browser now, so a slow exchange cannot later
		// close a browser opened for a newer login attempt.
		try {
			const { Browser } = await import("@capacitor/browser");
			await Browser.close();
		} catch {
			/* browser may already be closed */
		}
		const code = url.searchParams.get("code");
		if (code && (await completeNativeLogin(code))) {
			try {
				sessionStorage.setItem("diadem_last_auth_link", rawUrl);
			} catch {
				/* best effort */
			}
			// Reboot the SPA so every load()/fetch reruns with the bearer token.
			const redir = url.searchParams.get("redir");
			const local = new URL(window.location.href);
			const target = new URL(redir || "/", local);
			if (
				redir?.startsWith("/") &&
				target.protocol === local.protocol &&
				target.host === local.host
			) {
				window.location.replace(`${target.pathname}${target.search}${target.hash}`);
			} else {
				window.location.reload();
			}
		} else {
			const { openToast } = await import("@/lib/ui/toasts.svelte");
			const { m } = await import("@/lib/paraglide/messages");
			openToast(m.signin_toast_error(), 10000);
		}
		return;
	}

	// diadem://pokemon/123  ->  /pokemon/123
	await routeDeepLink(`/${url.hostname}${url.pathname}${url.search}${url.hash}`);
}

async function routeDeepLink(path: string): Promise<void> {
	// hooks.client installs the listener before the initial route/config load.
	// Authentication can complete immediately, but content needs the mounted app.
	if (!(await navigationReady)) return;
	const segments = path.split(/[?#]/, 1)[0].split("/").filter(Boolean);
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

let installed = false;
const inFlight = new Set<string>();

async function dispatchDeepLink(url: string): Promise<void> {
	if (inFlight.has(url)) return;
	inFlight.add(url);
	try {
		await handleDeepLink(url);
	} catch (error) {
		console.error("Failed to open app link", error);
	} finally {
		inFlight.delete(url);
	}
}

/** Register the OS deep-link listener + handle a cold-start launch URL. No-op off native. */
export async function installDeepLinks(): Promise<void> {
	if (!isNative() || installed) return;
	const { App } = await import("@capacitor/app");
	await App.addListener("appUrlOpen", (event) => {
		void dispatchDeepLink(event.url);
	});
	installed = true;
	// Cold start: the app may have been launched by a deep link.
	const launch = await App.getLaunchUrl();
	if (launch?.url) {
		void dispatchDeepLink(launch.url);
	}
}
