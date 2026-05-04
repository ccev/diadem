<script lang="ts">
	import { GeoJSON, SymbolLayer } from "svelte-maplibre";
	import type { Feature, FeatureCollection, Point } from "geojson";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getMap, getMapStyleVersion } from "@/lib/map/map.svelte";
	import { MapObjectLayerId, MapSourceId } from "@/lib/map/layers";
	import { matchPokemonFilterset } from "@/lib/features/filterLogic/pokemon";
	import { matchInvasionFilterset } from "@/lib/features/filterLogic/pokestop";
	import { matchRaidFilterset } from "@/lib/features/filterLogic/gym";
	import { matchMaxBattleFilterset } from "@/lib/features/filterLogic/station";
	import { getConfigModifiers } from "@/lib/map/render/renderMapObjects";
	import { isPopupActionActive, PopupAction } from "@/lib/ui/popupActions";
	import { getCurrentUiconSetDetailsAllTypes } from "@/lib/services/uicons.svelte";
	import type { UiconSetModifierType } from "@/lib/services/config/configTypes";
	import type { Incident } from "@/lib/types/mapObjectData/pokestop";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import { onDestroy } from "svelte";

	const TIMER_BACKGROUND_IMAGE_ID = "popup-action-timer-background";
	const TIMER_BACKGROUND_SIZE = { width: 32, height: 16, radius: 10 };
	const TIMER_BACKGROUND_COLOR = "rgba(9, 9, 11, 0.78)";
	const TIMER_TEXT_OFFSET = { default: 1.5, withLabel: 2.5 };
	const MAPLIBRE_ICON_OFFSET_SCALE = 32;

	type TimerFeatureProperties = {
		id: string;
		textOffset: [number, number];
		timer: string;
	};

	type TimerFeature = Feature<Point, TimerFeatureProperties>;
	type TimerFeatureEntry = {
		expires: number;
		feature: TimerFeature;
	};

	let now = $state(currentTimestamp());
	const interval = setInterval(() => {
		now = currentTimestamp();
	}, 1000);

	onDestroy(() => clearInterval(interval));

	$effect(() => {
		getMapStyleVersion();

		const map = getMap();
		if (!map || map.hasImage(TIMER_BACKGROUND_IMAGE_ID)) return;

		const image = createTimerBackgroundImage();
		if (!image) return;

		map.addImage(TIMER_BACKGROUND_IMAGE_ID, image);
	});

	function createTimerBackgroundImage() {
		const canvas = document.createElement("canvas");
		canvas.width = TIMER_BACKGROUND_SIZE.width;
		canvas.height = TIMER_BACKGROUND_SIZE.height;

		const ctx = canvas.getContext("2d");
		if (!ctx) return undefined;

		ctx.fillStyle = TIMER_BACKGROUND_COLOR;
		ctx.roundRect(0, 0, canvas.width, canvas.height, TIMER_BACKGROUND_SIZE.radius);
		ctx.fill();

		return ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	function formatTimer(expireTimestamp: number, timestamp: number) {
		const remaining = Math.max(0, expireTimestamp - timestamp);
		const minutes = Math.floor(remaining / 60);
		const seconds = remaining % 60;

		if (minutes >= 60) {
			const hours = Math.floor(minutes / 60);
			return `${hours}h ${minutes % 60}m`;
		}

		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}

	function hasFilterLabel(obj: MapData): boolean {
		switch (obj.type) {
			case MapObjectType.POKEMON:
				return Boolean(matchPokemonFilterset(obj)?.modifiers?.showLabel);
			case MapObjectType.GYM:
				return Boolean(matchRaidFilterset(obj)?.modifiers?.showLabel);
			case MapObjectType.STATION:
				return Boolean(matchMaxBattleFilterset(obj)?.modifiers?.showLabel);
		}
		return false;
	}

	function hasIncidentFilterLabel(incident: Incident): boolean {
		return Boolean(matchInvasionFilterset(incident)?.modifiers?.showLabel);
	}

	function getTimerOffset(
		obj: MapData,
		hasModifierLabel: boolean,
	): [number, number] {
		const iconSets = getCurrentUiconSetDetailsAllTypes();
		const baseModifiers = getConfigModifiers(iconSets[obj.type], obj.type);
		const offsetX = baseModifiers.offsetX;
		const offsetY = baseModifiers.offsetY;

		return [offsetX / MAPLIBRE_ICON_OFFSET_SCALE, (hasModifierLabel ? TIMER_TEXT_OFFSET.withLabel : TIMER_TEXT_OFFSET.default) + offsetY / MAPLIBRE_ICON_OFFSET_SCALE];
	}

	function createTimerFeatureEntry(
		obj: MapData,
		expires: number,
		hasModifierLabel: boolean,
		id: string,
	): TimerFeatureEntry {
		return {
			expires,
			feature: {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: [obj.lon, obj.lat]
				},
				properties: {
					id: obj.mapId,
					textOffset: getTimerOffset(obj, hasModifierLabel),
					timer: formatTimer(expires, currentTimestamp())
				},
				id
			}
		};
	}

	function getTimerFeatureEntries(obj: MapData): TimerFeatureEntry[] {
		if (!isPopupActionActive(obj.type, obj.mapId, PopupAction.TIMER)) return [];

		if (obj.type === MapObjectType.POKESTOP) {
			return (obj.incident ?? []).map((incident, index) =>
				createTimerFeatureEntry(
					obj,
					incident.expiration,
					hasIncidentFilterLabel(incident),
					`${obj.mapId}-incident-${incident.id}`,
				)
			);
		}

		let expires: number | undefined;
		switch (obj.type) {
			case MapObjectType.POKEMON:
			case MapObjectType.TAPPABLE:
				expires = obj.expire_timestamp ?? undefined;
				break;
			case MapObjectType.GYM:
				expires = obj.raid_end_timestamp ?? undefined;
				break;
			case MapObjectType.STATION:
				expires = obj.end_time ?? undefined;
				break;
		}

		if (!expires) return [];

		return [createTimerFeatureEntry(obj, expires, hasFilterLabel(obj), obj.mapId)];
	}

	let timerFeatureEntries: TimerFeatureEntry[] = $derived.by(() =>
		Object.values(getMapObjects()).flatMap(getTimerFeatureEntries)
	);

	let timerData: FeatureCollection<Point, TimerFeatureProperties> = $derived.by(() => ({
		type: "FeatureCollection",
		features: timerFeatureEntries
			.filter((entry) => entry.expires > now)
			.map((entry) => {
				entry.feature.properties.timer = formatTimer(entry.expires, now);
				return entry.feature;
			})
	}));
</script>

<GeoJSON id={MapSourceId.POPUP_ACTION_TIMERS} data={timerData}>
	<SymbolLayer
		id={MapObjectLayerId.TIMER_LABELS}
		layout={{
			"icon-image": TIMER_BACKGROUND_IMAGE_ID,
			"icon-text-fit": "both",
			"icon-text-fit-padding": [3, 7, 3, 7],
			"icon-anchor": "top",
			"icon-allow-overlap": true,
			"text-field": ["get", "timer"],
			"text-anchor": "top",
			"text-offset": ["get", "textOffset"],
			"text-size": 12,
			"text-allow-overlap": true,
			"text-font": [
				"IBM Plex Sans Bold",
				"Open Sans Bold",
				"Noto Sans Bold",
				"Arial Unicode MS Bold",
				"sans-serif"
			]
		}}
		paint={{
			"text-color": "#ffffff",
			"text-halo-color": "rgba(9, 9, 11, 0.5)",
			"text-halo-width": 0.75,
			"text-halo-blur": 0.25
		}}
		hoverCursor="pointer"
	/>
</GeoJSON>
