<script lang="ts">
	import MapObjectIconLayer from "@/components/map/MapObjectIconLayer.svelte";
	import ModifierBadgeLayer from "@/components/map/ModifierBadgeLayer.svelte";
	import ModifierUnderlayLayer from "@/components/map/ModifierUnderlayLayer.svelte";
	import type { AnyFilterset, FiltersetModifiers } from "@/lib/features/filters/filtersets";
	import { getIcon, IconCategory } from "@/lib/features/filters/icons";
	import { ensureMapImages } from "@/lib/map/images";
	import { getMap } from "@/lib/map/map.svelte";
	import { getEmojiImageUrl } from "@/lib/map/modifierOverlayIcons";
	import {
		buildModifierPreviewFeatureCollection,
		type ModifierPreviewFeatureProperties
	} from "@/lib/map/modifierPreviewFeatures";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { resize } from "@/lib/services/assets";
	import { getConfig } from "@/lib/services/config/config";
	import { getDefaultMapStyle } from "@/lib/services/themeMode";
	import { getIconPokemon, getUiconSetDetails } from "@/lib/services/uicons.svelte";
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
		compact = false,
		class: class_ = ""
	}: {
		modifiers?: FiltersetModifiers;
		iconUrl?: string;
		filterset?: AnyFilterset;
		compact?: boolean;
		class?: string;
	} = $props();

	let badgeIconUrl = $derived.by(() => {
		if (!filterset?.icon) return undefined;
		if (filterset.icon.uicon) {
			return resize(getIcon(filterset.icon.uicon.category, filterset.icon.uicon.params), {
				width: 64
			});
		}
		if (filterset.icon.emoji) return getEmojiImageUrl(filterset.icon.emoji);
		return undefined;
	});

	const emptyFeatureCollection: FeatureCollection<Point, ModifierPreviewFeatureProperties> = {
		type: "FeatureCollection",
		features: []
	};

	let map: maplibre.Map | undefined = $state(undefined);

	function getPokemonPreviewLayout() {
		const iconSet = getUiconSetDetails(getUserSettings().uiconSet.pokemon.id);
		const baseModifier = iconSet?.base;
		const pokemonModifier = iconSet?.[MapObjectType.POKEMON];

		let imageSize = 0.25;
		let offsetX = 0;
		let offsetY = 0;

		if (pokemonModifier && typeof pokemonModifier === "object") {
			imageSize = pokemonModifier.scale ?? baseModifier?.scale ?? imageSize;
			offsetX = pokemonModifier.offsetX ?? baseModifier?.offsetX ?? offsetX;
			offsetY = pokemonModifier.offsetY ?? baseModifier?.offsetY ?? offsetY;
		}

		return {
			imageSize,
			imageOffset: [offsetX, offsetY]
		};
	}

	async function syncPreviewImages() {
		if (!map) return;
		await ensureMapImages(
			map,
			previewFeatures.features.map((feature) => feature.properties.imageUrl)
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

	let pokemonLayout = $derived(getPokemonPreviewLayout());
	let focusIconUrl = $derived.by(() => {
		let url: string;
		if (filterset?.icon?.uicon?.category === IconCategory.POKEMON) {
			url = getIcon(IconCategory.POKEMON, filterset.icon.uicon.params);
		} else if (iconUrl) {
			url = iconUrl;
		} else {
			url = getIconPokemon({ pokemon_id: 25, form: 0 });
		}
		return resize(url, { width: 64 });
	});
	let previewFeatures = $derived.by(() => {
		if (!focusIconUrl) return emptyFeatureCollection;

		return buildModifierPreviewFeatureCollection({
			center: previewCenter,
			focusIconUrl,
			focusBaseImageSize: pokemonLayout.imageSize,
			focusImageOffset: pokemonLayout.imageOffset,
			modifiers,
			badgeIconUrl
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
				<ModifierBadgeLayer id="modifierPreviewBadge" filter={["==", ["get", "layer"], "badge"]} />
				<MapObjectIconLayer
					id="modifierPreviewIcons"
					beforeId="modifierPreviewBadge"
					filter={["==", ["get", "layer"], "icon"]}
				/>
				<ModifierUnderlayLayer
					id="modifierPreviewUnderlay"
					beforeId="modifierPreviewIcons"
					filter={["==", ["get", "layer"], "underlay"]}
				/>
			</GeoJSON>
		</MapLibre>
	{/key}
</div>
