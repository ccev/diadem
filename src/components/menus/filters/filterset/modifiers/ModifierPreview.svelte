<script lang="ts">
	import MapObjectSymbolLayer from "@/components/map/MapObjectSymbolLayer.svelte";
	import type {
		AnyFilterset,
		FiltersetInvasion,
		FiltersetMaxBattle,
		FiltersetQuest,
		FiltersetRaid
	} from "@/lib/features/filters/filtersets";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import { getIcon, IconCategory } from "@/lib/features/filters/icons";
	import { ensureMapImages } from "@/lib/map/images";
	import { getMap } from "@/lib/map/map.svelte";
	import { getModifiers } from "@/lib/map/modifierLayout";
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
	import { resolveFiltersetBadgeIconUrl } from "@/lib/map/render/modifierFeatures";
	import { watch } from "runed";

	type PreviewCenter = [number, number];

	let {
		filterset = undefined,
		majorCategory = undefined,
		subCategory = undefined,
		class: class_ = ""
	}: {
		filterset?: AnyFilterset;
		majorCategory?: FilterCategory;
		subCategory?: FilterCategory;
		class?: string;
	} = $props();

	const emptyFeatureCollection: FeatureCollection<Point> = {
		type: "FeatureCollection",
		features: []
	};

	let map: maplibre.Map | undefined = $state(undefined);

	let previewCenter = $derived.by(() => {
		const mainMap = getMap();
		if (mainMap) {
			const center = mainMap.getCenter();
			return [center.lng, center.lat] as PreviewCenter;
		}

		const center = getUserSettings().mapPosition.center;
		if (center) return [center.lng, center.lat] as PreviewCenter;

		return [getConfig().general.defaultLon, getConfig().general.defaultLat] as PreviewCenter;
	});

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

	let previewFeatures = $derived.by(() => {
		const badgeIconUrl = resolveFiltersetBadgeIconUrl(filterset?.icon);
		const pokemonIcon = getPokemonIconFromFilterset();

		let baseIconUrl: string | undefined;
		let baseImageSize: number | undefined;
		let baseImageOffset: number[] | undefined;
		let focusImageSize = 0.25;
		let focusImageOffset: number[] = [0, 0];
		let focusIconUrl: string | undefined;
		let overlayOnBase = false;

		if (subCategory === "raid" || (majorCategory === "gym" && !subCategory)) {
			const gymIconSet = getUiconSetDetails(getUserSettings().uiconSet.gym.id);
			const gymMod = getModifiers(gymIconSet, MapObjectType.GYM);
			const pokemonMod = getModifiers(gymIconSet, MapObjectType.POKEMON);
			const raidMod = getModifiers(gymIconSet, "raid_pokemon");

			baseIconUrl = getIcon(IconCategory.GYM, { team_id: 0 });
			baseImageSize = gymMod.scale;
			baseImageOffset = [gymMod.offsetX, gymMod.offsetY];
			focusImageSize = pokemonMod.scale * raidMod.scale;
			focusImageOffset = [gymMod.offsetX + raidMod.offsetX, gymMod.offsetY + raidMod.offsetY];
			overlayOnBase = true;

			const uicon = filterset?.icon?.uicon;
			focusIconUrl =
				uicon?.category === IconCategory.RAID
					? getIcon(IconCategory.RAID, uicon.params)
					: (pokemonIcon ?? getIconRaidEgg(5));
		} else if (subCategory === "quest" || (majorCategory === "pokestop" && !subCategory)) {
			const pokestopIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokestop.id);
			const pokestopMod = getModifiers(pokestopIconSet, MapObjectType.POKESTOP);
			const questMod = getModifiers(pokestopIconSet, "quest");

			baseIconUrl = getIcon(IconCategory.POKESTOP, {});
			baseImageSize = pokestopMod.scale;
			baseImageOffset = [pokestopMod.offsetX, pokestopMod.offsetY];
			focusImageSize = questMod.scale;
			focusImageOffset = [
				pokestopMod.offsetX + questMod.offsetX,
				pokestopMod.offsetY + questMod.offsetY
			];

			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.POKEMON || uicon?.category === IconCategory.ITEM) {
				focusIconUrl = getIcon(uicon.category, uicon.params);
			} else {
				const quest = filterset as FiltersetQuest | undefined;
				focusIconUrl =
					pokemonIcon ??
					(quest?.item?.length
						? getIcon(IconCategory.ITEM, { item: quest.item[0].id })
						: getIconPokemon({ pokemon_id: 25, form: 0 }));
			}
		} else if (subCategory === "invasion") {
			const pokestopIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokestop.id);
			const pokestopMod = getModifiers(pokestopIconSet, MapObjectType.POKESTOP);
			const invasionMod = getModifiers(pokestopIconSet, "invasion");

			baseIconUrl = getIcon(IconCategory.POKESTOP, {});
			baseImageSize = pokestopMod.scale;
			baseImageOffset = [pokestopMod.offsetX, pokestopMod.offsetY];
			focusImageSize = invasionMod.scale;
			focusImageOffset = [
				pokestopMod.offsetX + invasionMod.offsetX,
				pokestopMod.offsetY + invasionMod.offsetY
			];

			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.INVASION) {
				focusIconUrl = getIcon(IconCategory.INVASION, uicon.params);
			} else {
				const invasion = filterset as FiltersetInvasion | undefined;
				focusIconUrl = invasion?.characters?.length
					? getIcon(IconCategory.INVASION, {
							character: invasion.characters[0],
							confirmed: true
						})
					: getIcon(IconCategory.INVASION, { character: 4, confirmed: true });
			}
		} else if (subCategory === "maxBattle" || (majorCategory === "station" && !subCategory)) {
			const stationIconSet = getUiconSetDetails(getUserSettings().uiconSet.station.id);
			const stationMod = getModifiers(stationIconSet, MapObjectType.STATION);
			const maxBattleMod = getModifiers(stationIconSet, "max_battle");

			baseIconUrl = getIconStation(false);
			baseImageSize = stationMod.scale;
			baseImageOffset = [stationMod.offsetX, stationMod.offsetY];
			focusImageSize = maxBattleMod.scale;
			focusImageOffset = [
				stationMod.offsetX + maxBattleMod.offsetX,
				stationMod.offsetY + maxBattleMod.offsetY
			];
			overlayOnBase = true;

			focusIconUrl = pokemonIcon ?? getIconPokemon({ pokemon_id: 25, form: 0 });
		} else {
			const pokemonIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokemon.id);
			const pokemonMod = getModifiers(pokemonIconSet, MapObjectType.POKEMON);
			focusImageSize = pokemonMod.scale;
			focusImageOffset = [pokemonMod.offsetX, pokemonMod.offsetY];
			focusIconUrl = pokemonIcon ?? getIconPokemon({ pokemon_id: 25, form: 0 });
		}

		if (!focusIconUrl) return emptyFeatureCollection;

		return buildModifierPreviewFeatureCollection({
			center: previewCenter,
			focusIconUrl,
			focusBaseImageSize: focusImageSize,
			focusImageOffset,
			modifiers: filterset?.modifiers,
			badgeIconUrl,
			baseIconUrl,
			baseImageSize,
			baseImageOffset,
			overlayOnBase
		});
	});

	watch(
		() => [previewFeatures, map],
		() => {
			if (!map || !previewFeatures || !previewFeatures.features.length) return;
			ensureMapImages(
				map,
				previewFeatures.features.map(
					(feature) => (feature.properties as { imageUrl: string }).imageUrl
				)
			).then();
		}
	);
</script>

<div class="rounded-md border border-border overflow-hidden w-full h-40 {class_}">
	{#key getUserSettings().mapStyle.id}
		<MapLibre
			bind:map
			center={previewCenter}
			zoom={16}
			style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
			filterLayers={(layer) => layer.type !== "symbol" || layer.id.startsWith("modifierPreview")}
			class="size-full"
			attributionControl={false}
			interactive={false}
			zoomOnDoubleClick={false}
		>
			<GeoJSON id="modifierPreview" data={previewFeatures}>
				<MapObjectSymbolLayer
					id="modifierPreviewIcons"
					filter={["==", ["get", "type"], MapObjectFeatureType.ICON]}
				/>
			</GeoJSON>
		</MapLibre>
	{/key}
</div>
