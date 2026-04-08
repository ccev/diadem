import type {
	Incident,
	PokestopData,
	QuestData,
	QuestReward
} from "@/lib/types/mapObjectData/pokestop";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { isCurrentSelectedOverwrite } from "@/lib/mapObjects/currentSelectedState.svelte";
import { getInvasionCatchable, hasInvasionLineup } from "@/lib/features/masterStats.svelte";
import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
import {
	getActivePokestopFilter,
	hasFortActiveLure,
	isIncidentContest,
	isIncidentGold,
	isIncidentInvasion,
	isIncidentKecleon,
	RewardType
} from "@/lib/utils/pokestopUtils";
import type { FiltersetInvasion, FiltersetQuest } from "@/lib/features/filters/filtersets";
import type { FilterPokestop } from "@/lib/features/filters/filters";

export function matchInvasionFilterset(
	incident: Incident,
	pokestopFilters: FilterPokestop = getActivePokestopFilter()
): FiltersetInvasion | undefined {
	if (!isIncidentInvasion(incident)) return;

	const invasionFilters = pokestopFilters.invasion.filters.filter((f) => f.enabled);
	if (invasionFilters.length === 0) return;

	for (const invasionFilter of invasionFilters) {
		if (invasionFilter.characters?.includes(incident.character)) return invasionFilter;

		if (!hasInvasionLineup(incident.character)) continue;

		const catchableRewards = getInvasionCatchable(incident.character) ?? [];

		if (
			invasionFilter.rewards?.find((r) => {
				return catchableRewards.find((c) => c.pokemon_id === r.pokemon_id && c.form === r.form);
			})
		) {
			return invasionFilter;
		}
	}
}

export function shouldDisplayIncident(
	incident: Incident,
	pokestop: Partial<PokestopData>,
	pokestopFilters: FilterPokestop = getActivePokestopFilter()
) {
	const timestamp = currentTimestamp();

	// only active incidents
	if ((incident.expiration ?? 0) < timestamp) return false;

	if (isCurrentSelectedOverwrite(pokestop.mapId!)) return true;

	if (!pokestopFilters.enabled) return false;

	if (pokestopFilters.goldPokestop.enabled && isIncidentGold(incident)) return true;
	if (
		pokestopFilters.contest.enabled &&
		isIncidentContest(incident) &&
		shouldDisplayContest(pokestop, pokestopFilters)
	)
		return true;
	if (pokestopFilters.kecleon.enabled && isIncidentKecleon(incident)) return true;

	if (isIncidentInvasion(incident) && pokestopFilters.invasion.enabled) {
		const invasionFilters = pokestopFilters.invasion.filters.filter((f) => f.enabled);
		if (invasionFilters.length === 0) return true;
		if (pokestopFilters.invasion.enabled && matchInvasionFilterset(incident, pokestopFilters))
			return true;
	}

	return false;
}

export function matchQuestFilterset(
	quest: QuestData,
	pokestopFilter: FilterPokestop = getActivePokestopFilter()
): FiltersetQuest | undefined {
	const questFilters = pokestopFilter.quest.filters.filter((f) => f.enabled);
	if (questFilters.length === 0) return;

	for (const questFilter of questFilters) {
		if (questFilter.ar) {
			if (questFilter.ar === QuestArType.AR && !quest.isAr) continue;
			if (questFilter.ar === QuestArType.NOAR && quest.isAr) continue;
		}

		if (
			questFilter.tasks &&
			!questFilter.tasks.find((t) => t.title === quest.title && t.target === quest.target)
		) {
			continue;
		}

		if (
			questFilter.stardust &&
			quest.reward.type === RewardType.STARDUST &&
			quest.reward.info.amount >= questFilter.stardust.min &&
			quest.reward.info.amount <= questFilter.stardust.max
		) {
			return questFilter;
		}

		if (
			questFilter.xp &&
			quest.reward.type === RewardType.XP &&
			quest.reward.info.amount >= questFilter.xp.min &&
			quest.reward.info.amount <= questFilter.xp.max
		) {
			return questFilter;
		}

		if (
			questFilter.pokemon &&
			quest.reward.type === RewardType.POKEMON &&
			questFilter.pokemon.find(
				(p) => p.pokemon_id === quest.reward.info.pokemon_id && p.form === quest.reward.info.form
			)
		) {
			return questFilter;
		}

		if (
			questFilter.item &&
			quest.reward.type === RewardType.ITEM &&
			questFilter.item.find(
				(i) =>
					(i.id === quest.reward.info.item_id.toString() && i.amount === undefined) ||
					i.amount === quest.reward.info.amount
			)
		) {
			return questFilter;
		}

		if (
			questFilter.megaResource &&
			quest.reward.type === RewardType.MEGA_ENERGY &&
			questFilter.megaResource.find(
				(i) =>
					(i.id === quest.reward.info.pokemon_id.toString() && i.amount === undefined) ||
					i.amount === quest.reward.info.amount
			)
		) {
			return questFilter;
		}

		if (
			questFilter.candy &&
			quest.reward.type === RewardType.CANDY &&
			questFilter.candy.find(
				(i) =>
					(i.id === quest.reward.info.pokemon_id.toString() && i.amount === undefined) ||
					i.amount === quest.reward.info.amount
			)
		) {
			return questFilter;
		}

		if (
			questFilter.xlCandy &&
			quest.reward.type === RewardType.XL_CANDY &&
			questFilter.xlCandy.find(
				(i) =>
					(i.id === quest.reward.info.pokemon_id.toString() && i.amount === undefined) ||
					i.amount === quest.reward.info.amount
			)
		) {
			return questFilter;
		}
	}
}

export function shouldDisplayQuest(
	quest: QuestData,
	pokestop: Pick<PokestopData, "mapId">,
	pokestopFilter: FilterPokestop = getActivePokestopFilter()
) {
	if (isCurrentSelectedOverwrite(pokestop.mapId)) return true;
	if (!pokestopFilter.enabled || !pokestopFilter.quest.enabled) return false;
	const questFilters = pokestopFilter.quest.filters.filter((f) => f.enabled);
	if (questFilters.length === 0) return true;

	return Boolean(matchQuestFilterset(quest, pokestopFilter));
}

export function shouldDisplayLure(
	data: Partial<PokestopData>,
	pokestopFilters: FilterPokestop = getActivePokestopFilter()
) {
	if (!hasFortActiveLure(data)) return false;
	if (isCurrentSelectedOverwrite(data.mapId!)) return true;
	if (!pokestopFilters.enabled || !pokestopFilters.lure.enabled) return false;

	const lureFilters = pokestopFilters.lure.filters.filter((f) => f.enabled);
	if (lureFilters.length === 0) return true;
	return lureFilters.some((f) => f.items.includes(data?.lure_id ?? 0));
}

export function shouldDisplayContest(
	data: Partial<PokestopData>,
	pokestopFilters: FilterPokestop = getActivePokestopFilter()
) {
	if ((data.showcase_expiry ?? 0) < currentTimestamp()) return false;
	if (isCurrentSelectedOverwrite(data.mapId!)) return true;

	if (!pokestopFilters.enabled || !pokestopFilters.contest.enabled) return false;

	const contestFilters = pokestopFilters.contest.filters.filter((f) => f.enabled);
	if (contestFilters.length === 0) return true;

	for (const contestFilter of contestFilters) {
		if (
			contestFilter.rankingStandard &&
			contestFilter.rankingStandard !== data.showcase_ranking_standard
		) {
			return false;
		}

		if (
			contestFilter.focus.pokemon_id &&
			contestFilter.focus.pokemon_id !== data.showcase_pokemon_id
		) {
			return false;
		}

		if (contestFilter.focus.form && contestFilter.focus.form !== data.showcase_pokemon_form_id) {
			return false;
		}

		if (
			contestFilter.focus.type_id &&
			contestFilter.focus.type_id !== data.showcase_pokemon_type_id
		) {
			return false;
		}
	}

	return true;
}
