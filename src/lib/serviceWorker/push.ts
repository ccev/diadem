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
				let data: {
					title?: string;
					body?: string;
					tag?: string;
					url?: string;
					icon?: string;
					image?: string;
					address?: string;
				} = {};
				try {
					data = event.data?.json() ?? {};
				} catch {
					data = { title: "Notification", body: event.data?.text() ?? "" };
				}

				// If the app is open and focused, render the nicer in-app toast and
				// skip the OS notification (avoids a redundant duplicate).
				const clients = await self.clients.matchAll({
					type: "window",
					includeUncontrolled: true
				});
				const hasVisible = clients.some((client) => client.visibilityState === "visible");
				if (hasVisible) {
					for (const client of clients) {
						client.postMessage({ type: "push-notification", payload: data });
					}
					return;
				}

				try {
					const body = data.address
						? `${data.body ?? ""}\n📍 ${data.address}`.trim()
						: data.body;
					// `image` (big picture) is widely supported but missing from the
					// webworker lib's NotificationOptions, so attach it via a cast.
					const options: NotificationOptions & { image?: string } = {
						body,
						tag: data.tag,
						icon: data.icon,
						image: data.image,
						data: { url: data.url }
					};
					await self.registration.showNotification(data.title ?? "Notification", options);
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
