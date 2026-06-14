<script lang="ts">
	import maplibre from "maplibre-gl";
	import { GeoJSON, FillLayer, LineLayer, CircleLayer, SymbolLayer } from "svelte-maplibre";
	import type { ExpressionSpecification } from "maplibre-gl";
	import {
		MapSourceId,
		WayfarerLayerId,
		updateMapGeojsonSource,
		L14_HIGHLIGHT
	} from "@/lib/map/layers";
	import {
		fetchWayfarerForts,
		generateFortGeoJSON,
		generateWayfarerData,
		generateCandidatesGeoJSON,
		wayfarerMapClickHandler,
		getWayfarerColors,
		WAYFARER_CELLS_14_MIN_ZOOM,
		WAYFARER_DIAMOND_WHITE_ID,
		WAYFARER_DIAMOND_PINK_ID,
		WAYFARER_FORTS_MIN_ZOOM,
		WAYFARER_LABELS_MIN_ZOOM,
		getWayfarerStyle
	} from "@/lib/features/wayfarerMap.svelte";
	import { CANDIDATE_ICONS, CANDIDATE_CATEGORIES } from "@/lib/services/wayfarerCandidateIcons";
	import MapCommon from "@/components/map/MapCommon.svelte";
	import {
		getInitialMapPositionMain,
		getMapPositionFromUrlParams
	} from "$lib/map/mapPositionParams.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { Coords } from "@/lib/utils/coordinates";
	import type { FeatureCollection, Point, Polygon } from "geojson";
	import { getMapStyle } from "@/lib/utils/mapStyle";

	let {
		map = $bindable()
	}: {
		map?: maplibre.Map | undefined;
	} = $props();

	const mapPosition = getInitialMapPositionMain();

	let fortData: FeatureCollection<Point> = $state(featureCollectionEmpty());
	let cells14Data: FeatureCollection<Polygon> = $state(featureCollectionEmpty());
	let cells17Data: FeatureCollection<Polygon> = $state(featureCollectionEmpty());
	let labelsData: FeatureCollection<Point> = $state(featureCollectionEmpty());
	let candidatesData: FeatureCollection<Point> = $derived(generateCandidatesGeoJSON());

	function featureCollectionEmpty<T extends Point | Polygon>() {
		return { type: "FeatureCollection" as const, features: [] } as FeatureCollection<T>;
	}

	function makeDiamondImage(fill: string, stroke: string): ImageData {
		const size = 32;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d")!;
		ctx.beginPath();
		ctx.moveTo(size / 2, 2);
		ctx.lineTo(size - 2, size / 2);
		ctx.lineTo(size / 2, size - 2);
		ctx.lineTo(2, size / 2);
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.strokeStyle = stroke;
		ctx.lineWidth = 3;
		ctx.stroke();
		return ctx.getImageData(0, 0, size, size);
	}

	function loadDiamondImages(m: maplibre.Map) {
		const c = getWayfarerColors();
		if (!m.hasImage(WAYFARER_DIAMOND_WHITE_ID)) {
			m.addImage(WAYFARER_DIAMOND_WHITE_ID, makeDiamondImage(c.fortGym, c.fortGymStroke));
		}
		if (!m.hasImage(WAYFARER_DIAMOND_PINK_ID)) {
			m.addImage(
				WAYFARER_DIAMOND_PINK_ID,
				makeDiamondImage(c.fortSponsored, c.fortSponsoredStroke)
			);
		}
	}

	let iconContainer: HTMLDivElement | undefined = $state();

	const CANDIDATE_ICON_SIZE = 36;
	const CANDIDATE_INNER_ICON_SIZE = 22;
	const CANDIDATE_ICON_COLOR = "#06b6d4";

	function extractCandidateSvg(category: string): string | undefined {
		const svg = iconContainer?.querySelector<SVGSVGElement>(`[data-cat="${category}"] svg`);
		if (!svg) return undefined;
		const clone = svg.cloneNode(true) as SVGSVGElement;
		clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
		clone.setAttribute("stroke", CANDIDATE_ICON_COLOR);
		clone.setAttribute("width", String(CANDIDATE_INNER_ICON_SIZE));
		clone.setAttribute("height", String(CANDIDATE_INNER_ICON_SIZE));
		return new XMLSerializer().serializeToString(clone);
	}

	async function makeCandidateIconImage(category: string): Promise<ImageData | undefined> {
		const svgString = extractCandidateSvg(category);
		if (!svgString) return undefined;

		const size = CANDIDATE_ICON_SIZE;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d")!;

		ctx.fillStyle = "#ffffff";
		ctx.strokeStyle = CANDIDATE_ICON_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		const img = new Image();
		return new Promise((resolve) => {
			img.onload = () => {
				const offset = (size - CANDIDATE_INNER_ICON_SIZE) / 2;
				ctx.drawImage(img, offset, offset, CANDIDATE_INNER_ICON_SIZE, CANDIDATE_INNER_ICON_SIZE);
				resolve(ctx.getImageData(0, 0, size, size));
			};
			img.onerror = () => resolve(undefined);
			img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
		});
	}

	async function loadCandidateIcons(m: maplibre.Map) {
		for (const category of CANDIDATE_CATEGORIES) {
			const id = CANDIDATE_ICONS[category].mapImageId;
			if (m.hasImage(id)) continue;
			const image = await makeCandidateIconImage(category);
			if (image && !m.hasImage(id)) m.addImage(id, image);
		}
	}

	async function updateWayfarerData(m: maplibre.Map) {
		const zoom = m.getZoom();
		const b = m.getBounds();
		const bounds = {
			minLat: b.getSouth(),
			maxLat: b.getNorth(),
			minLon: b.getWest(),
			maxLon: b.getEast()
		};

		// Always fetch when L14 cells are visible. Use countsOnly when forts shouldn't be rendered.
		if (zoom >= WAYFARER_CELLS_14_MIN_ZOOM) {
			const initialData = generateWayfarerData(bounds, zoom);
			if (initialData && initialData.cellIds.length > 0) {
				const countsOnly = zoom < WAYFARER_FORTS_MIN_ZOOM;
				await fetchWayfarerForts(initialData.cellIds, countsOnly);
			}
		}

		// Regenerate cell GeoJSON with the fresh counts from the server.
		const data = generateWayfarerData(bounds, zoom);
		if (data) {
			cells14Data = data.cells14;
			cells17Data = data.cells17;
			labelsData = data.labels;
		} else {
			cells14Data = featureCollectionEmpty();
			cells17Data = featureCollectionEmpty();
			labelsData = featureCollectionEmpty();
		}

		fortData = zoom >= WAYFARER_FORTS_MIN_ZOOM ? generateFortGeoJSON() : featureCollectionEmpty();

		if (zoom < WAYFARER_LABELS_MIN_ZOOM) {
			labelsData = featureCollectionEmpty();
		}

		updateMapGeojsonSource(m, MapSourceId.WAYFARER_FORTS, fortData);
		updateMapGeojsonSource(m, MapSourceId.WAYFARER_CELLS_14, cells14Data);
		updateMapGeojsonSource(m, MapSourceId.WAYFARER_CELLS_17, cells17Data);
		updateMapGeojsonSource(m, MapSourceId.WAYFARER_CELL_LABELS, labelsData);
	}
</script>

<MapCommon
	bind:map
	initialCenter={Coords.infer(mapPosition.center)}
	initialZoom={mapPosition.zoom}
	onload={async (loadedMap) => {
		loadDiamondImages(loadedMap);
		await loadCandidateIcons(loadedMap);
		loadedMap.on("styledataloading", () => {
			loadDiamondImages(loadedMap);
			loadCandidateIcons(loadedMap);
			updateWayfarerData(loadedMap);

			loadedMap?.once("styledata", () => {
				updateMapGeojsonSource(loadedMap, MapSourceId.WAYFARER_FORTS, fortData);
				updateMapGeojsonSource(loadedMap, MapSourceId.WAYFARER_CANDIDATES, candidatesData);
			});
		});

		loadedMap.on("click", wayfarerMapClickHandler);

		loadedMap.on("moveend", () => {
			updateWayfarerData(loadedMap);

			const us = getUserSettings();
			us.mapPosition.zoom = loadedMap.getZoom();
			us.mapPosition.center = loadedMap.getCenter();
			updateUserSettings();
		});

		updateWayfarerData(loadedMap);
	}}
	style={getWayfarerStyle()}
>
	<GeoJSON id={MapSourceId.WAYFARER_CELLS_17} data={cells17Data}>
		<FillLayer
			id={WayfarerLayerId.CELLS_17_FILL}
			paint={{
				"fill-color": ["get", "fillColor"],
				"fill-opacity": 0.5
			}}
		/>
		<LineLayer
			id={WayfarerLayerId.CELLS_17_LINE}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{
				"line-color": ["get", "strokeColor"],
				"line-width": 1
			}}
		/>
	</GeoJSON>

	<GeoJSON id={MapSourceId.WAYFARER_CELLS_14} data={cells14Data}>
		<FillLayer
			id={WayfarerLayerId.CELLS_14_FILL}
			paint={{
				"fill-color": ["get", "fillColor"],
				"fill-opacity": 0.5
			}}
		/>
		<LineLayer
			id={WayfarerLayerId.CELLS_14_LINE}
			filter={["==", ["get", "l14Highlight"], ""] as ExpressionSpecification}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{
				"line-color": ["get", "strokeColor"],
				"line-width": 2
			}}
		/>
		<LineLayer
			id={WayfarerLayerId.CELLS_14_LINE_RED}
			filter={["==", ["get", "l14Highlight"], L14_HIGHLIGHT.RED] as ExpressionSpecification}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{
				"line-color": ["get", "strokeColor"],
				"line-width": 2.5
			}}
		/>
		<LineLayer
			id={WayfarerLayerId.CELLS_14_LINE_AMBER}
			filter={["==", ["get", "l14Highlight"], L14_HIGHLIGHT.AMBER] as ExpressionSpecification}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{
				"line-color": ["get", "strokeColor"],
				"line-width": 2.5
			}}
		/>
		<LineLayer
			id={WayfarerLayerId.CELLS_14_LINE_GREEN}
			filter={["==", ["get", "l14Highlight"], L14_HIGHLIGHT.GREEN] as ExpressionSpecification}
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{
				"line-color": ["get", "strokeColor"],
				"line-width": 2.5
			}}
		/>
	</GeoJSON>

	<GeoJSON id={MapSourceId.WAYFARER_CANDIDATES} data={candidatesData}>
		<SymbolLayer
			id={WayfarerLayerId.CANDIDATE_CIRCLES}
			layout={{
				"icon-image": ["get", "iconImage"],
				"icon-size": 0.75,
				"icon-allow-overlap": true,
				"icon-ignore-placement": true
			}}
			paint={{
				"icon-opacity": ["case", ["get", "dimmed"], 0.3, 1] as ExpressionSpecification
			}}
			hoverCursor="pointer"
		/>
	</GeoJSON>

	<GeoJSON id={MapSourceId.WAYFARER_FORTS} data={fortData}>
		<CircleLayer
			id={WayfarerLayerId.FORT_CIRCLES}
			filter={["==", ["get", "fortType"], "p"] as ExpressionSpecification}
			paint={{
				"circle-radius": 5,
				"circle-color": ["get", "circleColor"],
				"circle-stroke-color": ["get", "circleStrokeColor"],
				"circle-stroke-width": 1.5
			}}
			hoverCursor="pointer"
		/>
		<SymbolLayer
			id={WayfarerLayerId.FORT_DIAMONDS}
			filter={["==", ["get", "fortType"], "g"] as ExpressionSpecification}
			layout={{
				"icon-image": ["get", "iconImage"],
				"icon-size": 0.5,
				"icon-allow-overlap": true,
				"icon-ignore-placement": true
			}}
			hoverCursor="pointer"
		/>
	</GeoJSON>

	<GeoJSON id={MapSourceId.WAYFARER_CELL_LABELS} data={labelsData}>
		<SymbolLayer
			id={WayfarerLayerId.CELL_LABELS}
			layout={{
				"text-field": ["get", "label"],
				"text-size": 16,
				"text-allow-overlap": true,
				"text-ignore-placement": true
			}}
			paint={{
				"text-color": ["get", "labelText"],
				"text-halo-color": ["get", "labelHalo"],
				"text-halo-width": 1.75
			}}
			hoverCursor="pointer"
		/>
	</GeoJSON>
</MapCommon>

<div
	bind:this={iconContainer}
	class="absolute pointer-events-none opacity-0 size-0 overflow-hidden -z-50"
>
	{#each CANDIDATE_CATEGORIES as category (category)}
		{@const Icon = CANDIDATE_ICONS[category].Icon}
		<div data-cat={category}>
			<Icon size={CANDIDATE_INNER_ICON_SIZE} strokeWidth={2.25} color={CANDIDATE_ICON_COLOR} />
		</div>
	{/each}
</div>
