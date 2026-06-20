import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import { completeNativeLogin } from "@/lib/native/auth";

/**
 * Handle an incoming deep link URL. Two kinds:
 *  - diadem://auth?token=... — the OAuth handoff: exchange the one-time token for
 *    a bearer session, then reload so all auth-gated data refetches authenticated.
 *  - diadem://<path> or https://<instance>/<path> — a content link (/a, /pokemon/<id>,
 *    /wayfarer, …): navigate the SPA to that route.
 */
export async function handleDeepLink(rawUrl: string): Promise<void> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return;
	}

	if (url.protocol === "diadem:") {
		if (url.hostname === "auth") {
			const token = url.searchParams.get("token");
			if (token && (await completeNativeLogin(token))) {
				// Reboot the SPA so every load()/fetch reruns with the bearer token.
				window.location.reload();
			}
			return;
		}
		// diadem://pokemon/123  ->  /pokemon/123
		await navigate(`/${url.hostname}${url.pathname}${url.search}`);
		return;
	}

	// https://<instance>/<path>  ->  /<path>
	const instance = getInstanceUrl();
	if (instance && rawUrl.startsWith(instance)) {
		await navigate(`${url.pathname}${url.search}`);
	}
}

async function navigate(path: string): Promise<void> {
	const { goto } = await import("$app/navigation");
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
