import type { Coords } from "@/lib/utils/coordinates";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { mCharacter, mItem, mPokemon, mRaid, prefixes } from "@/lib/services/ingameLocale";
import createFuzzySearch, {
	type FuzzyMatches,
	type FuzzySearcher,
	type HighlightRanges
} from "@nozbe/microfuzz";
import { getKojiGeofences, type KojiFeature } from "@/lib/features/koji";
import type { Attachment } from "svelte/attachments";
import { browser } from "$app/environment";
import { getAllLureModuleIds, getSpawnablePokemon } from "@/lib/services/masterfile";
import { getActiveCharacters, getActiveContests, getActiveQuestRewards, getActiveRaids } from "@/lib/features/masterStats.svelte";
import type { ContestFocus, QuestReward } from "@/lib/types/mapObjectData/pokestop";
import { getContestText, getRewardText, KECLEON_ID, RewardType } from "@/lib/utils/pokestopUtils";
import { m } from "@/lib/paraglide/messages";
import {
	type MapObjectCircleFeature,
	type MapObjectFeature,
	MapObjectFeatureType
} from "@/lib/map/featuresGen.svelte";
import type { RaidFilterShow } from "@/lib/features/filters/filtersets";

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
	rankingStandard: number,
	focus: ContestFocus,
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
	pokemon_id: number
	form_id: number
};

export type RaidLevelEntry = SearchEntry & {
	type: SearchableType.RAID_LEVEL;
	level: number;
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
	| RaidLevelEntry

let currentSearchQuery = $state("");

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

export function initSearch() {
	const pokemonEntries = getSpawnablePokemon(true).map((p) => {
		return {
			name: mPokemon(p),
			category: "pogo_pokemon",
			id: p.pokemon_id,
			form: p.form,
			key: "pokemon-" + p.pokemon_id + "-" + p.form,
			type: SearchableType.POKEMON
		} as PokemonSearchEntry;
	});

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

	const questEntries =
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

	const kecleonEntries = [
		{
			name: m.kecleon_pokestops(),
			category: "pogo_pokestops",
			key: "kecleon",
			type: SearchableType.KECLEON
		}
	] as KecleonSearchEntry[];

	const contestEntries = getActiveContests().map(contest => {
		return {
			name: getContestText(contest.ranking_standard, contest.focus),
			category: "pogo_contests",
			key: "contest-" + contest.ranking_standard + "-" + JSON.stringify(contest.focus),
			type: SearchableType.CONTEST,
			rankingStandard: contest.ranking_standard,
			focus: contest.focus
		} as ContestSearchEntry
	})

	const lureEntries = getAllLureModuleIds().map(lure => {
		return {
			name: mItem(lure),
			category: "pogo_pokestops",
			key: "lure-" + lure,
			type: SearchableType.LURE,
			itemId: lure
		} as LureSearchEntry
	})

	const invasionEntries = getActiveCharacters().map(character => {
		return {
			name: mCharacter(character.character),
			category: "pogo_invasion",
			key: "invasion-" + character.character,
			type: SearchableType.INVASION,
			characterId: character.character
		} as InvasionSearchEntry
	})

	const processedLevels: Set<number> = new Set()
	const raidLevelEntries: RaidLevelEntry[] = []
	const raidBossEntries = getActiveRaids().map(raidBoss => {
		if (!processedLevels.has(raidBoss.level)) {
			processedLevels.add(raidBoss.level)
			raidLevelEntries.push({
				name: mRaid(raidBoss.level, true),
				category: "raids",
				key: "raidlevel-" + raidBoss.level,
				type: SearchableType.RAID_LEVEL,
				level: raidBoss.level
			})
		}

		return {
			name: m.pokemon_raids({ pokemon: mPokemon(raidBoss) }),
			category: "raids",
			key: "raidboss- " + raidBoss.pokemon_id + "-" + raidBoss.form,
			type: SearchableType.RAID_BOSS,
			pokemon_id: raidBoss.pokemon_id,
			form_id: raidBoss.form
		} as RaidBossSearchEntry
	})

	// order matters. sorted by priority
	const allSearchResults = [
		...areaEntries,
		...kecleonEntries,
		...invasionEntries,
		...pokemonEntries,
		...raidLevelEntries,
		...raidBossEntries,
		...contestEntries,
		...questEntries,
		...lureEntries
	];
	fuzzy = createFuzzySearch(allSearchResults, { getText: e => [e.name, m[e.category]?.()] });
}

export function search(query: string, limit: boolean) {
	const results = fuzzy(query);
	if (limit) return results.slice(0, searchLimit);
	return results;
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
