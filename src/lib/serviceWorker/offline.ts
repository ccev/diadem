/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { self } from "./self";

/** Removes caches created by the previous broad offline worker, then retires itself. */
export function removeOfflineCache() {
	self.addEventListener("install", (event) => {
		self.skipWaiting();
		event.waitUntil(Promise.resolve());
	});

	self.addEventListener("activate", (event) => {
		event.waitUntil(
			(async () => {
				await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
				await self.clients.claim();
				await self.registration.unregister();
			})()
		);
	});
}
