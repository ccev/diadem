/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { self } from "./self";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
	return output;
}

export function setupPushHandlers(): void {
	self.addEventListener("push", (event) => {
		event.waitUntil(
			(async () => {
				let data: { title?: string; body?: string; tag?: string; url?: string, icon?: string } = {};
				try {
					data = event.data?.json() ?? {};
				} catch {
					data = { title: "Notification", body: event.data?.text() ?? "" };
				}

				try {
					await self.registration.showNotification(data.title ?? "Notification", {
						body: data.body,
						tag: data.tag,
						icon: data.icon,
						data: { url: data.url }
					});
					console.info("Push notification shown", data);
				} catch (err) {
					console.error("Push notification failed", err, data);
				}
			})()
		);
	});

	self.addEventListener("notificationclick", (event) => {
		event.notification.close();
		const url: string = event.notification.data?.url || "/";
		event.waitUntil(
			(async () => {
				const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
				for (const client of all) {
					if ("focus" in client) {
						await client.focus();
						if ("navigate" in client && url) await (client as WindowClient).navigate(url);
						return;
					}
				}
				await self.clients.openWindow(url);
			})()
		);
	});

	self.addEventListener("pushsubscriptionchange", ((event: ExtendableEvent) => {
		event.waitUntil(
			(async () => {
				const res = await fetch("/api/config");
				const config = await res.json();
				const key: string | undefined = config?.push?.vapidPublicKey;
				if (!key) return;
				const subscription = await self.registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(key)
				});
				await fetch("/api/notifications/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(subscription.toJSON())
				});
			})()
		);
	}) as EventListener);
}
