import type { FiltersetPokemon, FiltersetTitle, MinMax } from "@/lib/features/filters/filtersets";
import { makeAttributeRangeLabel } from "@/lib/features/filters/makeAttributeChipLabel";
import * as m from "@/lib/paraglide/messages";
import { getPokemonSize } from "@/lib/utils/pokemonUtils";
import { setFilterIcon } from "@/lib/features/filters/filtersetUtils";
import { IconCategory } from "@/lib/features/filters/icons";
import { League } from "@/lib/services/uicons.svelte";
import { mPokemon } from "@/lib/services/ingameLocale";

export const pokemonBounds = {
	ivProduct: {
		min: 0,
		max: 100
	},
	iv: {
		min: 0,
		max: 15
	},
	cp: {
		min: 0,
		max: 5000
	},
	level: {
		min: 0,
		max: 50
	},
	rank: {
		min: 1,
		max: 100
	},
	size: {
		min: 1,
		max: 5
	}
};

export function generatePokemonFilterDetails(filter: FiltersetPokemon) {
	const title: FiltersetTitle = {
		title: filter.title.title,
		message: "filter_template_pokemon_fallback"
	};

	const basePokemonMatch = filter?.pokemon?.every(
		(p) => p.pokemon_id === filter?.pokemon?.[0]?.pokemon_id
	) ?? false;

	// title

	let kind = "";
	let attributes: string[] = [];

	if (!filter.pokemon) {
		kind = m.pogo_pokemon();
	} else if (filter.pokemon.length === 1) {
		// todo properly localized pokemon names (when language changes)
		kind = mPokemon(filter.pokemon[0]);
	} else if (basePokemonMatch) {
		// base name if all pokemon ids are the same
		kind = mPokemon({ pokemon_id: filter.pokemon[0].pokemon_id });
	} else {
		kind = m.count_pokemon({ count: filter.pokemon.length });
	}

	if (filter.iv) {
		attributes.push(getAttributeLabelIvProduct(filter.iv))
	}
	if (filter.pvpRankLittle) {
		attributes.push(m.short_rank_little_league({
			rank: makeAttributeRangeLabel(filter.pvpRankLittle, pokemonBounds.rank.min, pokemonBounds.rank.max)
		}))
	}
	if (filter.pvpRankGreat) {
		attributes.push(m.short_rank_great_league({
			rank: makeAttributeRangeLabel(filter.pvpRankGreat, pokemonBounds.rank.min, pokemonBounds.rank.max)
		}))
	}
	if (filter.pvpRankUltra) {
		attributes.push(m.short_rank_ultra_league({
			rank: makeAttributeRangeLabel(filter.pvpRankUltra, pokemonBounds.rank.min, pokemonBounds.rank.max)
		}))
	}
	if (filter.ivAtk || filter.ivDef || filter.ivSta) {
		attributes.push(getAttributeLabelIvValues(filter.ivAtk, filter.ivDef, filter.ivSta))
	}
	if (filter.cp) {
		attributes.push(m.pogo_cp({ cp: getAttributeLabelCp(filter.cp) }))
	}
	if (filter.level) {
		attributes.push(m.pogo_level({ level: getAttributeLabelLevel(filter.level) }))
	}
	if (filter.size) {
		attributes.push(getAttributeLabelSize(filter.size))
	}

	let attrText = "";
	if (attributes.length > 0) {
		attrText = attributes.join(" & ") + " ";
	}

	if (attrText || kind !== m.pogo_pokemon()) {
		title.message = "filter_template_pokemon_template";
		title.params = { attributes: attrText, kind: kind };
	}

	// icons

	if (filter.pokemon && filter.pokemon.length === 1) {
		// prio: pokemon icon if only one species
		setFilterIcon(filter, { uicon: { category: IconCategory.POKEMON, params: filter.pokemon[0] } });
	} else if (
		(filter.iv?.min ?? 0) >= 98 ||
		(filter.ivAtk?.min ?? 0) + (filter.ivDef?.min ?? 0) + (filter.ivSta?.min ?? 0) >= 45
	) {
		// hundo icon
		setFilterIcon(filter, { emoji: "💯" });
	} else if (
		filter.iv?.max === 0 ||
		(filter.ivAtk?.max ?? 15) + (filter.ivDef?.max ?? 15) + (filter.ivSta?.max ?? 15) === 0
	) {
		// nundo icon
		setFilterIcon(filter, { emoji: "🗑️" });
	} else if (
		(filter.iv?.min ?? 0) >= 85 ||
		(filter.ivAtk?.min ?? 0) + (filter.ivDef?.min ?? 0) + (filter.ivSta?.min ?? 0) >= 38
	) {
		// ultra ball for 85%+
		setFilterIcon(filter, {
			uicon: { category: IconCategory.ITEM, params: { item: 3 } }
		});
	} else if (
		(filter.iv?.min ?? 0) >= 50 ||
		(filter.ivAtk?.min ?? 0) + (filter.ivDef?.min ?? 0) + (filter.ivSta?.min ?? 0) >= 22
	) {
		// great ball for 50%+
		setFilterIcon(filter, {
			uicon: { category: IconCategory.ITEM, params: { item: 2 } }
		});
	} else if (filter.pvpRankLittle) {
		// league icons if any value is set
		setFilterIcon(filter, {
			uicon: { category: IconCategory.LEAGUE, params: { league: League.LITTLE } }
		});
	} else if (filter.pvpRankGreat) {
		setFilterIcon(filter, {
			uicon: { category: IconCategory.LEAGUE, params: { league: League.GREAT } }
		});
	} else if (filter.pvpRankUltra) {
		setFilterIcon(filter, {
			uicon: { category: IconCategory.LEAGUE, params: { league: League.ULTRA } }
		});
	} else if (filter.size) {
		// size icons
		if (filter.size.min > 3) {
			setFilterIcon(filter, { emoji: "🐘" });
		} else if (filter.size.max < 3) {
			setFilterIcon(filter, { emoji: "🤏" });
		} else {
			setFilterIcon(filter, { emoji: "📏" });
		}
	} else if (basePokemonMatch && filter.pokemon) {
		setFilterIcon(filter, { uicon: { category: IconCategory.POKEMON, params: { pokemon_id: filter.pokemon[0].pokemon_id } } });
	} else if (filter.pokemon && filter.pokemon.length > 1) {
		// if nothing better applies, just show the first pokemon of the list
		setFilterIcon(filter, { uicon: { category: IconCategory.POKEMON, params: filter.pokemon[0] } });
	} else {
		setFilterIcon(filter, {
			uicon: { category: IconCategory.ITEM, params: { item: 1 } }
		});
	}

	filter.title = title;
}

export function getAttributeLabelIvProduct(iv: MinMax) {
	return makeAttributeRangeLabel(
		iv,
		pokemonBounds.ivProduct.min,
		pokemonBounds.ivProduct.max,
		m.x_percentage({ x: iv?.min ?? pokemonBounds.ivProduct.min }),
		m.x_percentage({ x: iv?.max ?? pokemonBounds.ivProduct.max })
	);
}

export function getAttributeLabelIvValues(
	ivAtk: MinMax | undefined,
	ivDef: MinMax | undefined,
	ivSta: MinMax | undefined
) {
	return makeAttributeRangeLabel(
		{
			min:
				(ivAtk?.min ?? pokemonBounds.iv.min) +
				(ivDef?.min ?? pokemonBounds.iv.min) +
				(ivSta?.min ?? pokemonBounds.iv.min),
			max:
				(ivAtk?.max ?? pokemonBounds.iv.max) +
				(ivDef?.max ?? pokemonBounds.iv.max) +
				(ivSta?.max ?? pokemonBounds.iv.max)
		},
		pokemonBounds.iv.min * 3,
		pokemonBounds.iv.max * 3,
		m.atk_def_sta({
			atk: ivAtk?.min ?? pokemonBounds.iv.min,
			def: ivDef?.min ?? pokemonBounds.iv.min,
			sta: ivSta?.min ?? pokemonBounds.iv.min
		}),
		m.atk_def_sta({
			atk: ivAtk?.max ?? pokemonBounds.iv.max,
			def: ivDef?.max ?? pokemonBounds.iv.max,
			sta: ivSta?.max ?? pokemonBounds.iv.max
		})
	);
}

export function getAttributeLabelSize(size: MinMax | undefined) {
	return makeAttributeRangeLabel(
		size,
		pokemonBounds.size.min,
		pokemonBounds.size.max,
		getPokemonSize(size?.min ?? pokemonBounds.size.min),
		getPokemonSize(size?.max ?? pokemonBounds.size.max)
	);
}

export function getAttributeLabelCp(cp: MinMax | undefined) {
	return makeAttributeRangeLabel(cp, pokemonBounds.cp.min, pokemonBounds.cp.max);
}

export function getAttributeLabelLevel(level: MinMax | undefined) {
	return makeAttributeRangeLabel(level, pokemonBounds.level.min, pokemonBounds.level.max);
}

export function getAttributeLabelRank(rank: MinMax | undefined) {
	return m.rank_x({
		rank: makeAttributeRangeLabel(rank, pokemonBounds.rank.min, pokemonBounds.rank.max)
	});
}
