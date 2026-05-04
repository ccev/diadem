<script lang="ts">
	import { GeoJSON, SymbolLayer } from "svelte-maplibre";
	import type { FeatureCollection, Point } from "geojson";
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

	const timerBackgroundImageId = "popup-action-timer-background";

	let now = $state(currentTimestamp());
	const interval = setInterval(() => {
		now = currentTimestamp();
	}, 1000);

	onDestroy(() => clearInterval(interval));

	$effect(() => {
		getMapStyleVersion();

		const map = getMap();
		if (!map || map.hasImage(timerBackgroundImageId)) return;

		const image = createTimerBackgroundImage();
		if (!image) return;

		map.addImage(timerBackgroundImageId, image);
	});

	function createTimerBackgroundImage() {
		const canvas = document.createElement("canvas");
		canvas.width = 32;
		canvas.height = 16;

		const ctx = canvas.getContext("2d");
		if (!ctx) return undefined;

		const radius = 7;
		ctx.fillStyle = "rgba(9, 9, 11, 0.78)";
		ctx.beginPath();
		ctx.moveTo(radius, 0);
		ctx.lineTo(canvas.width - radius, 0);
		ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
		ctx.lineTo(canvas.width, canvas.height - radius);
		ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
		ctx.lineTo(radius, canvas.height);
		ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
		ctx.lineTo(0, radius);
		ctx.quadraticCurveTo(0, 0, radius, 0);
		ctx.closePath();
		ctx.fill();

		return ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	function formatTimer(expireTimestamp: number) {
		const remaining = Math.max(0, expireTimestamp - now);
		const minutes = Math.floor(remaining / 60);
		const seconds = remaining % 60;

		if (minutes >= 60) {
			const hours = Math.floor(minutes / 60);
			return `${hours}h ${minutes % 60}m`;
		}

		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	}

	function getTimerExpire(obj: MapData): number | undefined {
		switch (obj.type) {
			case MapObjectType.POKEMON:
				return obj.expire_timestamp ?? undefined;
			case MapObjectType.GYM:
				return obj.raid_end_timestamp ?? undefined;
			case MapObjectType.STATION:
				return obj.end_time;
		}
	}

	function getFilterLabel(obj: MapData): boolean {
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

	function getIncidentFilterLabel(incident: Incident): boolean {
		return Boolean(matchInvasionFilterset(incident)?.modifiers?.showLabel);
	}

	function getTimerOffset(
		obj: MapData,
		hasModifierLabel: boolean,
		incidentIndex = 0
	): [number, number] {
		const iconSets = getCurrentUiconSetDetailsAllTypes();
		const baseModifiers = getConfigModifiers(iconSets[obj.type], obj.type);
		let offsetX = baseModifiers.offsetX;
		let offsetY = baseModifiers.offsetY;

		return [offsetX / 32, (hasModifierLabel ? 2.5 : 1.5) + offsetY / 32];
	}

	function getTimerFeature(
		obj: MapData,
		expires: number,
		hasModifierLabel: boolean,
		id: string,
		incidentIndex = 0
	) {
		return {
			type: "Feature" as const,
			geometry: {
				type: "Point" as const,
				coordinates: [obj.lon, obj.lat]
			},
			properties: {
				textOffset: getTimerOffset(obj, hasModifierLabel, incidentIndex),
				timer: formatTimer(expires),
				id: obj.mapId
			},
			id
		};
	}

	let timerData: FeatureCollection<Point, { textOffset: [number, number]; timer: string }> =
		$derived.by(() => ({
			type: "FeatureCollection",
			features: Object.values(getMapObjects()).flatMap((obj) => {
				if (!isPopupActionActive(obj.type, obj.mapId, PopupAction.TIMER)) return [];

				if (obj.type === MapObjectType.POKESTOP) {
					return (obj.incident ?? [])
						.filter((incident) => incident.expiration > now)
						.map((incident, index) =>
							getTimerFeature(
								obj,
								incident.expiration,
								getIncidentFilterLabel(incident),
								`${obj.mapId}-incident-${incident.id}`,
								index
							)
						);
				}

				const timer = getTimerExpire(obj);
				if (!timer || timer <= now) return [];

				return [getTimerFeature(obj, timer, getFilterLabel(obj), obj.mapId)];
			})
		}));
</script>

<GeoJSON id={MapSourceId.POPUP_ACTION_TIMERS} data={timerData}>
	<SymbolLayer
		id={MapObjectLayerId.TIMER_LABELS}
		layout={{
			"icon-image": timerBackgroundImageId,
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
