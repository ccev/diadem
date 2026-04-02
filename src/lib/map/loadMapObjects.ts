import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { AGGRESSIVE_UPDATE_TIME } from "@/lib/constants";

export let loadMapObjectInterval: undefined | NodeJS.Timeout;
let isLoadMapObjectsRunning: boolean = false;

async function runLoadMapObjects() {
	if (isLoadMapObjectsRunning) return;
	try {
		isLoadMapObjectsRunning = true;
		await updateAllMapObjects(false);
	} catch (e) {
	} finally {
		isLoadMapObjectsRunning = false;
	}
}

export function resetLoadMapObjects() {
	if (getUserSettings().loadMapObjectsWhileMoving) {
		loadMapObjectInterval = setInterval(runLoadMapObjects, AGGRESSIVE_UPDATE_TIME);
	}
}

export function clearLoadMapObjectsInterval() {
	if (loadMapObjectInterval !== undefined) clearInterval(loadMapObjectInterval);
}
