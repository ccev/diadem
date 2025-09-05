import type { MasterFile } from '@/lib/types/masterfile';
import { getUserSettings } from '@/lib/services/userSettings.svelte.js';
import * as m from "@/lib/paraglide/messages"
import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import { resolveLanguageTag } from '@/lib/services/i18n';

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
}

let remoteLocales: { [key: string]: { [key: string]: string } } = {}

export async function loadRemoteLocale(languageTag: string, thisFetch: typeof fetch = fetch) {
	if (Object.keys(remoteLocales).includes(languageTag)) return

	const result = await thisFetch("/api/locale/" + languageTag)
	const data = await result.json()
	remoteLocales[languageTag] = data
}

function mIngame(key: string): string {
	const languageTag = resolveLanguageTag(getUserSettings().languageTag)
	let locale = remoteLocales[languageTag]

	if (!locale) {
		const allRemoteLocales = Object.values(remoteLocales)

		if (allRemoteLocales) {
			locale = allRemoteLocales[0]
		} else {
			return ""
		}
	}

	return locale[key] ?? ""
}

/**
 * Base method to translate basic IDs
 *  - if no ID is given, return "unknown X"
 *  - if translation is missing, return "unknown X" or defaultName if given
 * @param name name, from the prefixes object. an "unknown_{name}" paraglide message must exist
 * @param id the ID to translate, can be nullish
 * @param defaultName placeholder for missing translations, defaults to "unknown X"
 */
function mBasicId(name: keyof typeof prefixes, id?: string | number | null, defaultName?: string  | null): string {
	// @ts-ignore dynamic message
	if (!id) return m["unknown_" + name]()

	const localeString = mIngame(prefixes[name] + id)

	// @ts-ignore dynamic message
	if (!localeString) return defaultName ?? m["unknown_" + name]()

	return localeString
}

/**
 * Get the full, localized name of a pokemon
 * @param data The Pokemon Data
 */
export function mPokemon(data: Partial<PokemonData>) {
	if (!data.pokemon_id) return m.unknown_pokemon()

	// base pokemon name
	let key = prefixes.pokemon + data.pokemon_id

	// get full name if it's a temp evolution
	if (data.temp_evolution_id) key += "_e" + data.temp_evolution_id

	let name = mIngame(key)
	if (!name) return m.unknown_pokemon()

	// add sparkles if shiny
	if (data.shiny) name += " ✨"

	// if it's a special form, append in ()
	const normalFormName = mIngame(prefixes.form + "45")
	const formName = data.form ? mIngame(prefixes.form + data.form) : ""
	if (formName && formName !== normalFormName) name += " (" + formName + ")"

	// get dynamax/gigantamax names
	if (data.bread_mode === 1) {
		name = m.pogo_dynamax_pokemon({ pokemon: name })
	} else if (data.bread_mode === 2) {
		name = m.pogo_gigantamax_pokemon({ pokemon: name })
	}

	return name
}

/**
 * Get localized quest task
 * @param questTitle The quest title
 * @param target The quest target
 */
export function mQuest(questTitle?: string | null, target?: number | null) {
	// get basic quest text
	let questText = mBasicId("quest", questTitle, questTitle)

	// insert the target into the quest text
	questText = questText.replaceAll("%{amount_0}", "" + (target ?? ""))

	return questText
}

/**
 * Get localized weather
 * @param weatherId The weather ID
 */
export function mWeather(weatherId?: number | string | null) {
	return mBasicId("weather", weatherId)
}

/**
 * Get localized pokemon type
 * @param typeId
 */
export function mType(typeId?: number | string | null) {
	return mBasicId("type", typeId)
}

/**
 * Get localized item
 * @param itemId
 */
export function mItem(itemId?: number | string | null) {
	return mBasicId("item", itemId)
}

/**
 * Get localized raid level
 * @param raidLevel
 */
export function mRaid(raidLevel?: number | string | null) {
	return mBasicId("raid", raidLevel)
}

/**
 * Get localized move
 * @param moveId
 */
export function mMove(moveId?: number | string | null) {
	return mBasicId("move", moveId)
}

/**
 * Get localized pokemon alignment
 * @param alignmentId
 */
export function mAlignment(alignmentId?: number | string | null) {
	return mBasicId("alignment", alignmentId)
}

/**
 * Get localized pokemon generation
 * @param generationId
 */
export function mGeneration(generationId?: number | string | null) {
	return mBasicId("generation", generationId)
}

/**
 * Get localized grunt character
 * @param characterId
 */
export function mCharacter(characterId?: number | string | null) {
	return mBasicId("character", characterId)
}