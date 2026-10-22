import { ClientMapObjectType, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

import { mCharacter, mItem, mPokemon, mQuest, mRaid } from "@/lib/services/ingameLocale";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import {
	getRaidPokemon,
	GYM_SLOTS,
	hasActiveRaid,
	isFortOutdated,
	isRaidHatched
} from "@/lib/utils/gymUtils";
import { formatDecimal } from "@/lib/utils/numberFormat";
import { mapObjectLabel } from "@/lib/mapObjects/mapObjectLabels";
import {
	getBestRank,
	hasTimer,
	League,
	showGreat,
	showLittle,
	showUltra
} from "@/lib/utils/pokemonUtils";
import {
	getContestText,
	getRewardText,
	hasFortActiveLure,
	isIncidentContest,
	isIncidentInvasion,
	isIncidentKecleon,
	KECLEON_ID
} from "@/lib/utils/pokestopUtils";
import { getStationTitle, isMaxBattleActive } from "@/lib/utils/stationUtils";
import { getTappableName } from "@/lib/utils/tappableUtils";
import { getMmSsFromSeconds } from "@/lib/utils/time";
import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
import { formattedCoordinates } from "$lib/features/location.svelte";

// unused; was replaced by thumbnails
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

export function getShareTitle(data: MapData | null | undefined) {
	if (!data) return "";

	if (data.type === ClientMapObjectType.LOCATION) {
		return data.address ?? formattedCoordinates(data);
	} else if (data.type === MapObjectType.POKEMON) {
		return mPokemon(data);
	} else if (data.type === MapObjectType.STATION) {
		let title = "";
		if (data.battle_pokemon_id && isMaxBattleActive(data)) {
			title = "Max Battle";
		} else {
			title = "Power Spot";
		}
		if (data.id) title += " | " + getStationTitle(data);
		return title;
	} else if (data.type === MapObjectType.GYM || data.type === MapObjectType.POKESTOP) {
		let title = mapObjectLabel(data.type);
		if (data.name) title += ` | ${data.name}`;
		return title;
	} else if (data.type === MapObjectType.NEST) {
		return `${mPokemon(data)} Nest`;
	} else if (data.type === MapObjectType.SPAWNPOINT) {
		return "Spawnpoint";
	} else if (data.type === MapObjectType.ROUTE) {
		return data.name || "Route";
	} else if (data.type === MapObjectType.TAPPABLE) {
		return getTappableName(data) + /* @wc-include */ ` (Ground Item)`;
	}
	return "";
}

function getPokemonShareText(data: PokemonData) {
	let text = "";

	if (hasTimer(data as Parameters<typeof hasTimer>[0])) {
		text += /* @wc-include */ `🕜 Despawns ${timestampToLocalTime(data.expire_timestamp)}\n`;
	} else {
		text += /* @wc-include */ `🕜 Found ${timestampToLocalTime(data.first_seen_timestamp)}\n`;
	}

	if (data.cp != null && data.level != null) {
		text += /* @wc-include */ `📈 ${data.cp} CP (Level ${data.level})\n`;
	}

	if (data.iv != null) {
		text += /* @wc-include */ `📚 IVs: ${data.iv.toFixed(1)}% (${data.atk_iv ?? /* @wc-ignore */ "?"}/${data.def_iv ?? /* @wc-ignore */ "?"}/${data.sta_iv ?? /* @wc-ignore */ "?"})\n`;
	}

	if (showLittle(data, true)) {
		text += /* @wc-include */ `🏆 Little League Rank: ${getBestRank(data, League.LITTLE)}\n`;
	}

	if (showGreat(data, true)) {
		text += /* @wc-include */ `🏆 Great League Rank: ${getBestRank(data, League.GREAT)}\n`;
	}

	if (showUltra(data, true)) {
		text += /* @wc-include */ `🏆 Ultra League Rank: ${getBestRank(data, League.ULTRA)}\n`;
	}

	return text;
}

function getPokestopShareText(data: PokestopData) {
	let text = "";

	const quest = data.quests[0];
	if (quest?.target) {
		const questTexts: string[] = [];

		const rewardText = getRewardText(quest.reward);
		if (rewardText) questTexts.push(rewardText);

		const taskText = mQuest(quest.title, quest.target);
		if (taskText) questTexts.push(taskText);

		text += "🔎 " + questTexts.join(" · ") + "\n";
	}

	if (hasFortActiveLure(data)) {
		text += `🧲 ${mItem(data.lure_id)} (${timestampToLocalTime(data.lure_expire_timestamp)})\n`;
	}

	let invasionText = "";
	let kecleonText = "";
	let contestText = "";
	data.incident.forEach((incident) => {
		if (!incident.id || incident.expiration < currentTimestamp()) return;

		if (isIncidentInvasion(incident)) {
			invasionText += `🥷 ${mCharacter(incident.character)} (${timestampToLocalTime(incident.expiration, { showDate: true })})\n`;
		} else if (isIncidentKecleon(incident)) {
			kecleonText += `🦎 ${mPokemon({ pokemon_id: KECLEON_ID })} (${timestampToLocalTime(incident.expiration)})\n`;
		} else if (
			isIncidentContest(incident) &&
			data.showcase_ranking_standard &&
			data.contest_focus
		) {
			contestText += `🏅 ${getContestText(data.showcase_ranking_standard, data.contest_focus)} (${timestampToLocalTime(incident.expiration, { showDate: true })})\n`;
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
			text += /* @wc-include */ `(Ends ${timestampToLocalTime(data.raid_end_timestamp)})\n`;
		} else {
			text += /* @wc-include */ `(Starts ${timestampToLocalTime(data.raid_battle_timestamp)})\n`;
		}
	}

	if (!isFortOutdated(data.updated)) {
		text += /* @wc-include */ `👥 Defenders: ${GYM_SLOTS - (data.availble_slots ?? 0)}/${GYM_SLOTS}\n`;
	}
	return text;
}

function getStationShareText(data: StationData) {
	let text = "";

	if (data.battle_pokemon_id && isMaxBattleActive(data)) {
		text += /* @wc-include */ `📍 Power Spot: ${data.name}\n`;
	}
	if (data.start_time && isMaxBattleActive(data)) {
		text += /* @wc-include */ `🕜 Start: ${timestampToLocalTime(data.start_time, { showDate: true })}\n`;
	}
	if (data.end_time && isMaxBattleActive(data)) {
		text += /* @wc-include */ `🕜 End: ${timestampToLocalTime(data.end_time, { showDate: true })}\n`;
	}

	return text;
}

function getNestShareText(data: NestData) {
	let text = "";

	if (data.name) {
		text += /* @wc-include */ `🌳 Park Name: ${data.name}\n`;
	}

	text += /* @wc-include */ `🔄 Spawn Rate: ~${formatDecimal(data.pokemon_avg)}/hour\n`;

	return text;
}

function getSpawnpointShareText(data: SpawnpointData) {
	let text = "";

	if (data.despawn_sec) {
		text += /* @wc-include */ `🕜 Despawns: ${getMmSsFromSeconds(data.despawn_sec)}\n`;
	} else {
		text += /* @wc-include */ `🕜 Unknown despawn time\n`;
	}
	return text;
}

function getRouteShareText(data: RouteData) {
	return data.description;
}

function getTappableShareText(data: TappableData) {
	let text = "";

	text += /* @wc-include */ `🕜 Despawns: ${timestampToLocalTime(data.expire_timestamp, { showDate: true })}\n`;

	if (!hasTimer(data)) {
		text += /* @wc-include */ `⚠️ Time is estimated\n`;
	}

	return text;
}
