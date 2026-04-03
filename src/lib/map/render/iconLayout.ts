import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getUiconSetDetails } from "@/lib/services/uicons.svelte";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { getCompositeLayout, getModifiers } from "@/lib/map/modifierLayout";

export type PreviewCategory = "pokemon" | "raid" | "quest" | "invasion" | "maxBattle";

type LayoutResult = {
	baseImageSize?: number;
	baseImageOffset?: number[];
	focusImageSize: number;
	focusImageOffset: number[];
};

export function getLayoutForCategory(category: PreviewCategory): LayoutResult {
	if (category === "raid") {
		const gymIconSet = getUiconSetDetails(getUserSettings().uiconSet.gym.id);
		const baseMod = getModifiers(gymIconSet, MapObjectType.GYM);
		const pokemonMod = getModifiers(gymIconSet, MapObjectType.POKEMON);
		const raidMod = getModifiers(gymIconSet, "raid_pokemon");

		return getCompositeLayout(baseMod, raidMod, {
			focusImageSize: pokemonMod.scale * raidMod.scale
		});
	}

	if (category === "quest") {
		const pokestopIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokestop.id);
		const baseMod = getModifiers(pokestopIconSet, MapObjectType.POKESTOP);
		const questMod = getModifiers(pokestopIconSet, "quest");

		return getCompositeLayout(baseMod, questMod);
	}

	if (category === "invasion") {
		const pokestopIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokestop.id);
		const baseMod = getModifiers(pokestopIconSet, MapObjectType.POKESTOP);
		const invasionMod = getModifiers(pokestopIconSet, "invasion");

		return getCompositeLayout(baseMod, invasionMod);
	}

	if (category === "maxBattle") {
		const stationIconSet = getUiconSetDetails(getUserSettings().uiconSet.station.id);
		const baseMod = getModifiers(stationIconSet, MapObjectType.STATION);
		const maxBattleMod = getModifiers(stationIconSet, "max_battle");

		return getCompositeLayout(baseMod, maxBattleMod);
	}

	const pokemonIconSet = getUiconSetDetails(getUserSettings().uiconSet.pokemon.id);
	const pokemonMod = getModifiers(pokemonIconSet, MapObjectType.POKEMON);

	return {
		focusImageSize: pokemonMod.scale,
		focusImageOffset: [pokemonMod.offsetX, pokemonMod.offsetY]
	};
}
