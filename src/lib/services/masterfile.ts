import type { MasterFile, MasterPokemon, MasterWeather } from '@/lib/types/masterfile';
import { getMasterStats, getPokemonStats } from "@/lib/features/masterStats.svelte";

const url = "https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/refs/heads/master/master-latest-react-map.json"
let masterFile: MasterFile

export async function loadMasterFile() {
	const result = await fetch(url)
	masterFile = await result.json()
}

export function defaultProp(obj: any | undefined, key: any, fallback: any): any {
	if (!obj) return fallback
	return obj[key] ?? fallback
}

export function getMasterFile() {
	return masterFile
}

export function getMasterPokemon(pokemonId: string | number): MasterPokemon | undefined {
	return masterFile.pokemon["" + pokemonId]
}

const blacklistBasePokemon = [
	412, 413,	// burmy
	421,		// cherrim
	422, 423,   // shellos
	669,		// flabebe
	676,		// furfrou
	710, 711,	// pumpkaboo
	741,		// oricorio
]
const blacklistForms = [
	25,			// pikachu
	327,		// spinda
	664, 665,	// scatterbug
]

export function getSpawnablePokemon(onlyActive: boolean = false): {pokemon_id: number, form: number}[] {
	const allPokemon: {pokemon_id: number, form: number}[] = []

	for (const [strPokemonId, pokemon] of Object.entries(masterFile.pokemon)) {
		if (pokemon.legendary || pokemon.mythical || pokemon.ultraBeast) continue

		const pokemonId = Number(strPokemonId)
		const defaultForm = pokemon.defaultFormId ?? 0

		if (!pokemon.unreleased && !blacklistBasePokemon.includes(pokemonId)) {
			if (!onlyActive || getPokemonStats(pokemonId, defaultForm)?.entry) {
				allPokemon.push({ pokemon_id: pokemonId, form: defaultForm })
			}
		}

		// specific pokemon to ignore the forms of
		if (blacklistForms.includes(pokemonId)) continue

		for (const [formIdRaw, form] of Object.entries(pokemon.forms)) {
			const formId = Number(formIdRaw)
			if (
				form.name !== "Normal"
				&& !form.name.includes("Costume")
				&& !form.name.includes("20")  // gets rid of year-specific forms
				&& !(form.isCostume ?? false)
				&& !form.unreleased
				&& (formId !== defaultForm)
				&& (!onlyActive || getPokemonStats(pokemonId, formId)?.entry)
			) {
				allPokemon.push({ pokemon_id: pokemonId, form: formId })
			}
		}
	}

	return [...allPokemon]
}

export function getMasterWeather(weatherId: string | number | undefined): MasterWeather | undefined {
	if (weatherId === undefined) return undefined

	return masterFile.weather["" + weatherId]
}