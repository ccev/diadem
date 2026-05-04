<script lang="ts">
	import { GeoJSON, SymbolLayer } from "svelte-maplibre";
	import type { FeatureCollection, Point } from "geojson";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getMap, getMapStyleVersion } from "@/lib/map/map.svelte";
	import { MapObjectLayerId, MapSourceId } from "@/lib/map/layers";
	import { matchPokemonFilterset } from "@/lib/features/filterLogic/pokemon";
	import { isPopupActionActive, PopupAction } from "@/lib/ui/popupActions";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import { onDestroy } from "svelte";

	const timerBackgroundImageId = "popup-action-timer-background";

	let now = $state(currentTimestamp());
	const interval = setInterval(() => {
		now = currentTimestamp();
	}, 1000);

	onDestroy(() => clearInterval(interval));

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

	$effect(() => {
		getMapStyleVersion();

		const map = getMap();
		if (!map || map.hasImage(timerBackgroundImageId)) return;

		const image = createTimerBackgroundImage();
		if (!image) return;

		map.addImage(timerBackgroundImageId, image);
	});

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

	function isTimerPokemon(obj: MapData): obj is PokemonData {
		return (
			obj.type === MapObjectType.POKEMON &&
			Boolean(obj.expire_timestamp) &&
			isPopupActionActive(obj.type, obj.mapId, PopupAction.TIMER)
		);
	}

	let timerData: FeatureCollection<Point, { hasModifierLabel: boolean; timer: string }> =
		$derived.by(() => ({
			type: "FeatureCollection",
			features: Object.values(getMapObjects())
				.filter(isTimerPokemon)
				.map((pokemon) => ({
					type: "Feature",
					geometry: {
						type: "Point",
						coordinates: [pokemon.lon, pokemon.lat]
					},
					properties: {
						hasModifierLabel: Boolean(matchPokemonFilterset(pokemon)?.modifiers?.showLabel),
						timer: formatTimer(pokemon.expire_timestamp ?? now)
					},
					id: pokemon.mapId
				}))
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
			"icon-offset": [
				"case",
				["get", "hasModifierLabel"],
				["literal", [0, 14]],
				["literal", [0, 0]]
			],
			"icon-allow-overlap": true,
			"text-field": ["get", "timer"],
			"text-anchor": "top",
			"text-offset": [
				"case",
				["get", "hasModifierLabel"],
				["literal", [0, 2.75]],
				["literal", [0, 1.5]]
			],
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
	/>
</GeoJSON>
