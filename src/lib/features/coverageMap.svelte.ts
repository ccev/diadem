import { closeMenu, Menu, openMenu, setJustChangedMenus } from "@/lib/ui/menus.svelte";
import { deleteAllFeatures, updateFeatures } from "@/lib/map/render/featuresGen.svelte.js";
import { clearAllMapObjects, getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
import type { MapObjectIconProperties } from "@/lib/map/render/featureBuilders";
import { featureCollection } from "@turf/turf";
import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte";
import type { Feature as GeojsonFeature, FeatureCollection, Point, Polygon } from "geojson";
import { pushState } from "$app/navigation";
import { getMapPath } from "@/lib/utils/getMapPath";
import { getConfig } from "@/lib/services/config/config";

export type CoverageMapAreaProperties = {
	fillColor: string;
	strokeColor: string;
} & KojiFeature["properties"];

export const coverageMapSnapPoints = ["120px", 1];

let isCoverageMapActive = $state(false);
let activeSnapPoint = $state(coverageMapSnapPoints[0]);
let clickedAreas: KojiFeature[] | undefined = $state(undefined);

export function getIsCoverageMapActive() {
	return isCoverageMapActive;
}

export function openCoverageMap(onRoot: boolean = false) {
	let link = getMapPath(getConfig(), "/coverage");
	if (onRoot) link = "/coverage";

	pushState(link, {});
	isCoverageMapActive = true;
	setJustChangedMenus();
	openMenu(Menu.COVERAGE_MAP);
	deleteAllFeatures();
	clearAllMapObjects();
	updateFeatures(getMapObjects());
}

export function closeCoverageMap() {
	isCoverageMapActive = false;
	closeMenu();
}

export function getCoverageMapAreas(): FeatureCollection<Polygon, CoverageMapAreaProperties> {
	if (hasLoadedFeature(LoadedFeature.KOJI)) {
		const styles = getComputedStyle(document.documentElement);
		const fillColor = styles.getPropertyValue("--coverage-polygon-stroke");
		const strokeColor = styles.getPropertyValue("--coverage-polygon-fill");
		return featureCollection(
			getKojiGeofences().map((g, i) => {
				return {
					...g,
					id: "koji-" + g.properties.id,
					properties: {
						...g.properties,
						fillColor,
						strokeColor
					}
				};
			})
		);
	}

	return featureCollection([]);
}

export function showCoverageMapTitle() {
	return isCoverageMapActive && activeSnapPoint !== 1;
}

export function setClickedCoverageMapAreas(areas: KojiFeature[] | undefined) {
	clickedAreas = areas;
}

export function getClickedCoverageMapAreas() {
	return clickedAreas;
}

export const coverageMapActiveSnapPoint = {
	get value() {
		return activeSnapPoint;
	},

	set value(newValue: string | number) {
		activeSnapPoint = newValue;
	},

	reset() {
		activeSnapPoint = coverageMapSnapPoints[0];
	}
};
