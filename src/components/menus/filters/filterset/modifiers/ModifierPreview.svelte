<script lang="ts">
	import type {
		AnyFilterset,
		FiltersetInvasion,
		FiltersetMaxBattle,
		FiltersetQuest,
		FiltersetRaid
	} from "@/lib/features/filters/filtersets";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import { getIcon, IconCategory } from "@/lib/features/filters/icons";
	import { ensureMapImages } from "@/lib/map/render/images";
	import { getMap } from "@/lib/map/map.svelte";
	import { getConfigModifiers, getRenderer } from "@/lib/map/render/renderMapObjects";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import {
		type MapObjectFeature,
		type MapObjectIconFeature,
		FeatureTypes,
		getIconFeature,
		isFeatureIcon
	} from "@/lib/map/render/featureTypes";
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
	import maplibre from "maplibre-gl";
	import { GeoJSON, MapLibre } from "svelte-maplibre";
	import { watch } from "runed";
	import { center } from "@turf/turf";
	import MapObjectIconLayer from "@/components/map/MapObjectIconLayer.svelte";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
	import type { GymData } from "@/lib/types/mapObjectData/gym";
	import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
	import type { StationData } from "@/lib/types/mapObjectData/station";
	import { untrack } from "svelte";

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

	const PREVIEW_MAP_ID = "preview";
	let bindMap: maplibre.Map | undefined = $state(undefined);

	function getPreviewCenter(): [number, number] {
		const mainMap = getMap();
		if (mainMap) {
			const center = mainMap.getCenter();
			return [center.lng, center.lat];
		}

		const center = getUserSettings().mapPosition.center;
		if (center) return [center.lng, center.lat];

		return [getConfig().general.defaultLon ?? 0, getConfig().general.defaultLat ?? 0];
	}

	function getPokemonIconFromFilterset(): string | undefined {
		if (!filterset) return undefined;
		if (filterset.icon?.uicon?.category === IconCategory.POKEMON) {
			return getIcon(IconCategory.POKEMON, filterset.icon.uicon.params);
		}
		if ("pokemon" in filterset && filterset.pokemon?.length) {
			return getIconPokemon(filterset.pokemon[0]);
		}
		if ("bosses" in filterset && (filterset as FiltersetRaid | FiltersetMaxBattle).bosses?.length) {
			return getIconPokemon((filterset as FiltersetRaid | FiltersetMaxBattle).bosses![0]);
		}
		return undefined;
	}

	function getFocusIconUrl(): string {
		const pokemonIcon = getPokemonIconFromFilterset();

		if (subCategory === "raid" || (majorCategory === "gym" && !subCategory)) {
			const uicon = filterset?.icon?.uicon;
			return uicon?.category === IconCategory.RAID
				? getIcon(IconCategory.RAID, uicon.params)
				: (pokemonIcon ?? getIconRaidEgg(5));
		}

		if (subCategory === "quest" || (majorCategory === "pokestop" && !subCategory)) {
			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.POKEMON || uicon?.category === IconCategory.ITEM) {
				return getIcon(uicon.category, uicon.params);
			}
			const quest = filterset as FiltersetQuest | undefined;
			return (
				pokemonIcon ??
				(quest?.item?.length
					? getIcon(IconCategory.ITEM, { item: quest.item[0].id })
					: getIconPokemon({ pokemon_id: 25, form: 0 }))
			);
		}

		if (subCategory === "invasion") {
			const uicon = filterset?.icon?.uicon;
			if (uicon?.category === IconCategory.INVASION) {
				return getIcon(IconCategory.INVASION, uicon.params);
			}
			const invasion = filterset as FiltersetInvasion | undefined;
			return invasion?.characters?.length
				? getIcon(IconCategory.INVASION, { character: invasion.characters[0], confirmed: true })
				: getIcon(IconCategory.INVASION, { character: 4, confirmed: true });
		}

		if (subCategory === "maxBattle" || (majorCategory === "station" && !subCategory)) {
			return pokemonIcon ?? getIconPokemon({ pokemon_id: 25, form: 0 });
		}

		return pokemonIcon ?? getIconPokemon({ pokemon_id: 25, form: 0 });
	}

	function getBaseConfig():
		| {
				type: MapObjectType;
				baseIconUrl?: string;
				overlayOnBase?: boolean;
				focusModifierType?: string;
		  }
		| undefined {
		if (subCategory === "raid" || (majorCategory === "gym" && !subCategory)) {
			return {
				type: MapObjectType.GYM,
				baseIconUrl: getIcon(IconCategory.GYM, { team_id: 0 }),
				overlayOnBase: true,
				focusModifierType: "raid_pokemon"
			};
		}
		if (subCategory === "quest" || (majorCategory === "pokestop" && !subCategory)) {
			return {
				type: MapObjectType.POKESTOP,
				baseIconUrl: getIcon(IconCategory.POKESTOP, {}),
				focusModifierType: "quest"
			};
		}
		if (subCategory === "invasion") {
			return {
				type: MapObjectType.POKESTOP,
				baseIconUrl: getIcon(IconCategory.POKESTOP, {}),
				focusModifierType: "invasion"
			};
		}
		if (subCategory === "maxBattle" || (majorCategory === "station" && !subCategory)) {
			return {
				type: MapObjectType.STATION,
				baseIconUrl: getIconStation(false),
				overlayOnBase: true,
				focusModifierType: "max_battle"
			};
		}
		return { type: MapObjectType.POKEMON };
	}

	function makePreviewData(map: maplibre.Map) {
		const previewCenter = getPreviewCenter();
		const focusIconUrl = getFocusIconUrl();
		const config = getBaseConfig();
		if (!config) return;

		const uiconKey = config.type as "pokemon" | "pokestop" | "gym" | "station" | "tappable";
		const iconSet = getUiconSetDetails(getUserSettings().uiconSet[uiconKey]?.id);
		const baseMod = getConfigModifiers(iconSet, config.type);

		// Build focus icon props
		let focusImageSize = baseMod.scale;
		let focusOffset = [baseMod.offsetX, baseMod.offsetY] as [number, number];

		if (config.focusModifierType) {
			const focusMod = getConfigModifiers(iconSet, config.focusModifierType as any);
			if (config.focusModifierType === "raid_pokemon") {
				const pokemonMod = getConfigModifiers(iconSet, MapObjectType.POKEMON);
				focusImageSize = pokemonMod.scale * focusMod.scale;
			} else {
				focusImageSize = focusMod.scale;
			}
			focusOffset = [baseMod.offsetX + focusMod.offsetX, baseMod.offsetY + focusMod.offsetY];
		}

		// Use renderer to build focus icon with modifiers (badge, underlay, rotation, label)
		const renderer = getRenderer(config.type);
		const fakeData = {
			mapId: PREVIEW_MAP_ID,
			lat: previewCenter[1],
			lon: previewCenter[0],
			type: config.type
		} as any;

		// Override basic props for the focus icon
		const focusProps = {
			imageUrl: focusIconUrl,
			id: PREVIEW_MAP_ID,
			imageSize: focusImageSize,
			selectedScale: 1,
			imageOffset: focusOffset,
			expires: null
		};

		const features: MapObjectFeature[] = renderer.renderVisualModifiers(
			fakeData,
			PREVIEW_MAP_ID,
			filterset,
			focusProps
		);

		// Add base icon underneath if needed
		if (config.baseIconUrl) {
			features.push(
				getIconFeature(`${PREVIEW_MAP_ID}-base`, previewCenter, {
					id: PREVIEW_MAP_ID,
					imageUrl: config.baseIconUrl,
					imageSize: baseMod.scale,
					selectedScale: 1,
					imageOffset: [baseMod.offsetX, baseMod.offsetY],
					expires: null
				})
			);
		}

		// Shift center to account for icon offset
		let center = previewCenter;
		const baseOffset = config.baseIconUrl ? [baseMod.offsetX, baseMod.offsetY] : focusOffset;
		if (map && (baseOffset[0] !== 0 || baseOffset[1] !== 0)) {
			try {
				const projected = map.project({ lng: previewCenter[0], lat: previewCenter[1] });
				projected.x += baseOffset[0] / 2;
				projected.y += baseOffset[1] / 2;
				const shifted = map.unproject(projected);
				center = [shifted.lng, shifted.lat];
			} catch {
				center = previewCenter;
			}
		}

		return {
			center,
			features: {
				type: "FeatureCollection" as const,
				features: features.filter((f) => isFeatureIcon(f)) as MapObjectIconFeature[]
			}
		};
	}

	async function updatePreviewMap(map: maplibre.Map) {
		const previewData = makePreviewData(map);
		if (!previewData) return;

		map.setCenter(previewData.center);

		await ensureMapImages(
			map,
			previewData.features.features.map((feature) => feature.properties)
		);
		const source = map.getSource<maplibre.GeoJSONSource>("modifierPreview");
		source?.setData(previewData.features);
	}

	$effect(async () => {
		// filterset state seems a bit messy, doesn't update with just filterset or filterset.modifiers
		if (!bindMap) return;
		filterset?.modifiers?.glow;
		filterset?.modifiers?.scale;
		filterset?.modifiers?.rotation;
		filterset?.modifiers?.background;
		filterset?.modifiers?.showBadge;
		filterset?.modifiers?.showLabel;
		untrack(async () => {
			if (!bindMap) return;
			await updatePreviewMap(bindMap);
		});
	});
</script>

<div class="rounded-md border border-border overflow-hidden w-full h-40 {class_}">
	<MapLibre
		bind:map={bindMap}
		center={[0, 0]}
		zoom={16}
		style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
		class="size-full"
		attributionControl={false}
		interactive={false}
		zoomOnDoubleClick={false}
		onload={updatePreviewMap}
	>
		<GeoJSON id="modifierPreview" data={{ type: "FeatureCollection", features: [] }}>
			<MapObjectIconLayer
				id="modifierPreviewIcons"
				filter={["==", ["get", "type"], FeatureTypes.ICON]}
			/>
		</GeoJSON>
	</MapLibre>
</div>
