import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { FiltersetModifiers } from "@/lib/features/filters/filtersets";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { isFeatureIcon, type MapObjectFeature } from "./featureBuilders";
import { getFiltersetModifierStateKey } from "./modifierFeatures";
import type { RenderContext, RenderResult } from "./renderTypes";

function getPokemonFeatureStateKey(
	data: PokemonData,
	filtersetModifiers: FiltersetModifiers | undefined
) {
	return [data.expire_timestamp ?? "", getFiltersetModifierStateKey(filtersetModifiers)].join("|");
}

function getRenderedPokemonFeatureStateKey(
	existingFeatures: { [key: string]: MapObjectFeature[] },
	mapId: string
) {
	const pokemonFeatures = existingFeatures[mapId] ?? [];

	for (const feature of pokemonFeatures) {
		if (!isFeatureIcon(feature)) continue;
		if (feature.properties.renderStateKey !== undefined) {
			return feature.properties.renderStateKey;
		}
	}

	return "";
}

export function shouldRegeneratePokemonFeatures(
	data: PokemonData,
	filtersetModifiers: FiltersetModifiers | undefined,
	existingFeatures: { [key: string]: MapObjectFeature[] }
) {
	if (!existingFeatures[data.mapId]) return true;
	return (
		getRenderedPokemonFeatureStateKey(existingFeatures, data.mapId) !==
		getPokemonFeatureStateKey(data, filtersetModifiers)
	);
}

export function renderPokemon(
	obj: PokemonData,
	ctx: RenderContext,
	iconFiltersetModifiers: FiltersetModifiers | undefined
): RenderResult | null {
	if (obj.expire_timestamp && obj.expire_timestamp < ctx.timestamp) return null;

	return {
		subFeatures: [],
		showThis: true,
		expires: obj.expire_timestamp,
		iconFiltersetModifiers,
		pokemonRenderStateKey: getPokemonFeatureStateKey(obj, iconFiltersetModifiers)
	};
}
