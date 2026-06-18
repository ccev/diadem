import type {
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetPokemon,
	FiltersetQuest,
	FiltersetRaid,
	MinMax
} from "@/lib/features/filters/filtersets";
import type {
	MatchableInvasion,
	MatchableMaxBattle,
	MatchablePokemon,
	MatchableQuest,
	MatchableRaid
} from "./types";

/**
 * RewardType numeric values, mirrored from `@/lib/utils/pokestopUtils`. That
 * module pulls in client-only `.svelte` state, so it cannot be imported here.
 */
const RewardType = {
	XP: 1,
	ITEM: 2,
	STARDUST: 3,
	CANDY: 4,
	POKEMON: 7,
	XL_CANDY: 9,
	MEGA_ENERGY: 12
} as const;

function inRange(value: number | null | undefined, range: MinMax): boolean {
	if (value == null) return false;
	return value >= range.min && value <= range.max;
}

// ----- pokemon -----

/** True if the rule constrains on IV-derived data (gates POKEMON_IV permission). */
export function ruleUsesIv(f: FiltersetPokemon): boolean {
	return Boolean(f.iv || f.cp || f.level || f.size || f.ivAtk || f.ivDef || f.ivSta);
}

/**
 * Mirror of matchPokemonFilterset. PVP rank fields are ignored (no PVP data in
 * push), so a filterset whose only constraint is a PVP rank matches by species.
 */
export function matchPokemonRule(
	p: MatchablePokemon,
	rules: FiltersetPokemon[]
): FiltersetPokemon | undefined {
	for (const filterset of rules) {
		if (!filterset.enabled) continue;

		if (
			filterset.pokemon &&
			!filterset.pokemon.find((s) => s.pokemon_id === p.pokemonId && s.form === p.form)
		) {
			continue;
		}

		if (filterset.iv && !inRange(p.iv, filterset.iv)) continue;
		if (filterset.cp && !inRange(p.cp, filterset.cp)) continue;
		if (filterset.ivAtk && !inRange(p.atkIv, filterset.ivAtk)) continue;
		if (filterset.ivDef && !inRange(p.defIv, filterset.ivDef)) continue;
		if (filterset.ivSta && !inRange(p.staIv, filterset.ivSta)) continue;
		if (filterset.level && !inRange(p.level, filterset.level)) continue;
		if (filterset.size && !inRange(p.size, filterset.size)) continue;

		if (filterset.gender && p.gender != null && !filterset.gender.includes(p.gender)) continue;

		// pvpRank* fields intentionally ignored (no PVP data in push).

		return filterset;
	}
	return undefined;
}

// ----- raid -----

/** Mirror of matchRaidFilterset, using isEgg = pokemonId === 0. */
export function matchRaidRule(
	r: MatchableRaid,
	rules: FiltersetRaid[]
): FiltersetRaid | undefined {
	const isEgg = r.pokemonId === 0;

	for (const filter of rules) {
		if (!filter.enabled) continue;

		if (filter.show) {
			if (filter.show.includes("egg") && !isEgg) continue;
			if (filter.show.includes("boss") && isEgg) continue;

			if (!filter.levels && !filter.bosses) {
				if (filter.show.includes("egg") && isEgg) return filter;
				if (filter.show.includes("boss") && !isEgg) return filter;
			}
		}

		if (filter.levels?.includes(r.level)) return filter;

		for (const boss of filter.bosses ?? []) {
			if (
				boss.pokemon_id === r.pokemonId &&
				(!boss.form || boss.form === r.form) &&
				(boss.temp_evolution_id === undefined || boss.temp_evolution_id === r.tempEvolutionId)
			) {
				return filter;
			}
		}
	}
	return undefined;
}

// ----- quest -----

/** Mirror of matchQuestFilterset. */
export function matchQuestRule(
	q: MatchableQuest,
	rules: FiltersetQuest[]
): FiltersetQuest | undefined {
	for (const questFilter of rules) {
		if (!questFilter.enabled) continue;

		if (
			questFilter.tasks &&
			!questFilter.tasks.find((t) => t.title === q.title && t.target === q.target)
		) {
			continue;
		}

		const hasRewardFilter = !!(
			questFilter.stardust ||
			questFilter.xp ||
			questFilter.pokemon ||
			questFilter.item ||
			questFilter.megaResource ||
			questFilter.candy ||
			questFilter.xlCandy
		);

		if (!hasRewardFilter) {
			return questFilter;
		}

		const info = q.reward;
		const amount = info.amount ?? 0;

		if (
			questFilter.stardust &&
			q.rewardType === RewardType.STARDUST &&
			amount >= questFilter.stardust.min &&
			amount <= questFilter.stardust.max
		) {
			return questFilter;
		}

		if (
			questFilter.xp &&
			q.rewardType === RewardType.XP &&
			amount >= questFilter.xp.min &&
			amount <= questFilter.xp.max
		) {
			return questFilter;
		}

		if (questFilter.pokemon && q.rewardType === RewardType.POKEMON) {
			if (questFilter.pokemon.find((p) => p.pokemon_id === info.pokemonId && p.form === info.form)) {
				return questFilter;
			}
		}

		if (questFilter.item && q.rewardType === RewardType.ITEM) {
			if (
				questFilter.item.find(
					(i) =>
						i.id === String(info.itemId) && (i.amount === undefined || i.amount === info.amount)
				)
			) {
				return questFilter;
			}
		}

		if (questFilter.megaResource && q.rewardType === RewardType.MEGA_ENERGY) {
			if (
				questFilter.megaResource.find(
					(i) =>
						i.id === String(info.pokemonId) && (i.amount === undefined || i.amount === info.amount)
				)
			) {
				return questFilter;
			}
		}

		if (questFilter.candy && q.rewardType === RewardType.CANDY) {
			if (
				questFilter.candy.find(
					(i) =>
						i.id === String(info.pokemonId) && (i.amount === undefined || i.amount === info.amount)
				)
			) {
				return questFilter;
			}
		}

		if (questFilter.xlCandy && q.rewardType === RewardType.XL_CANDY) {
			if (
				questFilter.xlCandy.find(
					(i) =>
						i.id === String(info.pokemonId) && (i.amount === undefined || i.amount === info.amount)
				)
			) {
				return questFilter;
			}
		}
	}
	return undefined;
}

// ----- invasion -----

/**
 * Mirror of matchInvasionFilterset, but uses the webhook lineup (rewardPokemon)
 * instead of the client-only getInvasionCatchable lookup.
 */
export function matchInvasionRule(
	i: MatchableInvasion,
	rules: FiltersetInvasion[]
): FiltersetInvasion | undefined {
	for (const invasionFilter of rules) {
		if (!invasionFilter.enabled) continue;

		if (invasionFilter.characters && invasionFilter.characters.includes(i.character)) {
			return invasionFilter;
		}

		if (
			invasionFilter.rewards?.find((r) =>
				i.rewardPokemon.some((c) => c.pokemon_id === r.pokemon_id && c.form === r.form)
			)
		) {
			return invasionFilter;
		}
	}
	return undefined;
}

// ----- max battle -----

/** Mirror of matchMaxBattleFilterset. */
export function matchMaxBattleRule(
	m: MatchableMaxBattle,
	rules: FiltersetMaxBattle[]
): FiltersetMaxBattle | undefined {
	const hasGmax = m.gmaxCount > 0;

	for (const filterset of rules) {
		if (!filterset.enabled) continue;

		if (filterset.bosses === undefined && !filterset.isActive && !filterset.hasGmax) {
			return filterset;
		}

		if (filterset.isActive && !m.isActive) continue;

		if (filterset.hasGmax && !hasGmax) continue;

		if (
			filterset.bosses !== undefined &&
			filterset.bosses.find(
				(p) =>
					p.pokemon_id === m.pokemonId &&
					p.form === m.form &&
					(p.bread_mode === undefined || p.bread_mode === m.breadMode)
			)
		) {
			return filterset;
		}

		if (filterset.isActive || filterset.hasGmax) return filterset;
	}
	return undefined;
}
