import { browser } from "$app/environment";
import { getConfig } from "@/lib/services/config/config";

type PushState = {
	supported: boolean;
	subscribed: boolean;
	busy: boolean;
};

const state: PushState = $state({
	supported: browser && "serviceWorker" in navigator && "PushManager" in window,
	subscribed: false,
	busy: false
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
	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return;

		const key = getConfig()?.push?.vapidPublicKey;
		if (!key) throw new Error("Push not configured on server");

		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(key)
		});
		await fetch("/api/notifications/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sub.toJSON())
		});
		state.subscribed = true;
	} finally {
		state.busy = false;
	}
}

export async function unsubscribeFromPush() {
	if (!state.supported || state.busy) return;
	state.busy = true;
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
	} finally {
		state.busy = false;
	}
}
