import { getConfig } from "@/lib/services/config/config";
import { getInstanceUrl } from "@/lib/native/runtime";
import type { UiconSet } from "@/lib/services/config/configTypes";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { UICONS, type RewardTypeKeys } from "uicons.js";

import { shouldDisplayIncident, shouldDisplayLure } from "@/lib/features/filterLogic/pokestop";
import { MapObjectType, type MapData } from "@/lib/mapObjects/mapObjectTypes";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { GYM_SLOTS, isFortOutdated, RaidLevel } from "@/lib/utils/gymUtils";
import { getLeagueCp, LeagueCp, type League } from "@/lib/utils/pokemonUtils";
import { RewardType } from "@/lib/utils/pokestopUtils";
import { isMaxBattleActive } from "@/lib/utils/stationUtils";
import type { AnyFilter } from "$lib/features/filters/filters";

export const DEFAULT_UICONS = "DEFAULT";

const iconSets: { [key: string]: UICONS } = {};

export type IconOptions<T extends AnyFilter = AnyFilter> = {
	iconSet?: string;
	filter?: T;
};

export async function initIconSet(id: string, url: string, thisFetch: typeof fetch = fetch) {
	if (id in iconSets) return;

	url = url.endsWith("/") ? url.slice(0, -1) : url;

	const newSet = new UICONS(url);
	iconSets[id] = newSet;

	const data = await thisFetch(`${url}/index.json`);
	if (!data.ok) {
		console.error("Failed to load uicon set: " + id);
		return;
	}

	const raw = await data.text();

	try {
		const indexFile = JSON.parse(raw);
		newSet.init(indexFile);
	} catch (e) {
		console.error(raw);
		console.error("Error while parsing uicon index " + id, e);
	}
}

export async function initAllIconSets(thisFetch: typeof fetch = fetch) {
	const base = getInstanceUrl();
	await Promise.all(
		getConfig().uiconSets.map((s) => initIconSet(s.id, `${base}/assets/${s.id}/`, thisFetch))
	);
}

export function getUiconSetDetails(id: string): UiconSet | undefined {
	return getConfig().uiconSets.find((s) => s.id === id);
}

export function getCurrentUiconSetDetailsAllTypes(): Partial<Record<MapObjectType, UiconSet>> {
	return {
		[MapObjectType.POKEMON]: getUiconSetDetails(getUserSettings().uiconSet.pokemon.id),
		[MapObjectType.POKESTOP]: getUiconSetDetails(getUserSettings().uiconSet.pokestop.id),
		[MapObjectType.GYM]: getUiconSetDetails(getUserSettings().uiconSet.gym.id),
		[MapObjectType.STATION]: getUiconSetDetails(getUserSettings().uiconSet.station.id),
		[MapObjectType.TAPPABLE]: getUiconSetDetails(getUserSettings().uiconSet.tappable.id)
	};
}

export function getIconForMap(data: Partial<MapData>, options?: IconOptions): string {
	if (data.type === MapObjectType.POKEMON) {
		return getIconPokemon(data, options);
	} else if (data.type === MapObjectType.POKESTOP) {
		return getIconPokestop(data, options);
	} else if (data.type === MapObjectType.GYM) {
		return getIconGym(data, options);
	} else if (data.type === MapObjectType.STATION) {
		return getIconStation(data, options);
	} else if (data.type === MapObjectType.TAPPABLE) {
		return getIconTappable(data, options);
	} else if (data.type === MapObjectType.NEST) {
		return getIconPokemon(data, options);
	}

	return "";
}

export function getIconPokemon(
	data: {
		pokemon_id?: number | null | undefined;
		temp_evolution_id?: number | null | undefined;
		form?: number | null | undefined;
		costume?: number | null | undefined;
		gender?: number | null | undefined;
		alignment?: number | null | undefined;
		bread_mode?: number | null | undefined;
		shiny?: number | boolean | null | undefined;
	},
	options?: IconOptions
) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.pokemon.id;
	return iconSets[iconSet].pokemon({
		pokemonId: data.pokemon_id ?? 0,
		evolution: data.temp_evolution_id ?? 0,
		form: data.form ?? 0,
		costume: data.costume ?? 0,
		gender: data.gender ?? 0,
		alignment: data.alignment ?? 0,
		bread: data.bread_mode ?? 0,
		shiny: Boolean(data.shiny)
	});
}

export function getIconPokestop(data: Partial<PokestopData>, options?: IconOptions) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.pokestop.id;
	const filter = options?.filter?.category === "pokestop" ? options.filter : undefined;

	let lureId = 0;
	if (shouldDisplayLure(data, filter)) {
		lureId = data.lure_id ?? 0;
	}

	let displayType: boolean | number = false;
	for (const incident of data.incident ?? []) {
		if (
			shouldDisplayIncident(incident, data, filter) &&
			incident.display_type &&
			incident.expiration > currentTimestamp()
		) {
			displayType = incident.display_type;
			break;
		}
	}

	return iconSets[iconSet].pokestop({ lureId, displayTypeId: displayType, questActive: false });
}

export function getIconGym(data: Partial<GymData>, options?: IconOptions) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.gym.id;
	let availableSlots = data.availble_slots ? GYM_SLOTS - data.availble_slots : GYM_SLOTS;
	if (isFortOutdated(data.updated)) availableSlots = GYM_SLOTS;

	let teamId = data.team_id;
	if (isFortOutdated(data.updated)) teamId = 0;

	return iconSets[iconSet].gym({
		teamId,
		trainerCount: availableSlots,
		inBattle: Boolean(data.in_battle),
		ex: Boolean(data.ex_raid_eligible)
	});
}

export function getIconStation(data: Partial<StationData> | boolean, options?: IconOptions) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.station.id;
	if (typeof data === "boolean") {
		return iconSets[iconSet].station({ active: data ?? false });
	}
	return iconSets[iconSet].station({ active: isMaxBattleActive(data) });
}

export function getIconInvasion(character: number | null, confirmed: number | boolean | null) {
	return iconSets[DEFAULT_UICONS].invasion({
		gruntId: character ?? 0,
		confirmed: Boolean(confirmed)
	});
}

export function getIconReward(
	type: RewardType,
	info: { item_id?: number; pokemon_id?: number; form?: number; amount?: number }
) {
	let rewardType = "";
	let id: number | undefined = undefined;
	switch (type) {
		case RewardType.XP:
			rewardType = "experience";
			break;
		case RewardType.ITEM:
			rewardType = "item";
			id = info.item_id;
			break;
		case RewardType.STARDUST:
			rewardType = "stardust";
			break;
		case RewardType.CANDY:
			rewardType = "candy";
			id = info.pokemon_id;
			break;
		case RewardType.AVATAR_CLOTHING:
			rewardType = "avatar_clothing";
			break;
		case RewardType.QUEST:
			rewardType = "quest";
			break;
		case RewardType.POKEMON:
			return getIconPokemon(info);
		case RewardType.POKECOINS:
			rewardType = "pokecoin";
			break;
		case RewardType.XL_CANDY:
			rewardType = "xl_candy";
			id = info.pokemon_id;
			break;
		case RewardType.LEVEL_CAP:
			rewardType = "level_cap";
			break;
		case RewardType.STICKER:
			rewardType = "sticker";
			break;
		case RewardType.MEGA_ENERGY:
			// return getIconPokemon(info);
			// wwm-uicons doesn't have mega energy, just using normal mega instead
			rewardType = "mega_resource";
			id = info.pokemon_id;
			break;
		case RewardType.INCIDENT:
			rewardType = "incident";
			break;
		case RewardType.PLAYER_ATTRIBUTE:
			rewardType = "player_attribute";
			break;
		case RewardType.TEMP_EVO_BRANCH_RESOURCE:
			// return getIconPokemon(info);
			// wwm-uicons doesn't have mega energy, just using normal mega instead
			rewardType = "mega_resource";
			id = info.pokemon_id;
			break;
		default:
			rewardType = "";
	}

	return iconSets[DEFAULT_UICONS].reward({
		questRewardType: rewardType as RewardTypeKeys,
		rewardId: id,
		amount: info.amount ?? 0
	});
}

export function getIconItem(itemId: number | string, amount: number = 0) {
	return iconSets[DEFAULT_UICONS].reward({
		questRewardType: "item",
		rewardId: itemId,
		amount
	});
}

export function getIconRaidEgg(level: number, hatched: boolean = false) {
	// temporary: show super megas as default mega eggs (no icons available)
	if (level === RaidLevel.MEGA_SUPER || level === RaidLevel.MEGA_SUPER_LEGENDARY) {
		level -= 10;
	}
	return iconSets[DEFAULT_UICONS].raidEgg({ level, hatched });
}

export function getIconType(type: number) {
	return iconSets[DEFAULT_UICONS].type({ typeId: type });
}

export function getIconContest() {
	return iconSets[DEFAULT_UICONS].misc({ fileName: "showcase" });
}

export function getIconLeague(league: League) {
	return (
		iconSets[DEFAULT_UICONS].misc({ fileName: getLeagueCp(league) }) ??
		iconSets[DEFAULT_UICONS].misc({ fileName: LeagueCp.GREAT })
	);
}

export function getIconTeam(teamId: number) {
	return iconSets[DEFAULT_UICONS].team({ teamId });
}

export function getIconBackground(backgroundId: number) {
	const url = iconSets[DEFAULT_UICONS].background({ id: backgroundId });
	if (url.endsWith("/0.png")) return "/loader.svg";
	return url;
}

export function getIconPokestopDirect(
	lureId: number,
	displayType: number | false,
	questActive: boolean,
	options?: IconOptions
) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.pokestop.id;
	return iconSets[iconSet].pokestop({ lureId, displayTypeId: displayType, questActive });
}

export function getIconGymDirect(teamId: number, options?: IconOptions) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.gym.id;
	return iconSets[iconSet].gym({ teamId });
}

export function getIconTappable(data: Partial<TappableData>, options?: IconOptions) {
	const iconSet = options?.iconSet ?? getUserSettings().uiconSet.tappable.id;
	if (data.item_id) {
		return getIconItem(data.item_id, data.count ?? 1);
	} else if (data.pokemon_id) {
		return getIconPokemon(data, options);
	}
	return iconSets[iconSet].tappable({ tappableType: data.tappable_type });
}
