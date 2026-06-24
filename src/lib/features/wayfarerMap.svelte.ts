import { goto } from "$app/navigation";
import { L14_HIGHLIGHT, WayfarerLayerId } from "@/lib/map/layers";
import { featureCollection } from "@turf/turf";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import maplibre from "maplibre-gl";
import { geojson, s2 } from "s2js";
import { closeMenu, setJustChangedMenus } from "@/lib/ui/menus.svelte";
import { getCoveringS2Cells } from "@/lib/mapObjects/s2cells";
import type { MapStyle } from "@/lib/services/config/configTypes";
import { getMapStyle } from "@/lib/utils/mapStyle";

const MAX_S2_CELLS = 5000;
export const WAYFARER_CELLS_14_MIN_ZOOM = 10;
export const WAYFARER_CELLS_17_MIN_ZOOM = 14.5;
export const WAYFARER_FORTS_MIN_ZOOM = 12.5;
export const WAYFARER_LABELS_MIN_ZOOM = 11.3;

export type FortData = {
	id: string;
	lat: number;
	lon: number;
	name?: string;
	url?: string;
	description?: string;
	type: "p" | "g";
	partner_id?: string;
	sponsor_id?: number;
	updated: number;
	first_seen_timestamp: number;
};

const FETCH_CACHE_TTL_MS = 30_000;

let forts: FortData[] = $state([]);
let pokestopCounts: Record<string, number> = $state({});
let gymCounts: Record<string, number> = $state({});
let lastFetchKey: string = "";
let lastFetchAt = 0;
let activeFetchController: AbortController | undefined;
let activeFetchId = 0;
let clickedFort: FortData | undefined = $state(undefined);
let clickedL14Cell:
	| { cellId: string; center: [number, number]; fortCount: number; gymCount: number }
	| undefined = $state(undefined);
let invokedFromMap: boolean = $state(false);
let style: MapStyle | undefined = $state(undefined);

export function getWayfarerStyle() {
	return style ? getMapStyle(style) : undefined;
}

export function getWayfarerStyleId() {
	return style?.id;
}

export function setWayfarerStyle(newStyle: MapStyle) {
	style = newStyle;
}

export function getClickedFort() {
	return clickedFort;
}

export function getClickedL14Cell() {
	return clickedL14Cell;
}

export function setClickedFort(fort: FortData | undefined) {
	clickedFort = fort;
	clickedL14Cell = undefined;
}

export function setClickedL14Cell(
	cell:
		| { cellId: string; center: [number, number]; fortCount: number; gymCount: number }
		| undefined
) {
	clickedL14Cell = cell;
	clickedFort = undefined;
}

export function clearClicked() {
	clickedFort = undefined;
	clickedL14Cell = undefined;
}

function buildFetchKey(cellIds: string[], countsOnly: boolean): string {
	const prefix = countsOnly ? "c:" : "f:";
	if (cellIds.length === 0) return prefix;
	let min = cellIds[0];
	let max = cellIds[0];
	for (let i = 1; i < cellIds.length; i++) {
		const id = cellIds[i];
		if (id < min) min = id;
		else if (id > max) max = id;
	}
	return prefix + cellIds.length + ":" + min + ":" + max;
}

export function resetWayfarerFetchCache() {
	lastFetchKey = "";
	lastFetchAt = 0;
}

export async function fetchWayfarerForts(
	cellIds: string[],
	countsOnly: boolean,
	force: boolean = false
) {
	const key = buildFetchKey(cellIds, countsOnly);
	const now = Date.now();
	const cacheValid = key === lastFetchKey && now - lastFetchAt < FETCH_CACHE_TTL_MS;
	if (cacheValid && !force) return;

	activeFetchController?.abort();
	const controller = new AbortController();
	activeFetchController = controller;
	const fetchId = ++activeFetchId;

	try {
		const response = await fetch("/api/wayfarer/forts", {
			body: JSON.stringify({ cellIds, countsOnly }),
			method: "POST",
			signal: controller.signal
		});
		if (fetchId !== activeFetchId) return;
		if (!response.ok) return;
		const data = (await response.json()) as {
			pokestopCounts: Record<string, number>;
			gymCounts: Record<string, number>;
			forts: FortData[];
		};
		if (fetchId !== activeFetchId) return;
		pokestopCounts = data.pokestopCounts ?? {};
		gymCounts = data.gymCounts ?? {};
		forts = data.forts ?? [];
		lastFetchKey = key;
		lastFetchAt = now;
	} catch (e) {
		if ((e as Error).name === "AbortError") return;
		console.error(
			`Failed to fetch wayfarer forts: ${(e as Error)?.name}: ${(e as Error)?.message}`,
			e
		);
	}
}

export type WayfarerColors = {
	// L14 cells
	l14Stroke: string;
	l14StrokeRed: string;
	l14StrokeAmber: string;
	l14StrokeGreen: string;
	l14FillRed: string;
	l14FillAmber: string;
	l14FillGreen: string;
	// L17 cells
	l17Stroke: string;
	l17Fill: string;
	// Forts
	fortPokestop: string;
	fortPokestopStroke: string;
	fortSponsored: string;
	fortSponsoredStroke: string;
	fortGym: string;
	fortGymStroke: string;
	// Labels
	labelText: string;
};

export function getWayfarerColors(): WayfarerColors {
	const s = getComputedStyle(document.documentElement);
	return {
		l14Stroke: s.getPropertyValue("--wayfarer-l14-stroke"),
		l14StrokeRed: s.getPropertyValue("--wayfarer-l14-stroke-red"),
		l14StrokeAmber: s.getPropertyValue("--wayfarer-l14-stroke-amber"),
		l14StrokeGreen: s.getPropertyValue("--wayfarer-l14-stroke-green"),
		l14FillRed: s.getPropertyValue("--wayfarer-l14-fill-red"),
		l14FillAmber: s.getPropertyValue("--wayfarer-l14-fill-amber"),
		l14FillGreen: s.getPropertyValue("--wayfarer-l14-fill-green"),
		l17Stroke: s.getPropertyValue("--wayfarer-l17-stroke"),
		l17Fill: s.getPropertyValue("--wayfarer-l17-fill"),
		fortPokestop: s.getPropertyValue("--wayfarer-fort-pokestop"),
		fortPokestopStroke: s.getPropertyValue("--wayfarer-fort-pokestop-stroke"),
		fortSponsored: s.getPropertyValue("--wayfarer-fort-sponsored"),
		fortSponsoredStroke: s.getPropertyValue("--wayfarer-fort-sponsored-stroke"),
		fortGym: s.getPropertyValue("--wayfarer-fort-gym"),
		fortGymStroke: s.getPropertyValue("--wayfarer-fort-gym-stroke"),
		labelText: s.getPropertyValue("--wayfarer-label-text")
	};
}

export const WAYFARER_DIAMOND_WHITE_ID = "wayfarer-diamond-white";
export const WAYFARER_DIAMOND_PINK_ID = "wayfarer-diamond-pink";

export function generateFortGeoJSON(): FeatureCollection<Point, FortPointProperties> {
	const c = getWayfarerColors();
	return featureCollection(
		forts.map((fort) => {
			const isSponsored = !!(fort.partner_id || fort.sponsor_id);
			return {
				type: "Feature",
				geometry: { type: "Point", coordinates: [fort.lon, fort.lat] },
				properties: {
					id: fort.type + "-" + fort.id,
					fortType: fort.type,
					isSponsored,
					circleColor: isSponsored ? c.fortSponsored : c.fortPokestop,
					circleStrokeColor: isSponsored ? c.fortSponsoredStroke : c.fortPokestopStroke,
					iconImage: isSponsored ? WAYFARER_DIAMOND_PINK_ID : WAYFARER_DIAMOND_WHITE_ID,
					fortName: fort.name ?? "",
					fortId: fort.id,
					fortDescription: fort.description ?? "",
					fortUpdated: fort.updated,
					fortFirstSeen: fort.first_seen_timestamp,
					fortPartnerId: fort.partner_id,
					fortSponsorId: fort.sponsor_id
				}
			};
		})
	);
}

export type FortPointProperties = {
	id: string;
	fortType: "p" | "g";
	isSponsored: boolean;
	circleColor: string;
	circleStrokeColor: string;
	iconImage: string;
	fortName: string;
	fortId: string;
	fortDescription: string;
	fortUpdated: number;
	fortFirstSeen: number;
	fortPartnerId?: string;
	fortSponsorId?: number;
};

type S2CellPolygonProperties = {
	id: string;
	strokeColor: string;
	fillColor: string;
	l14Highlight: "" | "red" | "amber" | "green";
	cellId: string;
	fortCount: number;
};

type L14LabelProperties = {
	id: string;
	label: string;
	cellId: string;
	fortCount: number;
	labelText: string;
	labelHalo: string;
};

export function generateWayfarerData(
	bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
	zoom: number
): {
	cells14: FeatureCollection<Polygon, S2CellPolygonProperties>;
	cells17: FeatureCollection<Polygon, S2CellPolygonProperties>;
	labels: FeatureCollection<Point, L14LabelProperties>;
	cellIds: string[];
} | null {
	const l14Cells = zoom >= WAYFARER_CELLS_14_MIN_ZOOM ? getCoveringS2Cells(bounds, 14) : null;
	const l17Cells = zoom >= WAYFARER_CELLS_17_MIN_ZOOM ? getCoveringS2Cells(bounds, 17) : null;

	// L17 occupancy is derived from full fort data and only meaningful at higher zoom
	// (when forts are fetched). At low zoom (countsOnly), forts is empty so the set stays empty.
	const occupiedL17Set = new Set<string>();
	const cellIds: string[] = [];

	for (const fort of forts) {
		const leafCellId = s2.cellid.fromLatLng(s2.LatLng.fromDegrees(fort.lat, fort.lon));
		const l17CellId = s2.cellid.parent(leafCellId, 17).toString();
		occupiedL17Set.add(l17CellId);
	}

	const cells14Features: Feature<Polygon, S2CellPolygonProperties>[] = [];
	const cells17Features: Feature<Polygon, S2CellPolygonProperties>[] = [];
	const labelFeatures: Feature<Point, L14LabelProperties>[] = [];

	if (l14Cells && l14Cells.length <= MAX_S2_CELLS) {
		const c = getWayfarerColors();
		for (const cellId of l14Cells) {
			const key = cellId.toString();
			cellIds.push(key);
			const gyms = gymCounts[key] ?? 0;
			const count = (pokestopCounts[key] ?? 0) + gyms;

			const cell = s2.Cell.fromCellID(cellId);
			const polygon = geojson.toGeoJSON(cell) as Polygon;
			const center = cell.center();
			const centerCoords: [number, number] = [
				(s2.LatLng.longitude(center) * 180) / Math.PI,
				(s2.LatLng.latitude(center) * 180) / Math.PI
			];

			let fillColor = "transparent";
			let strokeColor = c.l14Stroke;
			let l14Highlight: "" | "red" | "amber" | "green" = "";

			const highlight = getWayfarerCellHighlight(count, gyms);
			if (highlight === "red") {
				fillColor = c.l14FillRed;
				strokeColor = c.l14StrokeRed;
				l14Highlight = L14_HIGHLIGHT.RED;
			} else if (highlight === "amber") {
				fillColor = c.l14FillAmber;
				strokeColor = c.l14StrokeAmber;
				l14Highlight = L14_HIGHLIGHT.AMBER;
			} else if (highlight === "green") {
				fillColor = c.l14FillGreen;
				strokeColor = c.l14StrokeGreen;
				l14Highlight = L14_HIGHLIGHT.GREEN;
			}

			cells14Features.push({
				type: "Feature",
				geometry: polygon,
				properties: {
					id: "l14-" + key,
					strokeColor,
					fillColor,
					l14Highlight,
					cellId: key,
					fortCount: count
				}
			});

			if (count > 0) {
				labelFeatures.push({
					type: "Feature",
					geometry: { type: "Point", coordinates: centerCoords },
					properties: {
						id: "l14-label-" + key,
						label: count.toString(),
						cellId: key,
						fortCount: count,
						labelText: c.labelText,
						labelHalo: strokeColor
					}
				});
			}
		}
	}

	if (l17Cells && l17Cells.length <= MAX_S2_CELLS) {
		const c = getWayfarerColors();
		for (const cellId of l17Cells) {
			const key = cellId.toString();
			const cell = s2.Cell.fromCellID(cellId);
			const polygon = geojson.toGeoJSON(cell) as Polygon;

			cells17Features.push({
				type: "Feature",
				geometry: polygon,
				properties: {
					id: "l17-" + key,
					strokeColor: c.l17Stroke,
					fillColor: occupiedL17Set.has(key) ? c.l17Fill : "transparent",
					l14Highlight: "",
					cellId: key,
					fortCount: 0
				}
			});
		}
	}

	return {
		cells14: featureCollection(cells14Features),
		cells17: featureCollection(cells17Features),
		labels: featureCollection(labelFeatures),
		cellIds
	};
}

function existingLayers(map: maplibre.Map, ids: string[]): string[] {
	return ids.filter((id) => map.getLayer(id));
}

export function wayfarerMapClickHandler(event: maplibre.MapMouseEvent) {
	if (event.originalEvent.defaultPrevented) return;
	const map = event.target;

	const labelLayers = existingLayers(map, [WayfarerLayerId.CELL_LABELS]);
	if (labelLayers.length > 0) {
		const labelFeatures = map.queryRenderedFeatures(event.point, { layers: labelLayers });
		if (labelFeatures.length > 0) {
			const props = labelFeatures[0].properties as L14LabelProperties;
			const coords = (labelFeatures[0].geometry as Point).coordinates as [number, number];
			setClickedL14Cell({
				cellId: props.cellId,
				center: coords,
				fortCount: props.fortCount,
				gymCount: gymCounts[props.cellId] ?? 0
			});
			return;
		}
	}

	const fortLayers = existingLayers(map, [
		WayfarerLayerId.FORT_CIRCLES,
		WayfarerLayerId.FORT_DIAMONDS
	]);
	if (fortLayers.length > 0) {
		const fortFeatures = map.queryRenderedFeatures(event.point, { layers: fortLayers });
		if (fortFeatures.length > 0) {
			const props = fortFeatures[0].properties as FortPointProperties;
			const fort = forts.find((f) => f.type + "-" + f.id === props.id);
			if (fort) {
				setClickedFort(fort);
				return;
			}
		}
	}

	if (map.getZoom() < WAYFARER_LABELS_MIN_ZOOM) {
		const cellLayers = existingLayers(map, [WayfarerLayerId.CELLS_14_FILL]);
		if (cellLayers.length > 0) {
			const cellFeatures = map.queryRenderedFeatures(event.point, { layers: cellLayers });
			if (cellFeatures.length > 0) {
				const props = cellFeatures[0].properties as S2CellPolygonProperties;
				const cell = s2.Cell.fromCellID(BigInt(props.cellId));
				const center = cell.center();
				const coords: [number, number] = [
					(s2.LatLng.longitude(center) * 180) / Math.PI,
					(s2.LatLng.latitude(center) * 180) / Math.PI
				];
				setClickedL14Cell({
					cellId: props.cellId,
					center: coords,
					fortCount: props.fortCount,
					gymCount: gymCounts[props.cellId] ?? 0
				});
				return;
			}
		}
	}

	clearClicked();
}

export function openWayfarerMap() {
	closeMenu();
	invokedFromMap = true;
	goto("/wayfarer").then();
}

export function getWayfarerInvokedFromMap() {
	return invokedFromMap;
}

export function getPokestopsRequiredForNewGym(count: number, gyms: number): number {
	const threshold = gyms <= 0 ? 2 : gyms <= 1 ? 6 : gyms <= 2 ? 20 : Infinity;
	if (threshold === Infinity || count >= threshold) return 0;
	return threshold - count;
}

export function getWayfarerCellHighlight(
	count: number,
	gyms: number
): "" | "red" | "amber" | "green" {
	if (count <= 0) return "";
	if (gyms >= 3) return "red";
	const remaining = getPokestopsRequiredForNewGym(count, gyms);
	if (remaining === 2) return "amber";
	if (remaining === 1) return "green";
	return "";
}
