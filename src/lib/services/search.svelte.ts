import type { Coords } from "@/lib/utils/coordinates";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { mCharacter, mItem, mPokemon, mRaid } from "@/lib/services/ingameLocale";
import createFuzzySearch, {
	fuzzyMatch,
	type FuzzyResult,
	type FuzzySearcher,
	type HighlightRanges
} from "@nozbe/microfuzz";
import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
import type { Attachment } from "svelte/attachments";
import { browser } from "$app/environment";
import { getAllLureModuleIds, getSpawnablePokemon } from "@/lib/services/masterfile";
import {
	getActiveCharacters,
	getActiveContests,
	getActiveMaxBattles,
	getActiveNests,
	getActiveQuestRewards,
	getActiveRaids
} from "@/lib/features/masterStats.svelte";
import type { ContestFocus, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { getContestText, getRewardText, RewardType } from "@/lib/utils/pokestopUtils";
import { m } from "@/lib/paraglide/messages";
import { type AddressData, searchAddress } from "@/lib/features/geocoding";
import { isSupportedFeature } from "@/lib/services/supportedFeatures";
import type { BBox } from "geojson";
import { getFixedBounds } from "@/lib/mapObjects/mapBounds";
import { getMap } from "@/lib/map/map.svelte";
import { openModal } from "@/lib/ui/modal.svelte";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

const searchLimit = 20;
const highlightKey = "search-highlight";
const areaIcon = "Globe";

export enum SearchableType {
	POKEMON = "pokemon",
	AREA = "area",
	ADDRESS = "address",
	GYM = "gym",
	POKESTOP = "pokestop",
	STATION = "station",
	QUEST = "quest",
	KECLEON = "kecleon",
	CONTEST = "contest",
	LURE = "lure",
	INVASION = "invasion",
	RAID_BOSS = "raid_boss",
	RAID_LEVEL = "raid_level",
	MAX_BATTLE_BOSS = "max_battle_boss",
	MAX_BATTLE_LEVEL = "max_battle_level",
	NEST = "nest"
}

export type SearchEntry = {
	name: string;
	category: keyof typeof m;
	key: string;
	icon?: string;
	imageUrl?: string;
	type: SearchableType;
};

export type AreaSearchEntry = SearchEntry & {
	icon: string;
	feature: KojiFeature;
	type: SearchableType.AREA;
};

export type AddressSearchEntry = SearchEntry & {
	icon: string;
	type: SearchableType.ADDRESS;
	point: [number, number];
	bbox: undefined | BBox;
};

export type PokestopSearchEntry = SearchEntry & {
	imageUrl: string;
	type: SearchableType.POKESTOP;
};

export type GymSearchEntry = SearchEntry & {
	imageUrl: string;
	type: SearchableType.GYM;
};

export type PokemonSearchEntry = SearchEntry & {
	id: number;
	form: number;
	type: SearchableType.POKEMON;
};

export type QuestSearchEntry = SearchEntry & {
	reward: QuestReward;
	type: SearchableType.QUEST;
};

export type KecleonSearchEntry = SearchEntry & {
	type: SearchableType.KECLEON;
};

export type ContestSearchEntry = SearchEntry & {
	rankingStandard: number;
	focus: ContestFocus;
	type: SearchableType.CONTEST;
};

export type LureSearchEntry = SearchEntry & {
	type: SearchableType.LURE;
	itemId: number;
};

export type InvasionSearchEntry = SearchEntry & {
	type: SearchableType.INVASION;
	characterId: number;
};

export type RaidBossSearchEntry = SearchEntry & {
	type: SearchableType.RAID_BOSS;
	pokemon_id: number;
	form_id: number;
};

export type RaidLevelSearchEntry = SearchEntry & {
	type: SearchableType.RAID_LEVEL;
	level: number;
};

export type MaxBattleBossSearchEntry = SearchEntry & {
	type: SearchableType.MAX_BATTLE_BOSS;
	pokemon_id: number;
	form: number;
	bread_mode: number;
};

export type MaxBattleLevelSearchEntry = SearchEntry & {
	type: SearchableType.MAX_BATTLE_LEVEL;
	level: number;
};

export type NestSearchEntry = SearchEntry & {
	type: SearchableType.NEST;
	pokemon_id: number;
	form: number;
};

export type AnySearchEntry =
	| PokemonSearchEntry
	| AreaSearchEntry
	| QuestSearchEntry
	| KecleonSearchEntry
	| ContestSearchEntry
	| LureSearchEntry
	| InvasionSearchEntry
	| RaidBossSearchEntry
	| RaidLevelSearchEntry
	| MaxBattleBossSearchEntry
	| MaxBattleLevelSearchEntry
	| NestSearchEntry
	| AddressSearchEntry
	| GymSearchEntry
	| PokestopSearchEntry;

export type RawFortSearchEntry = {
	type: "p" | "g" | "s";
	name: string;
	id: string;
	url: string;
};

let currentSearchQuery = $state("");
let searchResults: FuzzyResult<AnySearchEntry>[] = $state([]);
let isSearchingAddress: boolean = $state(false);
let searchedLocation: Coords | undefined = $state(undefined);

let fortData: { lat: string; lon: string; data: RawFortSearchEntry[] } = {
	lat: "",
	lon: "",
	data: []
};

let fuzzy: FuzzySearcher<AnySearchEntry>;

let highlight: Highlight;
if (browser) {
	highlight = new Highlight();
	CSS.highlights.set(highlightKey, highlight);
}

export function getCurrentSearchQuery() {
	return currentSearchQuery;
}

export function setCurrentSearchQuery(query: string) {
	currentSearchQuery = query;
}

export function getCurrentSearchResults() {
	return searchResults;
}

export function getIsSearchingAddress() {
	return isSearchingAddress;
}

export function setIsSearchingAddress(active: boolean) {
	isSearchingAddress = active;
}

export function setSearchedLocation(location: Coords) {
	searchedLocation = location;
}

export function resetSearchedLocation() {
	searchedLocation = undefined;
}

export function getSearchedLocation() {
	return searchedLocation;
}

export function openSearchModal() {
	openModal("search");

	isSearchingAddress = false;
	getFortSearchEntries().then();
}

export function initSearch() {
	const permissions = getUserDetails().permissions;

	let pokemonEntries: PokemonSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.POKEMON)) {
		pokemonEntries = getSpawnablePokemon(true).map((p) => {
			return {
				name: mPokemon(p),
				category: "pogo_pokemon",
				id: p.pokemon_id,
				form: p.form,
				key: "pokemon-" + p.pokemon_id + "-" + p.form,
				type: SearchableType.POKEMON
			} as PokemonSearchEntry;
		});
	}

	const areaEntries = getKojiGeofences().map((k) => {
		return {
			name: k.properties.name,
			category: "area",
			key: "area-" + k.properties.name,
			type: SearchableType.AREA,
			icon: k.properties.lucideIcon ?? areaIcon,
			feature: k
		} as AreaSearchEntry;
	});

	let questEntries: QuestSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.POKESTOP)) {
		questEntries =
			getActiveQuestRewards()?.map((r) => {
				const reward = { type: r.type, info: { ...r.info, amount: 0 } } as QuestReward;
				let rewardName = getRewardText(reward);
				if (reward.type === RewardType.POKEMON) {
					rewardName = m.x_quests({ x: rewardName });
				}

				return {
					name: rewardName,
					category: "pogo_quests",
					key: "quest-" + JSON.stringify(reward),
					type: SearchableType.QUEST,
					reward
				} as QuestSearchEntry;
			}) ?? [];
	}

	let kecleonEntries: KecleonSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.POKESTOP)) {
		kecleonEntries = [
			{
				name: m.kecleon_pokestops(),
				category: "pogo_pokestops",
				key: "kecleon",
				type: SearchableType.KECLEON
			}
		] as KecleonSearchEntry[];
	}

	let contestEntries: ContestSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.POKESTOP)) {
		contestEntries = getActiveContests().map((contest) => {
			return {
				name: getContestText(contest.ranking_standard, contest.focus),
				category: "pogo_contests",
				key: "contest-" + contest.ranking_standard + "-" + JSON.stringify(contest.focus),
				type: SearchableType.CONTEST,
				rankingStandard: contest.ranking_standard,
				focus: contest.focus
			} as ContestSearchEntry;
		});
	}

	let lureEntries: LureSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.POKESTOP)) {
		const lureEntries = getAllLureModuleIds().map((lure) => {
			return {
				name: mItem(lure),
				category: "pogo_pokestops",
				key: "lure-" + lure,
				type: SearchableType.LURE,
				itemId: lure
			} as LureSearchEntry;
		});
	}

	let invasionEntries: InvasionSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.POKESTOP)) {
		const invasionEntries = getActiveCharacters().map((character) => {
			return {
				name: mCharacter(character.character),
				category: "pogo_invasion",
				key: "invasion-" + character.character,
				type: SearchableType.INVASION,
				characterId: character.character
			} as InvasionSearchEntry;
		});
	}

	const processedRaidLevels: Set<number> = new Set();
	const raidLevelEntries: RaidLevelSearchEntry[] = [];
	let raidBossEntries: RaidBossSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.GYM)) {
		raidBossEntries = getActiveRaids().map((raidBoss) => {
			if (!processedRaidLevels.has(raidBoss.level)) {
				processedRaidLevels.add(raidBoss.level);
				raidLevelEntries.push({
					name: mRaid(raidBoss.level, true),
					category: "raids",
					key: "raidlevel-" + raidBoss.level,
					type: SearchableType.RAID_LEVEL,
					level: raidBoss.level
				});
			}

			return {
				name: m.pokemon_raids({ pokemon: mPokemon(raidBoss) }),
				category: "raids",
				key: "raidboss- " + raidBoss.pokemon_id + "-" + raidBoss.form,
				type: SearchableType.RAID_BOSS,
				pokemon_id: raidBoss.pokemon_id,
				form_id: raidBoss.form
			} as RaidBossSearchEntry;
		});
	}


	let maxBattleBossEntries: MaxBattleBossSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.STATION)) {
		const maxBattleBossEntries = getActiveMaxBattles().map((maxBattle) => {
			return {
				name: m.pokemon_max_battles({ pokemon: mPokemon(maxBattle) }),
				category: "max_battles",
				key:
					"raidboss- " + maxBattle.pokemon_id + "-" + maxBattle.form + "-" + maxBattle.bread_mode,
				type: SearchableType.MAX_BATTLE_BOSS,
				pokemon_id: maxBattle.pokemon_id,
				form: maxBattle.form,
				bread_mode: maxBattle.bread_mode
			} as MaxBattleBossSearchEntry;
		});
	}

	let nestEntries: NestSearchEntry[] = [];
	if (hasFeatureAnywhere(permissions, MapObjectType.NEST)) {
		const nestEntries = getActiveNests().map((nest) => {
			return {
				name: m.pokemon_nests({ pokemon: mPokemon(nest) }),
				category: "nests",
				key: "nest-" + nest.pokemon_id + "-" + nest.form,
				type: SearchableType.NEST,
				pokemon_id: nest.pokemon_id,
				form: nest.form
			} as NestSearchEntry;
		});
	}

	const fortEntries = fortData.data.map((fort) => {
		if (fort.type === "p") {
			return {
				name: fort.name,
				imageUrl: fort.url,
				type: SearchableType.POKESTOP,
				key: fort.id,
				category: "pogo_pokestop"
			} as PokestopSearchEntry;
		} else if (fort.type === "g") {
			return {
				name: fort.name,
				imageUrl: fort.url,
				type: SearchableType.GYM,
				key: fort.id,
				category: "pogo_gym"
			} as GymSearchEntry;
		}
	});

	// order matters. sorted by priority
	const allSearchResults = [
		...areaEntries,
		...kecleonEntries,
		...invasionEntries,
		...fortEntries,
		...pokemonEntries,
		...nestEntries,
		...raidLevelEntries,
		...raidBossEntries,
		// ...maxBattleLevelEntries,
		...maxBattleBossEntries,
		...contestEntries,
		...questEntries,
		...lureEntries
	];
	fuzzy = createFuzzySearch(allSearchResults, { getText: (e) => [e.name, m[e.category]?.()] });
}

export function search(query: string, limit: boolean) {
	if (isSupportedFeature("geocoding")) {
		searchAddress(query).then();
	}

	let results = fuzzy(query);
	if (limit) results = results.slice(0, searchLimit);
	searchResults = results;
}

export function addAddressSearchResults(data: AddressData[], query: string) {
	if (query !== currentSearchQuery) return; // outdated result

	let results: FuzzyResult<AddressSearchEntry>[] = [];

	for (const address of data) {
		const result = fuzzyMatch(address.name, query);
		if (!result) continue;

		const item = {
			name: address.name,
			category: "address",
			key: address.id,
			icon: "MapPin",
			point: address.center,
			bbox: address.bbox,
			type: SearchableType.ADDRESS
		} as AddressSearchEntry;

		const newResult: FuzzyResult<AddressSearchEntry> = {
			...result,
			item
		};
		results.push(newResult);
	}

	searchResults = searchResults.concat(results);
	isSearchingAddress = false;
}

async function getFortSearchEntries() {
	const hasPokestops = hasFeatureAnywhere(getUserDetails().permissions, MapObjectType.POKESTOP)
	const hasGyms = hasFeatureAnywhere(getUserDetails().permissions, MapObjectType.GYM)
	if (!hasGyms && !hasPokestops) return

	const map = getMap();
	if (!map) return;

	const center = map.getCenter();
	const latKey = center.lat.toFixed(2);
	const lonKey = center.lng.toFixed(2);
	if (fortData.lat === latKey && fortData.lon === lonKey) {
		return fortData.data;
	}

	const bounds = getFixedBounds(8);
	const response = await fetch("/api/search/forts", {
		body: JSON.stringify(bounds),
		method: "POST"
	});

	if (!response.ok) {
		console.error("Couldn't fetch fort search entries");
		return;
	}

	const entries: RawFortSearchEntry[] = await response.json();
	fortData.lat = latKey;
	fortData.lon = lonKey;
	fortData.data = entries;
	initSearch();
}

export function highlightSearchMatches(match: HighlightRanges | null | undefined): Attachment {
	return (element) => {
		if (!match) return;

		const text = element.childNodes[0];
		const ranges: Range[] = [];

		for (const indexes of match) {
			const range = new Range();
			range.setStart(text, indexes[0]);
			range.setEnd(text, indexes[1] + 1);
			highlight.add(range);
			ranges.push(range);
		}

		return () => ranges.forEach((r) => highlight.delete(r));
	};
}

let allPokemonNames: PokemonSearchEntry[] | undefined = undefined;

/**
 * Sorts given array by .startswith(), then .includes()
 */
export function sortSearchResults<T>(items: T[], query: string, selector: (item: T) => string) {
	const q = query.toLowerCase();

	return items
		.filter((item) => selector(item).toLowerCase().includes(q))
		.sort((a, b) => {
			const nameA = selector(a).toLowerCase();
			const nameB = selector(b).toLowerCase();

			const startsWithA = nameA.startsWith(q);
			const startsWithB = nameB.startsWith(q);

			if (startsWithA && !startsWithB) return -1;
			if (!startsWithA && startsWithB) return 1;

			return nameA.localeCompare(nameB);
		});
}

export type SearchPayload = {
	name: string;
	range: number;
	center: {
		lat: number;
		lon: number;
	};
};

export enum SearchType {
	GYM = "gym",
	POKESTOP = "pokestop",
	POKEMON = "pokemon"
}

export async function searchExternal<T>(
	type: SearchType,
	name: string,
	center: Coords
): Promise<undefined | T[]> {
	const payload: SearchPayload = {
		name,
		range: getUserSettings().searchRange,
		center: center.internal()
	};

	const result = await fetch("/api/search/" + type, {
		method: "POST",
		body: JSON.stringify(payload)
	});
	if (!result.ok) {
		console.error("Search failed!");
		return;
	}

	return await result.json();
}

export function searchPokemon(query: string) {
	if (allPokemonNames === undefined) {
	}

	return sortSearchResults(allPokemonNames, query, (p) => p.name);
}
