import emojilib from "emojilib";
import { IconCategory } from "@/lib/features/filters/icons";
import {
	getIconPokemon,
	getIconRaidEgg,
	getIconItem,
	getIconLeague,
	getIconInvasion,
	getIconType,
	getIconTeam,
	getIconPokestopDirect,
	getIconGymDirect,
	getIconReward,
	getIconStation,
	League
} from "@/lib/services/uicons.svelte";
import { getAllPokemon, getMasterFile } from "@/lib/services/masterfile";
import { mPokemon, mType, mRaid, mItem, mCharacter } from "@/lib/services/ingameLocale";
import { RewardType } from "@/lib/utils/pokestopUtils";
import * as m from "@/lib/paraglide/messages";

export const COMMON_EMOJIS = [
	// measurement / data
	"💯",
	"📏",
	"📊",
	"📈",
	"📉",
	// achievement / awards
	"🏆",
	"🎖️",
	"🏅",
	"🥇",
	"🥈",
	"🥉",
	// games / gambling / sports
	"🎰",
	"🎲",
	"🎮",
	"🕹️",
	"👾",
	"🎱",
	"🥊",
	// science / precision
	"🔬",
	"🤏",
	"🎯",
	// weather
	"☁️",
	"☔",
	"⛈️",
	"🌈",
	"🌡️",
	"🌤️",
	"🌥️",
	"🌦️",
	"🌩️",
	// fire / energy / impact
	"🔥",
	"⚡",
	"💥",
	"🫯",
	// sparkle / magic / stars
	"✨",
	"💫",
	"⭐",
	"🌟",
	"🪄",
	"💡",
	// precious / value / money
	"💎",
	"👑",
	"💰",
	"💶",
	"🪙",
	"🛍️",
	// strength / combat
	"💪",
	"🛡️",
	"🗡️",
	"⚔️",
	// celebration / party
	"🎉",
	"🎊",
	"🎈",
	"🎁",
	"🪩",
	// hearts / emotion
	"❤️",
	"💔",
	// eyes / attention
	"👀",
	// speed / navigation / world
	"🚀",
	"🧭",
	"🌐",
	// negative / danger / warning
	"🗑️",
	"💩",
	"☠️",
	"🚨",
	"🚧",
	"🛑",
	// art / performance / media
	"🎨",
	"🎭",
	"🎩",
	"📷",
	// communication / awareness
	"📢",
	"🎗️",
	// office / tools
	"📎",
	"📍",
	"📌",
	"📂",
	"📁",
	"🔋",
	"🪫",
	"🧼",
	// time
	"⌛",
	"⏰",
	"📆",
	// security
	"🔐",
	"🔑",
	// leisure
	"⛱️",
	// identity / pride
	"🏳️‍🌈",
	"🏳️‍⚧️",
	// body / self-care
	"🧠",
	"🦴",
	"🦷",
	"💅",
	// flowers
	"💐",
	"🌹",
	"🥀",
	"🌸",
	"🌼",
	// plants / nature
	"🌱",
	"🍀",
	"🌴",
	"🌲",
	"🪾",
	"🪵",
	"🪹",
	// sky / celestial / space
	"☀️",
	"🌞",
	"🌝",
	"🌚",
	"⛄",
	"🪐",
	"🌍",
	"🌠",
	// animals
	"🐣",
	"🦠",
	"🐛",
	"🐝",
	"🕷️",
	"🦈",
	"🐧",
	"🦅",
	"🪶",
	"🐦",
	"🐓",
	"🦍",
	"🐒",
	"🐐",
	"🐑",
	"🐖",
	"🐄",
	"🦬",
	"🐕",
	"🐢",
	"🐉",
	"🦎",
	"🐍",
	"🐷",
	"🦁",
	"🐺",
	"🐶",
	"🐱"
];

export type IconPickerTab =
	| "emoji"
	| "pokemon"
	| "type"
	| "raid"
	| "invasion"
	| "item"
	| "misc"
	| "poi";

export type IconPickerItem = {
	key: string;
	iconUrl?: string;
	emoji?: string;
	label: string;
	category: IconCategory | "emoji";
	params: Record<string, any>;
};

export const PICKER_TABS: { id: IconPickerTab; labelKey: keyof typeof m }[] = [
	{ id: "emoji", labelKey: "icon_picker_emoji" },
	{ id: "pokemon", labelKey: "pogo_pokemon" },
	{ id: "raid", labelKey: "icon_picker_raid" },
	{ id: "invasion", labelKey: "icon_picker_invasion" },
	{ id: "poi", labelKey: "icon_picker_poi" },
	{ id: "item", labelKey: "icon_picker_item" },
	{ id: "type", labelKey: "icon_picker_type" },
	{ id: "misc", labelKey: "icon_picker_misc" }
];

const TYPE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const INVASION_IDS = [
	4, 5, 41, 42, 43, 44, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
	27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 47, 48, 49, 50
];

const ALL_RAID_LEVELS = [1, 11, 3, 13, 4, 14, 5, 15, 6, 7, 8, 9, 10];

const LEAGUE_VALUES: League[] = [League.LITTLE, League.GREAT, League.ULTRA, League.MASTER];

function getLeagueLabel(league: League): string {
	switch (league) {
		case League.LITTLE:
			return m.little_league();
		case League.GREAT:
			return m.great_league();
		case League.ULTRA:
			return m.ultra_league();
		case League.MASTER:
			return m.master_league();
	}
}

function getTeamLabel(teamId: number): string {
	switch (teamId) {
		case 0:
			return m.team_neutral();
		case 1:
			return m.team_mystic();
		case 2:
			return m.team_valor();
		case 3:
			return m.team_instinct();
		default:
			return m.team_neutral();
	}
}

export function getEmojiItems(): IconPickerItem[] {
	return COMMON_EMOJIS.map((e) => ({
		key: `emoji-${e}`,
		emoji: e,
		label: e,
		category: "emoji" as const,
		params: { emoji: e }
	}));
}

let _allSearchableEmojis: IconPickerItem[] | null = null;

export function getAllSearchableEmojis(): IconPickerItem[] {
	if (_allSearchableEmojis) return _allSearchableEmojis;
	_allSearchableEmojis = Object.entries(emojilib).map(([emoji, keywords]) => ({
		key: `emoji-${emoji}`,
		emoji,
		label: keywords.join(", "),
		category: "emoji" as const,
		params: { emoji }
	}));
	return _allSearchableEmojis;
}

export function getPokemonIcons(): IconPickerItem[] {
	return getAllPokemon().map((p) => ({
		key: `pokemon-${p.pokemon_id}-${p.form}`,
		iconUrl: getIconPokemon(p),
		label: mPokemon(p),
		category: IconCategory.POKEMON,
		params: { pokemon_id: p.pokemon_id, form: p.form }
	}));
}

export function getTypeIcons(): IconPickerItem[] {
	return TYPE_IDS.map((id) => ({
		key: `type-${id}`,
		iconUrl: getIconType(id),
		label: mType(id),
		category: IconCategory.TYPE,
		params: { type: id }
	}));
}

export function getRaidIcons(): IconPickerItem[] {
	return ALL_RAID_LEVELS.flatMap((level) => [
		{
			key: `raid-${level}-egg`,
			iconUrl: getIconRaidEgg(level, false),
			label: mRaid(level),
			category: IconCategory.RAID,
			params: { level, hatched: false }
		}
	]);
}

export function getInvasionIcons(): IconPickerItem[] {
	return INVASION_IDS.map((character) => ({
		key: `invasion-${character}`,
		iconUrl: getIconInvasion(character, true),
		label: mCharacter(character),
		category: IconCategory.INVASION,
		params: { character, confirmed: true }
	}));
}

export function getItemIcons(): IconPickerItem[] {
	const masterFile = getMasterFile();
	if (!masterFile?.items) return [];

	return masterFile.items
		.filter((itemId) => Number(itemId) < 1600)
		.map((itemId) => {
			const id = Number(itemId);
			return {
				key: `item-${id}`,
				iconUrl: getIconItem(id),
				label: mItem(id),
				category: IconCategory.ITEM,
				params: { item: id, amount: 0 }
			};
		});
}

export function getMiscIcons(): IconPickerItem[] {
	const items: IconPickerItem[] = [];

	LEAGUE_VALUES.forEach((league) => {
		items.push({
			key: `league-${league}`,
			iconUrl: getIconLeague(league),
			label: getLeagueLabel(league),
			category: IconCategory.LEAGUE,
			params: { league }
		});
	});

	// Teams
	for (let i = 0; i <= 3; i++) {
		items.push({
			key: `misc-team-${i}`,
			iconUrl: getIconTeam(i),
			label: getTeamLabel(i),
			category: IconCategory.MISC,
			params: { misc_type: "team", team: i }
		});
	}

	// Stardust
	items.push({
		key: "misc-stardust",
		iconUrl: getIconReward(RewardType.STARDUST, { amount: 0 }),
		label: m.stardust(),
		category: IconCategory.MISC,
		params: { misc_type: "stardust" }
	});

	// Candy (Pikachu)
	items.push({
		key: "misc-candy",
		iconUrl: getIconReward(RewardType.CANDY, { pokemon_id: 25 }),
		label: m.candy(),
		category: IconCategory.MISC,
		params: { misc_type: "candy", pokemon_id: 25 }
	});

	// XL Candy (Pikachu)
	items.push({
		key: "misc-xl-candy",
		iconUrl: getIconReward(RewardType.XL_CANDY, { pokemon_id: 25 }),
		label: m.xl_candy(),
		category: IconCategory.MISC,
		params: { misc_type: "xl_candy", pokemon_id: 25 }
	});

	// Mega Energy
	items.push({
		key: "misc-mega-resource",
		iconUrl: getIconReward(RewardType.MEGA_ENERGY, { amount: 0 }),
		label: m.mega_energy(),
		category: IconCategory.MISC,
		params: { misc_type: "mega_resource" }
	});

	return items;
}

export function getPoiIcons(): IconPickerItem[] {
	const items: IconPickerItem[] = [];

	// Pokestops - base variants
	const pokestopVariants: {
		key: string;
		label: string;
		lure_id: number;
		display_type: number | false;
		quest_active: boolean;
		ar: boolean;
	}[] = [
		{
			key: "pokestop-base",
			label: m.pogo_pokestop(),
			lure_id: 0,
			display_type: false,
			quest_active: false,
			ar: false
		},
		{
			key: "pokestop-ar",
			label: m.poi_pokestop_ar(),
			lure_id: 0,
			display_type: false,
			quest_active: false,
			ar: true
		},
		{
			key: "pokestop-invasion",
			label: m.poi_pokestop_invasion(),
			lure_id: 0,
			display_type: 1,
			quest_active: false,
			ar: false
		},
		{
			key: "pokestop-gold",
			label: m.poi_pokestop_gold(),
			lure_id: 0,
			display_type: 7,
			quest_active: false,
			ar: false
		},
		{
			key: "pokestop-kecleon",
			label: m.poi_pokestop_kecleon(),
			lure_id: 0,
			display_type: 8,
			quest_active: false,
			ar: false
		},
		{
			key: "pokestop-contest",
			label: m.poi_pokestop_contest(),
			lure_id: 0,
			display_type: 9,
			quest_active: false,
			ar: false
		}
	];

	// Lured pokestops
	const lureIds = [501, 502, 503, 504, 505, 506];
	for (const lureId of lureIds) {
		pokestopVariants.push({
			key: `pokestop-lure-${lureId}`,
			label: m.poi_pokestop_lured({ lure: mItem(lureId) }),
			lure_id: lureId,
			display_type: false,
			quest_active: false,
			ar: false
		});
	}

	for (const v of pokestopVariants) {
		items.push({
			key: v.key,
			iconUrl: getIconPokestopDirect(v.lure_id, v.display_type, v.quest_active, v.ar),
			label: v.label,
			category: IconCategory.POKESTOP,
			params: {
				lure_id: v.lure_id,
				display_type: v.display_type,
				quest_active: v.quest_active,
				ar: v.ar
			}
		});
	}

	// Gyms
	for (let i = 0; i <= 3; i++) {
		items.push({
			key: `gym-${i}`,
			iconUrl: getIconGymDirect(i),
			label: m.poi_gym_team({ team: getTeamLabel(i) }),
			category: IconCategory.GYM,
			params: { team_id: i }
		});
	}

	// Stations
	items.push({
		key: "station-inactive",
		iconUrl: getIconStation(false),
		label: m.poi_station_inactive(),
		category: IconCategory.STATION,
		params: { active: false }
	});
	items.push({
		key: "station-active",
		iconUrl: getIconStation(true),
		label: m.poi_station_active(),
		category: IconCategory.STATION,
		params: { active: true }
	});

	return items;
}

function deduplicateByIconUrl(items: IconPickerItem[]): IconPickerItem[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (!item.iconUrl) return true;
		if (seen.has(item.iconUrl)) return false;
		seen.add(item.iconUrl);
		return true;
	});
}

export function getAllIconsByTab(): Record<IconPickerTab, IconPickerItem[]> {
	return {
		emoji: getEmojiItems(),
		pokemon: deduplicateByIconUrl(getPokemonIcons()),
		type: deduplicateByIconUrl(getTypeIcons()),
		raid: deduplicateByIconUrl(getRaidIcons()),
		invasion: deduplicateByIconUrl(getInvasionIcons()),
		item: deduplicateByIconUrl(getItemIcons()),
		misc: deduplicateByIconUrl(getMiscIcons()),
		poi: deduplicateByIconUrl(getPoiIcons())
	};
}

export function isValidSingleEmoji(input: string): boolean {
	if (!input) return false;
	try {
		const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
		const segments = [...segmenter.segment(input)];
		if (segments.length !== 1) return false;
		return /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(input);
	} catch {
		return false;
	}
}
