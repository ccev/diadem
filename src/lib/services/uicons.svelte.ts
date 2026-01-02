import { UICONS } from "uicons.js";
import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { getConfig } from "@/lib/services/config/config";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import type { UiconSet } from "@/lib/services/config/configTypes";
import type { Incident, PokestopData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { GymData } from "@/lib/types/mapObjectData/gym";

import { currentTimestamp } from "@/lib/utils/currentTimestamp";
import { shouldDisplayIncidient, shouldDisplayLure } from "@/lib/utils/pokestopUtils";
import { GYM_SLOTS, isFortOutdated } from "@/lib/utils/gymUtils";
import { allMapObjectTypes, type MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";

export const DEFAULT_UICONS = "DEFAULT";

const iconSets: { [key: string]: UICONS } = {};

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
	const indexFile = await data.json();
	newSet.init(indexFile);
}

export async function initAllIconSets(thisFetch: typeof fetch = fetch) {
	await Promise.all(
		getConfig().uiconSets.map((s) => initIconSet(s.id, `/assets/${s.id}/`, thisFetch))
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

export function getIconForMap(data: Partial<MapData>, iconSet?: string): string {
	if (data.type === MapObjectType.POKEMON) {
		return getIconPokemon(data, iconSet);
	} else if (data.type === MapObjectType.POKESTOP) {
		return getIconPokestop(data, iconSet);
	} else if (data.type === MapObjectType.GYM) {
		return getIconGym(data, iconSet);
	} else if (data.type === MapObjectType.STATION) {
		return getIconStation(data, iconSet);
	} else if (data.type === MapObjectType.TAPPABLE) {
		return getIconTappable(data, iconSet);
	}
	console.error("Unknown icon type: " + data.type);
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
	iconSet: string = getUserSettings().uiconSet.pokemon.id
) {
	return iconSets[iconSet].pokemon(
		data.pokemon_id,
		data.temp_evolution_id,
		data.form,
		data.costume,
		data.gender,
		data.alignment,
		data.bread_mode,
		Boolean(data.shiny)
	);
}

export function getIconPokestop(
	data: Partial<PokestopData>,
	iconSet: string = getUserSettings().uiconSet.pokestop.id
) {
	// maybe this is not the right location for these modifations. can be moved later
	let lureId = 0;
	if (shouldDisplayLure(data)) {
		lureId = data.lure_id ?? 0;
	}

	let displayType: boolean | number = false;
	for (const incident of data.incident ?? []) {
		if (
			shouldDisplayIncidient(incident) &&
			incident.display_type &&
			incident.expiration > currentTimestamp()
		) {
			displayType = incident.display_type;
			break;
		}
	}

	const powerUp = isFortOutdated(data.updated) ? 0 : data.power_up_level;

	return iconSets[iconSet].pokestop(
		lureId,
		displayType,
		false, // quest active
		Boolean(data.ar_scan_eligible),
		powerUp
	);
}

export function getIconGym(
	data: Partial<GymData>,
	iconSet: string = getUserSettings().uiconSet.gym.id
) {
	// maybe this is not the right location for these modifations. can be moved later
	const powerUp = isFortOutdated(data.updated) ? 0 : data.power_up_level;
	let availableSlots = data.availble_slots ? GYM_SLOTS - data.availble_slots : GYM_SLOTS;
	if (isFortOutdated(data.updated)) availableSlots = GYM_SLOTS;

	return iconSets[iconSet].gym(
		data.team_id,
		availableSlots,
		Boolean(data.in_battle),
		Boolean(data.ex_raid_eligible),
		Boolean(data.ar_scan_eligible),
		powerUp
	);
}

export function getIconStation(
	data: Partial<StationData>,
	iconSet: string = getUserSettings().uiconSet.station.id
) {
	return iconSets[iconSet].station((data.start_time ?? 0) < currentTimestamp());
}

export function getIconInvasion(character: number | null, confirmed: number | boolean | null) {
	return iconSets[DEFAULT_UICONS].invasion(character, Boolean(confirmed));
}

export function getIconReward(data: QuestReward) {
	let rewardType = "";
	let id = 0;
	switch (data.type) {
		case 1:
			rewardType = "experience";
			break;
		case 2:
			rewardType = "item";
			id = data.info.item_id;
			break;
		case 3:
			rewardType = "stardust";
			break;
		case 4:
			rewardType = "candy";
			id = data.info.pokemon_id;
			break;
		case 5:
			rewardType = "avatar_clothing";
			break;
		case 6:
			rewardType = "quest";
			break;
		case 7:
			return getIconPokemon(data.info);
		case 8:
			rewardType = "pokecoin";
			break;
		case 9:
			rewardType = "xl_candy";
			id = data.info.pokemon_id;
			break;
		case 10:
			rewardType = "level_cap";
			break;
		case 11:
			rewardType = "sticker";
			break;
		case 12:
			rewardType = "mega_resource";
			id = data.info.pokemon_id;
			break;
		case 13:
			rewardType = "incident";
			break;
		case 14:
			rewardType = "player_attribute";
			break;
		default:
			rewardType = "";
	}

	return iconSets[DEFAULT_UICONS].reward(rewardType, id, data.info?.amount ?? 0);
}

export function getIconItem(itemId: number, amount: number = 0) {
	return iconSets[DEFAULT_UICONS].reward("item", itemId, amount);
}

export function getIconRaidEgg(level: number, hatched: boolean = false) {
	return iconSets[DEFAULT_UICONS].raidEgg(level, hatched);
}

export function getIconType(type: number) {
	return iconSets[DEFAULT_UICONS].type(type);
}

export function getIconContest() {
	return iconSets[DEFAULT_UICONS].misc("showcase");
}

export enum League {
	LITTLE = 500,
	GREAT = 1500,
	ULTRA = 2500,
	MASTER = 9000
}

export function getIconLeague(league: League) {
	return iconSets[DEFAULT_UICONS].misc(league) ?? iconSets[DEFAULT_UICONS].misc(League.GREAT);
}

export function getIconTappable(
	data: Partial<TappableData>,
	iconSet: string = getUserSettings().uiconSet.tappable.id
) {
	if (data.item_id) {
		return getIconItem(data.item_id, data.count ?? 1)
	} else if (data.pokemon_id) {
		return getIconPokemon(data)
	}
	return iconSets[iconSet].tappable(data.tappable_type);
}
