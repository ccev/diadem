<script lang="ts">
	import { GeoJSON, MapLibre, SymbolLayer } from "svelte-maplibre";
	import type { AnyFilterset, FiltersetModifiers } from "@/lib/features/filters/filtersets";
	import type maplibre from "maplibre-gl";
	import { ensureMapImages } from "@/lib/map/images";
	import {
		buildModifierPreviewFeatureCollection,
		type ModifierPreviewFeatureProperties
	} from "@/lib/map/modifierPreviewFeatures";
	import { getMap } from "@/lib/map/map.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getIconPokemon, getUiconSetDetails } from "@/lib/services/uicons.svelte";
	import { getMapStyle, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { getIcon, IconCategory } from "@/lib/features/filters/icons";
	import { getEmojiImageUrl } from "@/lib/map/modifierOverlayIcons";
	import { resize } from "@/lib/services/assets";
	import type { FeatureCollection, Point } from "geojson";

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

	const previewZoom = 16;
	const companionPokemon = [
		{ pokemon_id: 1, form: 0 },
		{ pokemon_id: 4, form: 0 },
		{ pokemon_id: 7, form: 0 }
	] as const;

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

	let previewStyle = $derived(getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id)));

	let companionLayout = $derived(getPokemonPreviewLayout());
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
	let companionIconUrls = $derived(
		companionPokemon.map((pokemon) =>
			resize(getIconPokemon({ pokemon_id: pokemon.pokemon_id, form: pokemon.form }), { width: 64 })
		)
	);

	let previewFeatures = $derived.by(() => {
		if (!focusIconUrl) return emptyFeatureCollection;

		return buildModifierPreviewFeatureCollection({
			center: previewCenter,
			focusIconUrl,
			focusBaseImageSize: companionLayout.imageSize,
			focusImageOffset: companionLayout.imageOffset,
			modifiers,
			badgeIconUrl,
			companionIconUrls,
			companionImageSize: companionLayout.imageSize,
			companionImageOffset: companionLayout.imageOffset
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
			center={previewCenter}
			zoom={previewZoom}
			style={previewStyle}
			filterLayers={(layer) => layer.type !== "symbol" || layer.id.startsWith("modifierPreview")}
			class="size-full"
			attributionControl={false}
			interactive={false}
			zoomOnDoubleClick={false}
			onload={onMapLoad}
		>
			<GeoJSON id="modifierPreview" data={previewFeatures}>
				<SymbolLayer
					id="modifierPreviewUnderlay"
					interactive={false}
					filter={["==", ["get", "layer"], "underlay"]}
					layout={{
						"icon-image": ["get", "imageUrl"],
						"icon-overlap": "always",
						"icon-size": ["*", ["get", "imageSize"], getUserSettings().mapIconSize],
						"icon-allow-overlap": true,
						"icon-offset": ["get", "imageOffset"]
					}}
				/>
				<SymbolLayer
					id="modifierPreviewIcons"
					interactive={false}
					filter={["==", ["get", "layer"], "icon"]}
					layout={{
						"icon-image": ["get", "imageUrl"],
						"icon-overlap": "always",
						"icon-size": ["*", ["get", "imageSize"], getUserSettings().mapIconSize],
						"icon-allow-overlap": true,
						"icon-offset": ["get", "imageOffset"],
						"icon-rotate": ["coalesce", ["get", "imageRotation"], 0],
						"text-field": ["coalesce", ["get", "textLabel"], ""],
						"text-anchor": "top",
						"text-offset": [0, 2.2],
						"text-size": 11,
						"text-allow-overlap": true,
						"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"]
					}}
					paint={{
						"text-color": "#ffffff",
						"text-halo-color": "#000000",
						"text-halo-width": 1.5
					}}
				/>
				<SymbolLayer
					id="modifierPreviewBadge"
					interactive={false}
					filter={["==", ["get", "layer"], "badge"]}
					layout={{
						"icon-image": ["get", "imageUrl"],
						"icon-overlap": "always",
						"icon-size": ["*", ["get", "imageSize"], getUserSettings().mapIconSize],
						"icon-allow-overlap": true,
						"icon-offset": ["get", "imageOffset"]
					}}
				/>
			</GeoJSON>
		</MapLibre>
	{/key}
</div>
