import * as m from "@/lib/paraglide/messages";
import { getLocale } from "@/lib/paraglide/runtime";
import { SearchableType, type SearchEntry } from "@/lib/services/search.svelte";
import { getIconPokemon } from "@/lib/services/uicons.svelte";
import { formatNumber } from "@/lib/utils/numberFormat";
import { INVASION_CHARACTER_LEADERS, INVASION_CHARACTER_NOTYPES } from "@/lib/utils/pokestopUtils";
import { getMasterPokemon } from "@/lib/services/masterfile";
import { RaidLevel } from "@/lib/utils/gymUtils";

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
	character: "grunt_a_"
};

let remoteLocales: { [key: string]: { [key: string]: string } } = {};

export async function loadRemoteLocale(languageTag: string, thisFetch: typeof fetch = fetch) {
	if (Object.keys(remoteLocales).includes(languageTag)) return;

	const result = await thisFetch("/api/locale/" + languageTag);
	const data = await result.json();
	remoteLocales[languageTag] = data;
}

function getIngameLocale() {
	const languageTag = getLocale();
	let locale = remoteLocales[languageTag];

	if (!locale) {
		const allRemoteLocales = Object.values(remoteLocales);

		if (allRemoteLocales) {
			locale = allRemoteLocales[0];
		} else {
			return {};
		}
	}

	return locale;
}

function mIngame(key: string): string {
	return getIngameLocale()[key] ?? "";
}

/**
 * Base method to translate basic IDs
 *  - if no ID is given, return "unknown X"
 *  - if translation is missing, return "unknown X" or defaultName if given
 * @param name name, from the prefixes object. an "unknown_{name}" paraglide message must exist
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
	// @ts-ignore dynamic message
	if (!id) return m["unknown_" + name]();

	const suffix = plural ? "_plural" : "";

	const localeString = mIngame(prefixes[name] + id + suffix);

	// @ts-ignore dynamic message
	if (!localeString) return defaultName ?? m["unknown_" + name]();

	return localeString;
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
	if (!data.pokemon_id) return m.unknown_pokemon();

	// base pokemon name
	let key = prefixes.pokemon + data.pokemon_id;

	let name = mIngame(key);

	// get full name if it's a temp evolution
	if (data.temp_evolution_id) key += "_e" + data.temp_evolution_id;

	const newName = mIngame(key);
	if (newName) name = newName;

	if (!name) return m.unknown_pokemon();

	// add sparkles if shiny
	if (data.shiny) name += " ✨";

	// form name
	const masterPokemon = getMasterPokemon(data.pokemon_id, data.form, data.temp_evolution_id);

	if (masterPokemon && data.form) {
		if (masterPokemon.name === "Alola") {
			name = m.alolan_pokemon({ name });
		} else if (masterPokemon.name === "Galarian") {
			name = m.galarian_pokemon({ name });
		} else if (masterPokemon.name === "Hisuian") {
			name = m.hisuian_pokemon({ name });
		} else {
			const formName = data.form ? mIngame(prefixes.form + data.form) : "";
			if (formName) name += " (" + formName + ")";
		}
	}

	// get dynamax/gigantamax names
	if (data.bread_mode === 1) {
		name = m.pogo_dynamax_pokemon({ pokemon: name });
	} else if (data.bread_mode === 2) {
		name = m.pogo_gigantamax_pokemon({ pokemon: name });
	}

	return name;
}

/**
 * Get localized quest task
 * @param questTitle The quest title
 * @param target The quest target
 */
export function mQuest(questTitle?: string | null, target?: number | null) {
	if (questTitle?.toLowerCase() === "geotarget_quest_description") return m.geotarget_quest();

	// get basic quest text
	let questText = mBasicId(
		"quest",
		questTitle?.toLowerCase(),
		questTitle?.toLowerCase()?.replaceAll("_", " ") ?? m.unknown_quest()
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
			return plural ? m.legendary_shadow_raids() : m.legendary_shadow_raid();
		} else if (raidLevel >= RaidLevel.STAR_1 && raidLevel < RaidLevel.LEGENDARY) {
			return plural ? m.x_star_raids({ level: raidLevel }) : m.x_star_raid({ level: raidLevel });
		} else if (raidLevel >= RaidLevel.SHADOW_STAR_1 && raidLevel < RaidLevel.SHADOW_LEGENDARY) {
			return plural
				? m.x_star_shadow_raids({ level: raidLevel - 10 })
				: m.x_star_shadow_raid({ level: raidLevel - 10 });
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

/**
 * Get localized grunt character
 * @param characterId
 */
export function mCharacter(characterId?: number | string | null) {
	const character = mBasicId("character", characterId);
	if (
		INVASION_CHARACTER_LEADERS.includes(Number(characterId)) ||
		INVASION_CHARACTER_NOTYPES.includes(Number(characterId))
	) {
		return character;
	}
	return m.character_grunt({ character });
}
