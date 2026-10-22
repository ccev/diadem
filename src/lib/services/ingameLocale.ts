import { getLocale } from "@/lib/i18n/locale";
import { getMasterPokemon } from "@/lib/services/masterfile";
import { RaidLevel } from "@/lib/utils/gymUtils";
import { formatNumber } from "@/lib/utils/numberFormat";
import { League } from "@/lib/utils/pokemonUtils";
import { Character, INVASION_CHARACTER_LEADERS } from "@/lib/utils/pokestopUtils";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

export const prefixes = {
	pokemon: "poke_",
	form: "form_",
	weather: "weather_",
	type: "poke_type_",
	item: "item_",
	raid: "raid_",
	move: "move_",
	alignment: "alignment_",
	generation: "generation_",
	quest: "quest_title_",
	character: "grunt_a_",
	routetag: "route_tag_"
};

let remoteLocales: { [key: string]: { [key: string]: string } } = {};

export async function loadRemoteLocale(languageTag: string, thisFetch: typeof fetch = fetch) {
	if (Object.keys(remoteLocales).includes(languageTag)) return;

	const result = await thisFetch("/api/locale/" + languageTag, { headers: getHeaders() });
	const data = await parseResponse<Record<string, string>>(result);
	remoteLocales[languageTag] = data;
}

function getIngameLocale() {
	const languageTag = getLocale();
	return remoteLocales[languageTag] ?? Object.values(remoteLocales)[0] ?? {};
}

function mIngame(key: string): string {
	return getIngameLocale()[key] ?? "";
}

/**
 * Base method to translate basic IDs
 *  - if no ID is given, return "unknown X"
 *  - if translation is missing, return "unknown X" or defaultName if given
 * @param name name, from the prefixes object
 * @param id the ID to translate, can be nullish
 * @param defaultName placeholder for missing translations, defaults to "unknown X"
 * @param plural I true, append "_plural"
 */
function mBasicId(
	name: keyof typeof prefixes,
	id?: string | number | null,
	defaultName?: string | null,
	plural: boolean = false
): string {
	const suffix = plural ? "_plural" : "";
	const localeString = id ? mIngame(prefixes[name] + id + suffix) : "";
	if (localeString) return localeString;
	if (defaultName != null) return defaultName;
	return {
		pokemon: "Unknown Pokémon",
		form: "Unknown Form",
		weather: "Unknown Weather",
		type: "Unknown Type",
		item: "Unknown Item",
		raid: "Unknown Raid",
		move: "Unknown Move",
		alignment: "Unknown Alignment",
		generation: "Unknown Generation",
		quest: "Unknown Quest",
		character: "Unknown Grunt",
		routetag: "Unknown Route Tag"
	}[name];
}

/**
 * Get the full, localized name of a pokemon
 * @param data The Pokemon Data
 */
export function mPokemon(data: {
	pokemon_id?: number | null | undefined;
	temp_evolution_id?: number | null | undefined;
	form?: number | null | undefined;
	alignment?: number | null | undefined;
	bread_mode?: number | null | undefined;
	shiny?: number | boolean | null | undefined;
}) {
	if (!data.pokemon_id) return "Unknown Pokémon";

	// base pokemon name
	let key = prefixes.pokemon + data.pokemon_id;

	let name = mIngame(key);

	// get full name if it's a temp evolution
	if (data.temp_evolution_id) key += "_e" + data.temp_evolution_id;

	const newName = mIngame(key);
	if (newName) name = newName;

	if (!name) return "Unknown Pokémon";

	// add sparkles if shiny
	if (data.shiny) name += " ✨";

	// form name
	const masterPokemon = getMasterPokemon(data.pokemon_id, data.form, data.temp_evolution_id);

	if (masterPokemon && data.form) {
		if (masterPokemon.name === /* @wc-ignore */ "Alola") {
			name = `Alolan ${name}`;
		} else if (masterPokemon.name === /* @wc-ignore */ "Galarian") {
			name = `Galarian ${name}`;
		} else if (masterPokemon.name === /* @wc-ignore */ "Hisuian") {
			name = `Hisuian ${name}`;
		} else {
			const formName = data.form ? mIngame(prefixes.form + data.form) : "";
			if (formName) name += " (" + formName + ")";
		}
	}

	// add shadow prefix
	if (data.alignment === 1) {
		const alignmentName = mAlignment(1);
		if (alignmentName) name = alignmentName + " " + name;
	}

	// get dynamax/gigantamax names
	if (data.bread_mode === 1) {
		name = `Dynamax ${name}`;
	} else if (data.bread_mode === 2) {
		name = `Gigantamax ${name}`;
	}

	return name;
}

/**
 * Get localized quest task
 * @param questTitle The quest title
 * @param target The quest target
 */
export function mQuest(questTitle?: string | null, target?: number | null) {
	// get basic quest text
	let questText = mBasicId(
		"quest",
		questTitle?.toLowerCase(),
		questTitle?.toLowerCase()?.replaceAll("_", " ") ?? "Unknown Quest"
	);

	const formattedNumber = target ? formatNumber(target) : "";

	// insert the target into the quest text
	questText = questText.replaceAll("%{amount_0}", formattedNumber);

	// remove periods at end
	questText = questText.replace(/\.+$/, "");

	return questText;
}

/**
 * Get localized weather
 * @param weatherId The weather ID
 */
export function mWeather(weatherId?: number | string | null) {
	return mBasicId("weather", weatherId);
}

/**
 * Get localized pokemon type
 * @param typeId
 */
export function mType(typeId?: number | string | null) {
	return mBasicId("type", typeId);
}

/**
 * Get localized item
 * @param itemId
 */
export function mItem(itemId?: number | string | null) {
	return mBasicId("item", itemId);
}

/**
 * Get localized raid level
 * @param raidLevel
 * @param plural
 */
export function mRaid(raidLevel?: number | string | null, plural: boolean = false) {
	if (raidLevel) {
		raidLevel = Number(raidLevel) as RaidLevel;
		if (raidLevel === RaidLevel.SHADOW_LEGENDARY) {
			return plural ? "Legendary Shadow Raids" : "Legendary Shadow Raid";
		} else if (raidLevel >= RaidLevel.STAR_1 && raidLevel < RaidLevel.LEGENDARY) {
			return plural ? `${raidLevel}-Star Raids` : `${raidLevel}-Star Raid`;
		} else if (raidLevel >= RaidLevel.SHADOW_STAR_1 && raidLevel < RaidLevel.SHADOW_LEGENDARY) {
			return plural ? `${raidLevel - 10}-Star Shadow Raids` : `${raidLevel - 10}-Star Shadow Raid`;
		} else if (raidLevel === RaidLevel.MEGA_SUPER) {
			return plural ? "Super Mega Raids" : "Super Mega Raid";
		} else if (raidLevel === RaidLevel.MEGA_SUPER_LEGENDARY) {
			return plural ? "Legendary Super Mega Raids" : "Legendary Super Mega Raid";
		} else if (raidLevel === RaidLevel.UNITY_1 || raidLevel === RaidLevel.UNITY_2) {
			return plural ? "Unity Raids" : "Unity Raid";
		}
	}

	return mBasicId("raid", raidLevel, undefined, plural);
}

/**
 * Get localized move
 * @param moveId
 */
export function mMove(moveId?: number | string | null) {
	return mBasicId("move", moveId);
}

/**
 * Get localized pokemon alignment
 * @param alignmentId
 */
export function mAlignment(alignmentId?: number | string | null) {
	return mBasicId("alignment", alignmentId);
}

/**
 * Get localized pokemon generation
 * @param generationId
 */
export function mGeneration(generationId?: number | string | null) {
	return mBasicId("generation", generationId);
}

export function mCharacter(
	characterId?: number | string | null,
	options:
		| {
				plural?: boolean;
				confirmed?: boolean | null;
		  }
		| undefined = undefined
) {
	if (!characterId) return "Unknown Grunt";

	characterId = Number(characterId);
	if (characterId === Character.GRUNT_MALE) {
		return options?.plural ? "Male Grunts" : "Male Grunt";
	} else if (characterId === Character.GRUNT_FEMALE) {
		return options?.plural ? "Female Grunts" : "Female Grunt";
	}

	if (characterId === 44 && !options?.confirmed) {
		return "Giovanni or Decoy";
	}

	let character = mBasicId("character", characterId);

	if (
		INVASION_CHARACTER_LEADERS.includes(Number(characterId)) &&
		characterId !== Character.DECOY_MALE &&
		characterId !== Character.DECOY_FEMALE
	) {
		return character;
	}

	if (character.includes(" ♀")) {
		character = `Female ${character.replace("♀", "")}`;
	} else if (character.includes(" ♂")) {
		character = `Male ${character.replace("♂", "")}`;
	}

	if (characterId === Character.DECOY_FEMALE || characterId === Character.DECOY_MALE) {
		character = "Decoy";
	}

	return options?.plural
		? /* @wc-context: Grunt type */ `${character} Grunts`
		: `${character} Grunt`;
}

export function mLeague(league: League) {
	if (league === League.LITTLE) return "Little League";
	if (league === League.GREAT) return "Great League";
	if (league === League.ULTRA) return "Ultra League";
	if (league === League.MASTER) return "Master League";
	return "Unknown League";
}

export function mTeam(teamId: number | undefined) {
	switch (teamId) {
		case 1:
			return "Mystic";
		case 2:
			return "Valor";
		case 3:
			return "Instinct";
		default:
			return "Neutral";
	}
}

export function mRouteTag(value: string) {
	value = value.replace(/^route_tag_/, "");
	const label = mBasicId("routetag", value, "");
	if (label) return label;

	const fallback = value.replaceAll("_", " ");
	return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}
