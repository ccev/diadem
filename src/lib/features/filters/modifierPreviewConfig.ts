import type {
	AnyFilterset,
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import type { FilterCategory } from "@/lib/features/filters/filters";
import { getIcon, IconCategory } from "@/lib/features/filters/icons";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getIconPokemon, getIconRaidEgg, getIconStation } from "@/lib/services/uicons.svelte";

export type PreviewConfig = {
	type: MapObjectType;
	focusIconUrl: string;
	baseIconUrl?: string;
	overlayOnBase?: boolean;
	focusModifierType?: string;
};

function getPokemonIconFromFilterset(filterset: AnyFilterset | undefined): string | undefined {
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

export function getModifierPreviewConfig(
	filterset: AnyFilterset | undefined,
	majorCategory: FilterCategory | undefined,
	subCategory: FilterCategory | undefined
): PreviewConfig {
	const pokemonIcon = getPokemonIconFromFilterset(filterset);
	const defaultPokemon = getIconPokemon({ pokemon_id: 25, form: 0 });

	if (subCategory === "raid" || (majorCategory === "gym" && !subCategory)) {
		const uicon = filterset?.icon?.uicon;
		return {
			type: MapObjectType.GYM,
			focusIconUrl:
				uicon?.category === IconCategory.RAID
					? getIcon(IconCategory.RAID, uicon.params)
					: (pokemonIcon ?? getIconRaidEgg(5)),
			baseIconUrl: getIcon(IconCategory.GYM, { team_id: 0 }),
			overlayOnBase: true,
			focusModifierType: "raid_pokemon"
		};
	}

	if (subCategory === "quest" || (majorCategory === "pokestop" && !subCategory)) {
		const uicon = filterset?.icon?.uicon;
		let focusIconUrl: string;
		if (uicon?.category === IconCategory.POKEMON || uicon?.category === IconCategory.ITEM) {
			focusIconUrl = getIcon(uicon.category, uicon.params);
		} else {
			const quest = filterset as FiltersetQuest | undefined;
			focusIconUrl =
				pokemonIcon ??
				(quest?.item?.length
					? getIcon(IconCategory.ITEM, { item: quest.item[0].id })
					: defaultPokemon);
		}
		return {
			type: MapObjectType.POKESTOP,
			focusIconUrl,
			baseIconUrl: getIcon(IconCategory.POKESTOP, {}),
			focusModifierType: "quest"
		};
	}

	if (subCategory === "invasion") {
		const uicon = filterset?.icon?.uicon;
		let focusIconUrl: string;
		if (uicon?.category === IconCategory.INVASION) {
			focusIconUrl = getIcon(IconCategory.INVASION, uicon.params);
		} else {
			const invasion = filterset as FiltersetInvasion | undefined;
			focusIconUrl = invasion?.characters?.length
				? getIcon(IconCategory.INVASION, { character: invasion.characters[0], confirmed: true })
				: getIcon(IconCategory.INVASION, { character: 4, confirmed: true });
		}
		return {
			type: MapObjectType.POKESTOP,
			focusIconUrl,
			baseIconUrl: getIcon(IconCategory.POKESTOP, {}),
			focusModifierType: "invasion"
		};
	}

	if (subCategory === "maxBattle" || (majorCategory === "station" && !subCategory)) {
		return {
			type: MapObjectType.STATION,
			focusIconUrl: pokemonIcon ?? defaultPokemon,
			baseIconUrl: getIconStation(false),
			overlayOnBase: true,
			focusModifierType: "max_battle"
		};
	}

	return {
		type: MapObjectType.POKEMON,
		focusIconUrl: pokemonIcon ?? defaultPokemon
	};
}
