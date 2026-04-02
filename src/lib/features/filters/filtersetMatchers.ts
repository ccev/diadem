import type {
	FiltersetInvasion,
	FiltersetMaxBattle,
	FiltersetQuest,
	FiltersetRaid
} from "@/lib/features/filters/filtersets";
import { QuestArType } from "@/lib/features/filters/filterUtilsQuest";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { Incident, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";

export function matchesRaidFilterset(filterset: FiltersetRaid, raidData: GymData) {
	const isEgg = !raidData.raid_pokemon_id;

	if (filterset.show && filterset.show.length > 0) {
		if (isEgg && !filterset.show.includes("egg")) return false;
		if (!isEgg && !filterset.show.includes("boss")) return false;

		if (!filterset.levels && !filterset.bosses) return true;
	}

	if (filterset.levels && filterset.levels.length > 0) {
		if (raidData.raid_level && filterset.levels.includes(raidData.raid_level)) return true;
	}

	if (!filterset.bosses || filterset.bosses.length === 0 || !raidData.raid_pokemon_id) {
		return false;
	}

	const raidForm = raidData.raid_pokemon_form ?? 0;
	return filterset.bosses.some((boss) => {
		if (boss.pokemon_id !== raidData.raid_pokemon_id) return false;
		return boss.form === raidForm;
	});
}

function matchesInvasionRewards(
	rewards: FiltersetInvasion["rewards"] | undefined,
	incident: Incident
) {
	if (!rewards || rewards.length === 0) return false;

	const rewardPokemon: { pokemon_id: number; form?: number }[] = [];
	if (incident.slot_1_pokemon_id) {
		rewardPokemon.push({
			pokemon_id: incident.slot_1_pokemon_id,
			form: incident.slot_1_form ?? undefined
		});
	}
	if (incident.slot_2_pokemon_id) {
		rewardPokemon.push({
			pokemon_id: incident.slot_2_pokemon_id,
			form: incident.slot_2_form ?? undefined
		});
	}
	if (incident.slot_3_pokemon_id) {
		rewardPokemon.push({
			pokemon_id: incident.slot_3_pokemon_id,
			form: incident.slot_3_form ?? undefined
		});
	}

	if (rewardPokemon.length === 0) return false;

	return rewards.some((reward) => {
		return rewardPokemon.some((pokemon) => {
			if (pokemon.pokemon_id !== reward.pokemon_id) return false;
			return reward.form === (pokemon.form ?? 0);
		});
	});
}

export function matchesInvasionFilterset(filterset: FiltersetInvasion, incident: Incident) {
	if (filterset.characters?.includes(incident.character)) return true;
	return matchesInvasionRewards(filterset.rewards, incident);
}

// Reward type ids from quest reward payload
const QUEST_REWARD = {
	XP: 1,
	ITEM: 2,
	STARDUST: 3,
	CANDY: 4,
	POKEMON: 7,
	XL_CANDY: 9,
	MEGA_ENERGY: 12
} as const;

export function matchesQuestFilterset(
	filterset: FiltersetQuest,
	reward: QuestReward,
	title: string,
	target: number,
	isAr: boolean
) {
	if (filterset.ar) {
		if (filterset.ar === QuestArType.AR && !isAr) return false;
		if (filterset.ar === QuestArType.NOAR && isAr) return false;
	}

	if (filterset.rewardType && filterset.rewardType !== reward.type) return false;

	if (
		filterset.tasks &&
		!filterset.tasks.find((task) => task.title === title && task.target === target)
	) {
		return false;
	}

	const hasRewardMatcher = Boolean(
		filterset.stardust ||
			filterset.xp ||
			filterset.pokemon ||
			filterset.item ||
			filterset.megaResource ||
			filterset.candy ||
			filterset.xlCandy
	);

	if (filterset.rewardType && !hasRewardMatcher) return true;

	if (
		filterset.stardust &&
		reward.type === QUEST_REWARD.STARDUST &&
		reward.info.amount >= filterset.stardust.min &&
		reward.info.amount <= filterset.stardust.max
	) {
		return true;
	}

	if (
		filterset.xp &&
		reward.type === QUEST_REWARD.XP &&
		reward.info.amount >= filterset.xp.min &&
		reward.info.amount <= filterset.xp.max
	) {
		return true;
	}

	if (
		filterset.pokemon &&
		reward.type === QUEST_REWARD.POKEMON &&
		filterset.pokemon.find((pokemon) => {
			const rewardForm = reward.info.form ?? 0;
			return pokemon.pokemon_id === reward.info.pokemon_id && pokemon.form === rewardForm;
		})
	) {
		return true;
	}

	if (
		filterset.item &&
		reward.type === QUEST_REWARD.ITEM &&
		filterset.item.find(
			(item) =>
				item.id === reward.info.item_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	if (
		filterset.megaResource &&
		reward.type === QUEST_REWARD.MEGA_ENERGY &&
		filterset.megaResource.find(
			(item) =>
				item.id === reward.info.pokemon_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	if (
		filterset.candy &&
		reward.type === QUEST_REWARD.CANDY &&
		filterset.candy.find(
			(item) =>
				item.id === reward.info.pokemon_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	if (
		filterset.xlCandy &&
		reward.type === QUEST_REWARD.XL_CANDY &&
		filterset.xlCandy.find(
			(item) =>
				item.id === reward.info.pokemon_id.toString() &&
				(item.amount === undefined || item.amount === reward.info.amount)
		)
	) {
		return true;
	}

	return false;
}

function isMaxBattleActive(station: StationData) {
	return Boolean(
		!station.is_inactive &&
			station.is_battle_available &&
			(station.start_time ?? 0) < currentTimestamp() &&
			(station.end_time ?? 0) > currentTimestamp()
	);
}

export function matchesMaxBattleFilterset(filterset: FiltersetMaxBattle, station: StationData) {
	if (
		filterset.bosses === undefined &&
		!filterset.isActive &&
		!filterset.hasGmax &&
		(!filterset.levels || filterset.levels.length === 0)
	) {
		return true;
	}

	if (filterset.isActive && !isMaxBattleActive(station)) {
		return false;
	}

	if (filterset.hasGmax && (station.total_stationed_gmax ?? 0) === 0) {
		return false;
	}

	if (
		filterset.levels &&
		filterset.levels.length > 0 &&
		(!station.battle_level || !filterset.levels.includes(station.battle_level))
	) {
		return false;
	}

	if (
		filterset.bosses &&
		filterset.bosses.length > 0 &&
		!filterset.bosses.some(
			(p) =>
				p.pokemon_id === station.battle_pokemon_id &&
				p.form === station.battle_pokemon_form &&
				(p.bread_mode === undefined || p.bread_mode === station.battle_pokemon_bread_mode)
		)
	) {
		return false;
	}

	if (filterset.bosses && filterset.bosses.length > 0) {
		return true;
	}

	return Boolean(filterset.isActive || filterset.hasGmax || filterset.levels?.length);
}
