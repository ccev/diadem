import { featureCollection } from "@turf/turf";
import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
import { hasLoadedFeature, LoadedFeature } from "@/lib/services/initialLoad.svelte";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { goto } from "$app/navigation";
import maplibre from "maplibre-gl";
import { CoverageMapLayerId } from "@/lib/map/layers";

type CoverageMapAreaFeature = Feature<Polygon, CoverageMapAreaProperties>;
export type CoverageMapAreaProperties = {
	fillColor: string;
	strokeColor: string;
} & KojiFeature["properties"];

export const coverageMapSnapPoints = ["120px", 1];

let activeSnapPoint = $state(coverageMapSnapPoints[0]);
let clickedAreas: KojiFeature[] | undefined = $state(undefined);
let coverageMap: maplibre.Map | undefined = $state(undefined);
let invokedFromMap: boolean = $state(false);

export function coverageMapClickHandler(event: maplibre.MapMouseEvent) {
	if (event.originalEvent.defaultPrevented) return;

	const map = event.target;

	// @ts-ignore this is ok
	const areas = map.queryRenderedFeatures(event.point, {
		layers: [CoverageMapLayerId.POLYGON_FILL]
	}) as CoverageMapAreaFeature[];

	if (areas.length === 0) {
		clickedAreas = undefined;
	} else {
		clickedAreas = [...new Map(areas.map((x) => [x.properties.id, x])).values()];
	}
}

export function openCoverageMap() {
	invokedFromMap = true;
	goto("/coverage").then();
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
	return activeSnapPoint !== 1;
}

export function getClickedCoverageMapAreas() {
	return clickedAreas;
}

export function setClickedCoverageMapAreas(features: KojiFeature[]) {
	clickedAreas = features;
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

export function setCoverageMap(newMap: maplibre.Map) {
	coverageMap = newMap;
}

export function getCoverageMap() {
	return coverageMap;
}

export function getCoverageMapInvokedFromMap() {
	return invokedFromMap;
}
