<script lang="ts">
	import MapObjectIconLayer from "@/components/map/MapObjectIconLayer.svelte";
	import ModifierBadgeLayer from "@/components/map/ModifierBadgeLayer.svelte";
	import ModifierUnderlayLayer from "@/components/map/ModifierUnderlayLayer.svelte";
	import type {
		AnyFilterset,
		FiltersetModifiers,
		FiltersetRaid
	} from "@/lib/features/filters/filtersets";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import { getIcon, IconCategory } from "@/lib/features/filters/icons";
	import { ensureMapImages } from "@/lib/map/images";
	import { getMap } from "@/lib/map/map.svelte";
	import { getModifiers } from "@/lib/map/modifierLayout";
	import { getEmojiImageUrl } from "@/lib/map/modifierOverlayIcons";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { buildModifierPreviewFeatureCollection } from "@/lib/map/modifierPreviewFeatures";
	import { MapObjectFeatureType } from "@/lib/map/render/featureBuilders";
	import { getConfig } from "@/lib/services/config/config";
	import { getIconPokemon, getIconStation, getUiconSetDetails } from "@/lib/services/uicons.svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getMapStyle, mapStyleFromId } from "@/lib/utils/mapStyle";
	import type { FeatureCollection, Point } from "geojson";
	import type maplibre from "maplibre-gl";
	import { GeoJSON, MapLibre } from "svelte-maplibre";

	type PreviewCenter = [number, number];

	let {
		modifiers = undefined,
		iconUrl = undefined,
		filterset = undefined,
		majorCategory = undefined,
		subCategory = undefined,
		class: class_ = ""
	}: {
		modifiers?: FiltersetModifiers;
		iconUrl?: string;
		filterset?: AnyFilterset;
		majorCategory?: FilterCategory;
		subCategory?: FilterCategory;
		class?: string;
	} = $props();

	let badgeIconUrl = $derived.by(() => {
		if (!filterset?.icon) return undefined;
		if (filterset.icon.uicon) {
			return getIcon(filterset.icon.uicon.category, filterset.icon.uicon.params);
		}
		if (filterset.icon.emoji) return getEmojiImageUrl(filterset.icon.emoji);
		return undefined;
	});

	const emptyFeatureCollection: FeatureCollection<Point> = {
		type: "FeatureCollection",
		features: []
	};

	let map: maplibre.Map | undefined = $state(undefined);

	/** Whether the current raid filterset shows a boss pokemon (true) or egg (false). */
	function isRaidBoss(): boolean {
		if (!filterset) return false;
		return "bosses" in filterset && Boolean((filterset as FiltersetRaid).bosses?.length);
	}

	function getPreviewLayout() {
		const effectiveCategory = subCategory ?? majorCategory;

		if (effectiveCategory === "raid") {
			const gymIconSet = getUiconSetDetails(getUserSettings().uiconSet.gym.id);
			const baseMod = getModifiers(gymIconSet, MapObjectType.GYM);

			let focusImageSize: number;
			let overlayOffsetX: number;
			let overlayOffsetY: number;

			if (isRaidBoss()) {
				// Boss: pokemonModifiers.scale × raidModifiers.scale, offset from raid_pokemon
				const pokemonMod = getModifiers(gymIconSet, MapObjectType.POKEMON);
				const raidMod = getModifiers(gymIconSet, "raid_pokemon");
				focusImageSize = pokemonMod.scale * raidMod.scale;
				overlayOffsetX = raidMod.offsetX;
				overlayOffsetY = raidMod.offsetY;
			} else {
				// Egg: raidModifiers.scale only, offset from raid_egg
				const raidMod = getModifiers(gymIconSet, "raid_egg");
				focusImageSize = raidMod.scale;
				overlayOffsetX = raidMod.offsetX;
				overlayOffsetY = raidMod.offsetY;
			}

			return {
				baseIconUrl: getIcon(IconCategory.GYM, { team_id: 0 }),
				baseImageSize: baseMod.scale,
				baseImageOffset: [baseMod.offsetX, baseMod.offsetY],
				focusImageSize,
				focusImageOffset: [baseMod.offsetX + overlayOffsetX, baseMod.offsetY + overlayOffsetY]
			};
		}

		if (effectiveCategory === "quest") {
			const pokestopIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokestop.id);
			const baseMod = getModifiers(pokestopIconSet, MapObjectType.POKESTOP);
			const questMod = getModifiers(pokestopIconSet, "quest");

			return {
				baseIconUrl: getIcon(IconCategory.POKESTOP, {}),
				baseImageSize: baseMod.scale,
				baseImageOffset: [baseMod.offsetX, baseMod.offsetY],
				focusImageSize: questMod.scale,
				focusImageOffset: [baseMod.offsetX + questMod.offsetX, baseMod.offsetY + questMod.offsetY]
			};
		}

		if (effectiveCategory === "invasion") {
			const pokestopIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokestop.id);
			const baseMod = getModifiers(pokestopIconSet, MapObjectType.POKESTOP);
			const invasionMod = getModifiers(pokestopIconSet, "invasion");

			return {
				baseIconUrl: getIcon(IconCategory.POKESTOP, {}),
				baseImageSize: baseMod.scale,
				baseImageOffset: [baseMod.offsetX, baseMod.offsetY],
				focusImageSize: invasionMod.scale,
				focusImageOffset: [
					baseMod.offsetX + invasionMod.offsetX,
					baseMod.offsetY + invasionMod.offsetY
				]
			};
		}

		if (effectiveCategory === "maxBattle") {
			const stationIconSet = getUiconSetDetails(getUserSettings().uiconSet.station.id);
			const baseMod = getModifiers(stationIconSet, MapObjectType.STATION);
			const maxBattleMod = getModifiers(stationIconSet, "max_battle");

			return {
				baseIconUrl: getIconStation(false),
				baseImageSize: baseMod.scale,
				baseImageOffset: [baseMod.offsetX, baseMod.offsetY],
				focusImageSize: maxBattleMod.scale,
				focusImageOffset: [
					baseMod.offsetX + maxBattleMod.offsetX,
					baseMod.offsetY + maxBattleMod.offsetY
				]
			};
		}

		// Default: pokemon (no base icon)
		const pokemonIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokemon.id);
		const pokemonMod = getModifiers(pokemonIconSet, MapObjectType.POKEMON);

		return {
			baseIconUrl: undefined,
			baseImageSize: undefined,
			baseImageOffset: undefined,
			focusImageSize: pokemonMod.scale,
			focusImageOffset: [pokemonMod.offsetX, pokemonMod.offsetY]
		};
	}

	async function syncPreviewImages() {
		if (!map) return;
		await ensureMapImages(
			map,
			previewFeatures.features.map(
				(feature) => (feature.properties as { imageUrl: string }).imageUrl
			)
		);
	}

	function onMapLoad() {
		syncPreviewImages().catch((error) => console.error(error));
	}

	let previewCenter = $derived.by(() => {
		const currentCenter = getUserSettings().mapPosition.center;
		const mainMap = getMap();
		if (mainMap) {
			const center = mainMap.getCenter();
			return [center.lng, center.lat] as PreviewCenter;
		}
		return [currentCenter.lng, currentCenter.lat] as PreviewCenter;
	});

	let layout = $derived(getPreviewLayout());
	let focusIconUrl = $derived.by(() => {
		let url: string;
		if (filterset?.icon?.uicon?.category === IconCategory.POKEMON) {
			url = getIcon(IconCategory.POKEMON, filterset.icon.uicon.params);
		} else if (iconUrl) {
			url = iconUrl;
		} else {
			url = getIconPokemon({ pokemon_id: 25, form: 0 });
		}
		return url;
	});
	let previewFeatures = $derived.by(() => {
		if (!focusIconUrl) return emptyFeatureCollection;

		return buildModifierPreviewFeatureCollection({
			center: previewCenter,
			focusIconUrl,
			focusBaseImageSize: layout.focusImageSize,
			focusImageOffset: layout.focusImageOffset,
			modifiers,
			badgeIconUrl,
			baseIconUrl: layout.baseIconUrl,
			baseImageSize: layout.baseImageSize,
			baseImageOffset: layout.baseImageOffset
		});
	});

	$effect(() => {
		map;
		previewFeatures;
		syncPreviewImages().catch((error) => console.error(error));
	});
</script>

<div class="rounded-md border border-border overflow-hidden w-full h-40 {class_}">
	{#key getUserSettings().mapStyle.id}
		<MapLibre
			bind:map
			center={getMap()?.getCenter() ??
				getUserSettings().mapPosition.center ?? [
					getConfig().general.defaultLon,
					getConfig().general.defaultLat
				]}
			zoom={16}
			style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
			filterLayers={(layer) => layer.type !== "symbol" || layer.id.startsWith("modifierPreview")}
			class="size-full"
			attributionControl={false}
			interactive={false}
			zoomOnDoubleClick={false}
			onload={onMapLoad}
		>
			<GeoJSON id="modifierPreview" data={previewFeatures}>
				<ModifierBadgeLayer
					id="modifierPreviewBadge"
					filter={[
						"all",
						["==", ["get", "type"], MapObjectFeatureType.ICON],
						["==", ["coalesce", ["get", "isUnderlay"], false], false],
						["==", ["coalesce", ["get", "isAttachedBadge"], false], true]
					]}
				/>
				<MapObjectIconLayer
					id="modifierPreviewIcons"
					beforeId="modifierPreviewBadge"
					filter={[
						"all",
						["==", ["get", "type"], MapObjectFeatureType.ICON],
						["==", ["coalesce", ["get", "isUnderlay"], false], false],
						["==", ["coalesce", ["get", "isAttachedBadge"], false], false]
					]}
				/>
				<ModifierUnderlayLayer
					id="modifierPreviewUnderlay"
					beforeId="modifierPreviewIcons"
					filter={[
						"all",
						["==", ["get", "type"], MapObjectFeatureType.ICON],
						["==", ["coalesce", ["get", "isUnderlay"], false], true]
					]}
				/>
			</GeoJSON>
		</MapLibre>
	{/key}
</div>
