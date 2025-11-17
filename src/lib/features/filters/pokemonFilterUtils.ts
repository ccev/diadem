import type { MinMax } from "@/lib/features/filters/filtersets";
import { makeAttributeRangeLabel } from "@/lib/features/filters/makeAttributeChipLabel";
import * as m from "@/lib/paraglide/messages";
import { getPokemonSize } from '@/lib/utils/pokemonUtils';

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
	)
}

export function getAttributeLabelCp(cp: MinMax | undefined) {
	return makeAttributeRangeLabel(cp, pokemonBounds.cp.min, pokemonBounds.cp.max)
}

export function getAttributeLabelLevel(level: MinMax | undefined) {
	return makeAttributeRangeLabel(level, pokemonBounds.level.min, pokemonBounds.level.max)
}

export function getAttributeLabelRank(rank: MinMax | undefined) {
	return m.rank_x({
		rank: makeAttributeRangeLabel(rank, pokemonBounds.rank.min, pokemonBounds.rank.max)
	})
}
