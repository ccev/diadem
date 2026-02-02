import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import * as m from "@/lib/paraglide/messages";
import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
import { getRank, hasTimer, showGreat, showLittle, showUltra } from "@/lib/utils/pokemonUtils";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { StationData } from "@/lib/types/mapObjectData/station";
import {
	getArTag,
	getContestText,
	getRewardText,
	hasFortActiveLure,
	isIncidentContest,
	isIncidentInvasion,
	isIncidentKecleon,
	KECLEON_ID,
	parseQuestReward
} from "@/lib/utils/pokestopUtils";
import { mCharacter, mItem, mPokemon, mQuest, mRaid } from "@/lib/services/ingameLocale";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import {
	getRaidPokemon,
	GYM_SLOTS,
	hasActiveRaid,
	isFortOutdated,
	isRaidHatched
} from "@/lib/utils/gymUtils";
import { type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import { getMmSsFromSeconds } from "@/lib/utils/time";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import { formatDecimal } from "@/lib/utils/numberFormat";

export function getShareText(data: MapData): string {
	if (!data.id) return "";

	switch (data.type) {
		case MapObjectType.POKEMON:
			return getPokemonShareText(data);
		case MapObjectType.POKESTOP:
			return getPokestopShareText(data);
		case MapObjectType.GYM:
			return getGymShareText(data);
		case MapObjectType.STATION:
			return getStationShareText(data);
		case MapObjectType.NEST:
			return getNestShareText(data);
		case MapObjectType.SPAWNPOINT:
			return getSpawnpointShareText(data);
		case MapObjectType.ROUTE:
			return getRouteShareText(data);
		case MapObjectType.TAPPABLE:
			return getTappableShareText(data);
	}
	// TODO: share texts for other map objects
	return "";
}

function getPokemonShareText(data: PokemonData) {
	let text = "";

	if (hasTimer(data)) {
		text += `🕜 ${m.popup_despawns()} ${timestampToLocalTime(data.expire_timestamp)}\n`;
	} else {
		text += `🕜 ${m.popup_found()} ${timestampToLocalTime(data.first_seen_timestamp)}\n`;
	}

	if (data.cp !== null && data.level !== null) {
		text += `📈 ${m.pogo_cp({ cp: data.cp })} (${m.pogo_level({ level: data.level })})\n`;
	}

	if (data.iv !== null) {
		text += `📚 ${m.pogo_ivs()}: ${data.iv.toFixed(1)}% (${data.atk_iv ?? "?"}/${data.def_iv ?? "?"}/${data.sta_iv ?? "?"})\n`;
	}

	if (showLittle(data)) {
		text += `🏆 ${m.league_rank({ league: m.little_league() })}: ${getRank(data, "little")}\n`;
	}

	if (showGreat(data)) {
		text += `🏆 ${m.league_rank({ league: m.great_league() })}: ${getRank(data, "great")}\n`;
	}

	if (showUltra(data)) {
		text += `🏆 ${m.league_rank({ league: m.ultra_league() })}: ${getRank(data, "ultra")}\n`;
	}

	return text;
}

function getQuestShareText(
	isAr: boolean,
	questReward?: string,
	questTitle?: string,
	questTarget?: number
) {
	if (!questTarget) return "";

	const texts = [getArTag(isAr)];

	const reward = parseQuestReward(questReward);
	let rewardText = "";
	if (reward) rewardText = getRewardText(reward);
	if (rewardText) texts.push(rewardText);

	const taskText = mQuest(questTitle, questTarget);
	if (taskText) texts.push(taskText);

	if (!texts) return "";

	return "🔎 " + texts.join(" · ") + "\n";
}

function getPokestopShareText(data: PokestopData) {
	let text = "";

	text += getQuestShareText(true, data.quest_rewards, data.quest_title, data.quest_target);
	text += getQuestShareText(
		false,
		data.alternative_quest_rewards,
		data.alternative_quest_title,
		data.alternative_quest_target
	);

	if (hasFortActiveLure(data)) {
		text += `🧲 ${mItem(data.lure_id)} (${timestampToLocalTime(data.lure_expire_timestamp)})\n`;
	}

	let invasionText = "";
	let kecleonText = "";
	let contestText = "";
	data.incident.forEach((incident) => {
		if (!incident.id || incident.expiration < currentTimestamp()) return;

		if (isIncidentInvasion(incident)) {
			invasionText += `🥷 ${mCharacter(incident.character)} (${timestampToLocalTime(incident.expiration, true)})\n`;
		} else if (isIncidentKecleon(incident)) {
			kecleonText += `🦎 ${mPokemon({ pokemon_id: KECLEON_ID })} (${timestampToLocalTime(incident.expiration)})\n`;
		} else if (
			isIncidentContest(incident) &&
			data.showcase_ranking_standard &&
			data.contest_focus
		) {
			contestText += `🏅 ${getContestText(data.showcase_ranking_standard, data.contest_focus)} (${timestampToLocalTime(incident.expiration, true)})\n`;
		}
	});

	if (invasionText) text += invasionText;
	if (kecleonText) text += kecleonText;
	if (contestText) text += contestText;

	return text;
}

function getGymShareText(data: GymData) {
	let text = "";

	if (hasActiveRaid(data)) {
		text += `⚔️ ${mRaid(data.raid_level)} `;

		if (data.raid_pokemon_id) text += `· ${mPokemon(getRaidPokemon(data))} `;
		if (isRaidHatched(data)) {
			text += `(${m.raid_ends()} ${timestampToLocalTime(data.raid_end_timestamp)})\n`;
		} else {
			text += `(${m.raid_starts()} ${timestampToLocalTime(data.raid_battle_timestamp)})\n`;
		}
	}

	if (!isFortOutdated(data.updated)) {
		text += `👥 ${m.gym_members()}: ${GYM_SLOTS - (data.availble_slots ?? 0)}/${GYM_SLOTS}\n`;
	}
	return text;
}

function getStationShareText(data: StationData) {
	let text = "";

	if (data.battle_pokemon_id) {
		text += `📍 ${m.pogo_station()}: ${data.name}\n`;
	}
	text += `🕜 ${m.start()}: ${timestampToLocalTime(data.start_time, true)}\n`;
	text += `🕜 ${m.end()}: ${timestampToLocalTime(data.end_time, true)}\n`;

	return text;
}

function getNestShareText(data: NestData) {
	let text = "";

	if (data.name) {
		text += `🌳 ${m.park_name()}: ${data.name}\n`;
	}

	text += `🔄 ${m.nest_avg()}: ${m.nest_avg_value({ avg: formatDecimal(data.pokemon_avg) })}\n`;

	return text;
}

function getSpawnpointShareText(data: SpawnpointData) {
	let text = "";

	if (data.despawn_sec) {
		text += `🕜 ${m.spawnpoint_despawns()}: ${getMmSsFromSeconds(data.despawn_sec)}\n`;
	} else {
		text += `🕜 ${m.spawnpoint_unknown()}\n`;
	}
	return text;
}

function getRouteShareText(data: RouteData) {
	let text = "";

	return text;
}

function getTappableShareText(data: TappableData) {
	let text = "";

	text += `🕜 ${m.popup_despawns()}: ${timestampToLocalTime(data.expire_timestamp, true)}\n`;

	if (!hasTimer(data)) {
		text += `⚠️ ${m.time_is_estimated()}\n`;
	}

	return text;
}
