import { browser } from "$app/environment";
import { type AddressData, searchAddress } from "@/lib/features/geocoding";
import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
import {
	getActiveCharacters,
	getActiveContests,
	getActiveMaxBattles,
	getActiveNests,
	getActiveQuestRewards,
	getActiveRaids,
	getSpawnablePokemon
} from "@/lib/features/masterStats.svelte";
import { getMap } from "@/lib/map/map.svelte";
import { getFixedBounds } from "@/lib/mapObjects/mapBounds";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { m } from "@/lib/paraglide/messages";
import { mCharacter, mItem, mPokemon, mRaid } from "@/lib/services/ingameLocale";
import { getAllLureModuleIds } from "@/lib/services/masterfile";
import { isSupportedFeature } from "@/lib/services/supportedFeatures";
import { hasAnyFeatureAnywhere, hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { featureFamily, Features } from "@/lib/utils/features";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import type { ContestFocus, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { openModal } from "@/lib/ui/modal.svelte";
import { mAny } from "@/lib/utils/anyMessage";
import type { Coords } from "@/lib/utils/coordinates";
import { getContestText, getRewardText, RewardType } from "@/lib/utils/pokestopUtils";
import microfuzz, {
	fuzzyMatch,
	type FuzzyResult,
	type FuzzySearcher,
	type HighlightRanges
} from "@nozbe/microfuzz";
import type { BBox, Geometry } from "geojson";
import type maplibre from "maplibre-gl";
import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createFuzzySearch: typeof microfuzz = (microfuzz as any)?.default ?? microfuzz;

const searchLimit = 20;
const highlightKey = "search-highlight";
const areaIcon = "Globe";

export enum SearchableType {
	POKEMON = "pokemon",
	AREA = "area",
	ADDRESS = "address",
	COORDINATES = "coordinates",
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
	geometry: undefined | Geometry;
};

export type CoordinatesSearchEntry = SearchEntry & {
	icon: string;
	type: SearchableType.COORDINATES;
	lat: number;
	lon: number;
};

export type PokestopSearchEntry = SearchEntry & {
	imageUrl: string;
	type: SearchableType.POKESTOP;
	lat: number;
	lon: number;
};

export type GymSearchEntry = SearchEntry & {
	imageUrl: string;
	type: SearchableType.GYM;
	lat: number;
	lon: number;
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
	form: number;
	temp_evolution_id: number;
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
	| CoordinatesSearchEntry
	| GymSearchEntry
	| PokestopSearchEntry;

export type RawFortSearchEntry = {
	type: "p" | "g" | "s";
	name: string;
	id: string;
	url: string;
	lat: number;
	lon: number;
};

export type SearchOptions = {
	types?: SearchableType[];
	showRecents?: boolean;
	resultSnippet: Snippet<[FuzzyResult<AnySearchEntry>[]]>;
	ignoreAddressMinCharacters?: boolean;
	textNoResults?: string;
	textSearchHint?: string;
};

let currentSearchQuery = $state("");
let searchResults: FuzzyResult<AnySearchEntry>[] = $state([]);
let isSearchingAddress: boolean = $state(false);
let searchedLocation: Coords | undefined = $state(undefined);
let searchedGeomtry: Geometry | undefined = $state(undefined);

let fortData: { lat: string; lon: string; data: RawFortSearchEntry[] } = {
	lat: "",
	lon: "",
	data: []
};

let fuzzy: FuzzySearcher<AnySearchEntry>;

let highlight: Highlight;
if (browser) {
	highlight = new Highlight();
	(CSS.highlights as unknown as Map<string, Highlight>).set(highlightKey, highlight);
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
	searchedGeomtry = undefined;
}

export function getSearchedLocation() {
	return searchedLocation;
}

export function setSearchedGeometry(geometry: Geometry) {
	searchedGeomtry = geometry;
}

export function getSearchedGeomtry() {
	return searchedGeomtry;
}

export function openSearchModal(searchOptions: SearchOptions, map?: maplibre.Map) {
	openModal("search");

	isSearchingAddress = false;
	if (
		shouldSearchType(SearchableType.GYM, searchOptions) ||
		shouldSearchType(SearchableType.POKESTOP, searchOptions)
	) {
		getFortSearchEntries(searchOptions, map).then();
	}
}

export function shouldSearchType(type: SearchableType, searchOptions: SearchOptions) {
	return !searchOptions.types || searchOptions.types.includes(type);
}

function getAreaSearchEntries() {
	return getKojiGeofences().map((k) => {
		return {
			name: k.properties.name,
			category: "area",
			key: "area-" + k.properties.name,
			type: SearchableType.AREA,
			icon: k.properties.lucideIcon ?? areaIcon,
			feature: k
		} as AreaSearchEntry;
	});
}

export function getActiveSearchQuestParams(reward: QuestReward) {
	const reward2 = { type: reward.type, info: { ...reward.info, amount: 0 } } as QuestReward;
	let rewardName = getRewardText(reward2);
	if (reward2.type === RewardType.POKEMON) {
		rewardName = m.x_quests({ x: rewardName });
	}

	return {
		reward: reward2,
		name: rewardName
	}
}

export function initSearch(searchOptions: SearchOptions) {
	const permissions = getUserDetails().permissions;

	let pokemonEntries: PokemonSearchEntry[] = [];
	if (
		shouldSearchType(SearchableType.POKEMON, searchOptions) &&
		hasAnyFeatureAnywhere(permissions, featureFamily[MapObjectType.POKEMON])
	) {
		pokemonEntries = getSpawnablePokemon().map((p) => {
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

	const areaEntries = shouldSearchType(SearchableType.AREA, searchOptions)
		? getAreaSearchEntries()
		: [];

	let questEntries: QuestSearchEntry[] = [];
	if (
		shouldSearchType(SearchableType.QUEST, searchOptions) &&
		hasFeatureAnywhere(permissions, Features.QUEST)
	) {
		questEntries =
			getActiveQuestRewards()?.map((r) => {
				const { name, reward } = getActiveSearchQuestParams(r)

				return {
					category: "pogo_quests",
					key: "quest-" + JSON.stringify(reward),
					type: SearchableType.QUEST,
					name,
					reward
				} as QuestSearchEntry;
			}) ?? [];
	}

	let kecleonEntries: KecleonSearchEntry[] = [];
	if (
		shouldSearchType(SearchableType.KECLEON, searchOptions) &&
		hasFeatureAnywhere(permissions, Features.KECLEON)
	) {
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
	if (
		shouldSearchType(SearchableType.CONTEST, searchOptions) &&
		hasFeatureAnywhere(permissions, Features.CONTEST)
	) {
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
	if (
		shouldSearchType(SearchableType.LURE, searchOptions) &&
		hasFeatureAnywhere(permissions, Features.LURE)
	) {
		lureEntries = getAllLureModuleIds().map((lure) => {
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
	if (
		shouldSearchType(SearchableType.INVASION, searchOptions) &&
		hasFeatureAnywhere(permissions, Features.INVASION)
	) {
		invasionEntries = getActiveCharacters().map((character) => {
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
	if (
		(shouldSearchType(SearchableType.RAID_LEVEL, searchOptions) ||
			shouldSearchType(SearchableType.RAID_BOSS, searchOptions)) &&
		hasFeatureAnywhere(permissions, Features.RAID)
	) {
		raidBossEntries = getActiveRaids()
			.map((raidBoss) => {
				if (
					shouldSearchType(SearchableType.RAID_LEVEL, searchOptions) &&
					!processedRaidLevels.has(raidBoss.level)
				) {
					processedRaidLevels.add(raidBoss.level);
					raidLevelEntries.push({
						name: mRaid(raidBoss.level, true),
						category: "raids",
						key: "raidlevel-" + raidBoss.level,
						type: SearchableType.RAID_LEVEL,
						level: raidBoss.level
					});
				}

				if (!shouldSearchType(SearchableType.RAID_BOSS, searchOptions)) return undefined;

				return {
					name: m.pokemon_raids({ pokemon: mPokemon(raidBoss) }),
					category: "raids",
					key:
						"raidboss- " +
						raidBoss.pokemon_id +
						"-" +
						raidBoss.form +
						"-" +
						raidBoss.temp_evolution_id,
					type: SearchableType.RAID_BOSS,
					pokemon_id: raidBoss.pokemon_id,
					form: raidBoss.form,
					temp_evolution_id: raidBoss.temp_evolution_id
				} as RaidBossSearchEntry;
			})
			.filter((entry) => entry !== undefined);
	}

	let maxBattleBossEntries: MaxBattleBossSearchEntry[] = [];
	if (
		shouldSearchType(SearchableType.MAX_BATTLE_BOSS, searchOptions) &&
		hasFeatureAnywhere(permissions, Features.MAX_BATTLE)
	) {
		maxBattleBossEntries = getActiveMaxBattles().map((maxBattle) => {
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
	if (
		shouldSearchType(SearchableType.NEST, searchOptions) &&
		hasFeatureAnywhere(permissions, MapObjectType.NEST)
	) {
		nestEntries = getActiveNests().map((nest) => {
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

	const fortEntries = fortData.data
		.filter((f) => f.name)
		.filter(
			(f) =>
				(f.type === "g" && shouldSearchType(SearchableType.GYM, searchOptions)) ||
				((f.type === "p" || f.type === "s") &&
					shouldSearchType(SearchableType.POKESTOP, searchOptions))
		)
		.map((fort) => {
			if (fort.type === "g") {
				return {
					name: fort.name,
					imageUrl: fort.url,
					type: SearchableType.GYM,
					key: fort.id,
					category: "pogo_gym",
					lat: fort.lat,
					lon: fort.lon
				} as GymSearchEntry;
			}

			return {
				name: fort.name,
				imageUrl: fort.url,
				type: SearchableType.POKESTOP,
				key: fort.id,
				category: "pogo_pokestop",
				lat: fort.lat,
				lon: fort.lon
			} as PokestopSearchEntry;
		});

	// order matters. sorted by priority
	const allSearchResults = [
		...areaEntries,
		...kecleonEntries,
		...invasionEntries,
		...pokemonEntries,
		...nestEntries,
		...raidLevelEntries,
		...raidBossEntries,
		// ...maxBattleLevelEntries,
		...maxBattleBossEntries,
		...contestEntries,
		...questEntries,
		...lureEntries,
		...fortEntries
	];
	fuzzy = createFuzzySearch(allSearchResults, {
		getText: (e) => [e.name, mAny(e.category)]
	});
}

function parseCoordinates(query: string): { lat: number; lon: number } | undefined {
	const match = query.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
	if (!match) return;
	const lat = parseFloat(match[1]);
	const lon = parseFloat(match[2]);
	if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
	return { lat, lon };
}

export function search(query: string, limit: boolean, searchOptions: SearchOptions) {
	if (shouldSearchType(SearchableType.ADDRESS, searchOptions) && isSupportedFeature("geocoding")) {
		searchAddress(query, searchOptions?.ignoreAddressMinCharacters ?? false).then();
	}

	let results: FuzzyResult<AnySearchEntry>[] = fuzzy(query);
	if (limit) results = results.slice(0, searchLimit);

	if (shouldSearchType(SearchableType.COORDINATES, searchOptions)) {
		const coords = parseCoordinates(query);
		if (coords) {
			const entry: CoordinatesSearchEntry = {
				name: `${coords.lat}, ${coords.lon}`,
				category: "coordinates",
				key: `coordinates-${coords.lat}-${coords.lon}`,
				icon: "MapPin",
				type: SearchableType.COORDINATES,
				lat: coords.lat,
				lon: coords.lon
			};
			results = [{ item: entry, score: 0, matches: [] }, ...results];
		}
	}

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
			geometry: address.geometry,
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

async function getFortSearchEntries(searchOptions: SearchOptions, map?: maplibre.Map) {
	const hasPokestops = hasAnyFeatureAnywhere(getUserDetails().permissions, [Features.POKESTOP]);
	const hasGyms = hasAnyFeatureAnywhere(getUserDetails().permissions, [Features.GYM]);
	if (!hasGyms && !hasPokestops) return;

	const usedMap = map ?? getMap();
	if (!usedMap) return;

	const center = usedMap.getCenter();
	const latKey = center.lat.toFixed(2);
	const lonKey = center.lng.toFixed(2);
	if (fortData.lat === latKey && fortData.lon === lonKey) {
		return fortData.data;
	}

	const bounds = getFixedBounds(8, usedMap);
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
	initSearch(searchOptions);
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
			(highlight as unknown as Set<Range>).add(range);
			ranges.push(range);
		}

		return () => ranges.forEach((r) => (highlight as unknown as Set<Range>).delete(r));
	};
}

export async function backgroundGeometryLookup(osmId: string, coords: Coords) {
	try {
		const result = await fetch("/api/search/geometry/" + osmId);
		if (!result.ok) {
			setSearchedLocation(coords);
			return;
		}
		const geometry = (await result.json()) as Geometry;
		if (geometry.type) {
			if (geometry.type === "Point") {
				setSearchedLocation(coords);
			} else {
				setSearchedGeometry(geometry);
				return;
			}
		}
	} catch (e) {}

	setSearchedLocation(coords);
}
