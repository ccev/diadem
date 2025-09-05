/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { self } from './self';
import { updateAllMapObjects } from '../mapObjects/updateMapObject';

export function handleUpdateMapObjects() {
	self.addEventListener('message', e => {
		const data = e.data
		console.log("service worker: got data " + JSON.stringify(e.data))
		if (!data.type === "updateMapObjects") return

		updateAllMapObjects().then(() => e.source?.postMessage({ result: 'done' }))
	})
}
