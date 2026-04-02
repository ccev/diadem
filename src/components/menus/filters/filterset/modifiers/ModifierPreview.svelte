<script lang="ts">
	import MapObjectSymbolLayer from "@/components/map/MapObjectSymbolLayer.svelte";
	import type {
		AnyFilterset,
		FiltersetInvasion,
		FiltersetMaxBattle,
		FiltersetModifiers,
		FiltersetQuest,
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
	import {
		getIconPokemon,
		getIconRaidEgg,
		getIconStation,
		getUiconSetDetails
	} from "@/lib/services/uicons.svelte";
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

	/** Try to resolve a pokemon icon from the filterset's uicon or its data. */
	function getPokemonIconFromFilterset(): string | undefined {
		if (!filterset) return undefined;
		// 1. If the filterset uicon is type POKEMON, use that
		if (filterset.icon?.uicon?.category === IconCategory.POKEMON) {
			return getIcon(IconCategory.POKEMON, filterset.icon.uicon.params);
		}
		// 2. If the filterset has pokemon data, use the first one
		if ("pokemon" in filterset && filterset.pokemon?.length) {
			return getIconPokemon(filterset.pokemon[0]);
		}
		if ("bosses" in filterset && (filterset as FiltersetRaid | FiltersetMaxBattle).bosses?.length) {
			return getIconPokemon((filterset as FiltersetRaid | FiltersetMaxBattle).bosses![0]);
		}
		return undefined;
	}

	function getPreviewLayout() {
		const effectiveCategory = subCategory ?? majorCategory;

		if (effectiveCategory === "raid") {
			const gymIconSet = getUiconSetDetails(getUserSettings().uiconSet.gym.id);
			const baseMod = getModifiers(gymIconSet, MapObjectType.GYM);

			// Always use raid_pokemon layout for the preview (shows boss in front)
			const pokemonMod = getModifiers(gymIconSet, MapObjectType.POKEMON);
			const raidMod = getModifiers(gymIconSet, "raid_pokemon");

			return {
				baseIconUrl: getIcon(IconCategory.GYM, { team_id: 0 }),
				baseImageSize: baseMod.scale,
				baseImageOffset: [baseMod.offsetX, baseMod.offsetY],
				focusImageSize: pokemonMod.scale * raidMod.scale,
				focusImageOffset: [baseMod.offsetX + raidMod.offsetX, baseMod.offsetY + raidMod.offsetY]
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
		const effectiveCategory = subCategory ?? majorCategory;

		// Quest: show POKEMON, ITEM uicon, or first pokemon from data, or Pikachu
		if (effectiveCategory === "quest") {
			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.POKEMON || uicon?.category === IconCategory.ITEM) {
				return getIcon(uicon.category, uicon.params);
			}
			const pokemonIcon = getPokemonIconFromFilterset();
			if (pokemonIcon) return pokemonIcon;
			// Check for item rewards in the quest filterset
			const quest = filterset as FiltersetQuest | undefined;
			if (quest?.item?.length) {
				return getIcon(IconCategory.ITEM, { item: quest.item[0].id });
			}
			return getIconPokemon({ pokemon_id: 25, form: 0 });
		}

		// Invasion: show INVASION uicon, or default grunt
		if (effectiveCategory === "invasion") {
			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.INVASION) {
				return getIcon(IconCategory.INVASION, uicon.params);
			}
			// Check if characters are set
			const invasion = filterset as FiltersetInvasion | undefined;
			if (invasion?.characters?.length) {
				return getIcon(IconCategory.INVASION, {
					character: invasion.characters[0],
					confirmed: true
				});
			}
			return getIcon(IconCategory.INVASION, { character: 4, confirmed: true });
		}

		// Raid: show RAID uicon, or first boss, or level 5 egg
		if (effectiveCategory === "raid") {
			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.RAID) {
				return getIcon(IconCategory.RAID, uicon.params);
			}
			const pokemonIcon = getPokemonIconFromFilterset();
			if (pokemonIcon) return pokemonIcon;
			return getIconRaidEgg(5);
		}

		// Max Battle: show POKEMON uicon, or first boss, or Pikachu
		if (effectiveCategory === "maxBattle") {
			const pokemonIcon = getPokemonIconFromFilterset();
			if (pokemonIcon) return pokemonIcon;
			return getIconPokemon({ pokemon_id: 25, form: 0 });
		}

		// Pokemon (default): show POKEMON uicon, or first pokemon, or Pikachu
		const pokemonIcon = getPokemonIconFromFilterset();
		if (pokemonIcon) return pokemonIcon;
		return getIconPokemon({ pokemon_id: 25, form: 0 });
	});
	let previewFeatures = $derived.by(() => {
		if (!focusIconUrl) return emptyFeatureCollection;

		const effectiveCategory = subCategory ?? majorCategory;
		const overlayOnBase = effectiveCategory === "raid" || effectiveCategory === "maxBattle";

		return buildModifierPreviewFeatureCollection({
			center: previewCenter,
			focusIconUrl,
			focusBaseImageSize: layout.focusImageSize,
			focusImageOffset: layout.focusImageOffset,
			modifiers,
			badgeIconUrl,
			baseIconUrl: layout.baseIconUrl,
			baseImageSize: layout.baseImageSize,
			baseImageOffset: layout.baseImageOffset,
			overlayOnBase
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
				<MapObjectSymbolLayer
					id="modifierPreviewBadge"
					filter={[
						"all",
						["==", ["get", "type"], MapObjectFeatureType.ICON],
						["==", ["coalesce", ["get", "isUnderlay"], false], false],
						["==", ["coalesce", ["get", "isAttachedBadge"], false], true]
					]}
				/>
				<MapObjectSymbolLayer
					id="modifierPreviewIcons"
					beforeId="modifierPreviewBadge"
					filter={[
						"all",
						["==", ["get", "type"], MapObjectFeatureType.ICON],
						["==", ["coalesce", ["get", "isUnderlay"], false], false],
						["==", ["coalesce", ["get", "isAttachedBadge"], false], false]
					]}
					withLabel={true}
				/>
				<MapObjectSymbolLayer
					id="modifierPreviewUnderlay"
					beforeId="modifierPreviewIcons"
					filter={[
						"all",
						["==", ["get", "type"], MapObjectFeatureType.ICON],
						["==", ["coalesce", ["get", "isUnderlay"], false], true]
					]}
					interactive={false}
				/>
			</GeoJSON>
		</MapLibre>
	{/key}
</div>
