import { browser } from "$app/environment";
import { getConfig } from "@/lib/services/config/config";

type PushState = {
	supported: boolean;
	subscribed: boolean;
	busy: boolean;
	error: string | null;
};

const state: PushState = $state({
	supported: browser && "serviceWorker" in navigator && "PushManager" in window,
	subscribed: false,
	busy: false,
	error: null
});

export function getPushState() {
	return state;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
	return output;
}

export async function refreshPushState() {
	if (!state.supported) return;
	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	state.subscribed = !!sub;
}

export async function subscribeToPush() {
	if (!state.supported || state.busy) return;
	state.busy = true;
	state.error = null;
	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") {
			state.error = `Notification permission ${permission}.`;
			return;
		}

		const key = getConfig()?.push?.vapidPublicKey;
		if (!key) throw new Error("Push not configured on server");

		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(key)
		});
		const res = await fetch("/api/notifications/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sub.toJSON())
		});
		// Only consider ourselves subscribed if the server stored it. Otherwise
		// the browser would be subscribed with no server record (pushes never arrive).
		if (!res.ok) {
			await sub.unsubscribe().catch(() => {});
			throw new Error(`Server rejected subscription (${res.status}).`);
		}
		state.subscribed = true;
	} catch (err) {
		state.error = err instanceof Error ? err.message : "Failed to enable push.";
	} finally {
		state.busy = false;
	}
}

export async function unsubscribeFromPush() {
	if (!state.supported || state.busy) return;
	state.busy = true;
	state.error = null;
	try {
		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.getSubscription();
		if (sub) {
			await fetch("/api/notifications/unsubscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ endpoint: sub.endpoint })
			});
			await sub.unsubscribe();
		}
		state.subscribed = false;
	} catch (err) {
		state.error = err instanceof Error ? err.message : "Failed to disable push.";
	} finally {
		state.busy = false;
	}
}
