import { closeMenu, Menu, openMenu, setJustChangedMenus } from "@/lib/ui/menus.svelte";
import { deleteAllFeatures, updateFeatures } from "@/lib/map/featuresGen.svelte";
import { clearAllMapObjects, getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import { featureCollection } from "@turf/turf";
import { getKojiGeofences } from "@/lib/features/koji";
import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte";

export const coverageMapSnapPoints = ["120px", 1];

let isCoverageMapActive = $state(false);
let activeSnapPoint = $state(coverageMapSnapPoints[0])

export function getIsCoverageMapActive() {
	return isCoverageMapActive;
}

export function openCoverageMap() {
	isCoverageMapActive = true;
	setJustChangedMenus()
	openMenu(Menu.COVERAGE_MAP);
	deleteAllFeatures();
	clearAllMapObjects();
	updateFeatures(getMapObjects());
}

export function closeCoverageMap() {
	isCoverageMapActive = false;
	closeMenu();
}

export function getCoverageMapAreas() {
	if (hasLoadedFeature(LoadedFeature.KOJI)) {
		return featureCollection(
			getKojiGeofences().map((g, i) => {
				return {
					...g,
					id: "koji-" + i,
					properties: {
						id: "koji-" + i,
						fillColor: "rgba(255, 0, 0, 20%)",
						strokeColor: "rgba(255, 0, 0, 20%)"
					}
				};
			})
		);
	}

	return featureCollection([])
}

export function showCoverageMapTitle() {
	return isCoverageMapActive && activeSnapPoint !== 1
}

export const coverageMapActiveSnapPoint = {
	get value() {
		return activeSnapPoint
	},

	set value(newValue: string | number) {
		activeSnapPoint = newValue
	},

	reset() {
		activeSnapPoint = coverageMapSnapPoints[0]
	}
}

