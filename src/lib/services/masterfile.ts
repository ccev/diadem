import type { MasterFile, MasterPokemon, MasterWeather } from "@/lib/types/masterfile";
import { getMasterStats, getPokemonStats } from "@/lib/features/masterStats.svelte";
import { browser } from "$app/environment";

const url = "/api/pogodata";
let masterFile: MasterFile;

export async function loadMasterFile() {
	const result = await fetch(url);
	masterFile = await result.json();
}

export function overwriteMasterfile(newMaster: MasterFile) {
	masterFile = newMaster;
}

export function defaultProp(obj: any | undefined, key: any, fallback: any): any {
	if (!obj) return fallback;
	return obj[key] ?? fallback;
}

export function getMasterFile() {
	return masterFile;
}

export function getMasterPokemon(
	pokemonId: string | number,
	formId: string | number | undefined | null = undefined,
	tempEvoId: string | number | undefined | null = undefined
): MasterPokemon | undefined {
	const pokemon = masterFile.pokemon["" + pokemonId];
	if (!formId && !tempEvoId) return pokemon;

	if (tempEvoId) {
		const tempEvo = pokemon.tempEvos["" + tempEvoId];
		if (tempEvo) return tempEvo;
	}

	if (formId) {
		const form = pokemon.forms["" + formId];
		if (form) return form;
	}

	return pokemon;
}

const blacklistBasePokemon = [
	412,
	413, // burmy
	421, // cherrim
	422,
	423, // shellos
	669, // flabebe
	676, // furfrou
	710,
	711, // pumpkaboo
	741 // oricorio
];
const blacklistForms = [
	25, // pikachu
	327, // spinda
	664,
	665 // scatterbug
];

export function getAllPokemon(onlyActive: boolean = false): { pokemon_id: number; form: number }[] {
	const allPokemon: { pokemon_id: number; form: number }[] = [];

	for (const [strPokemonId, pokemon] of Object.entries(masterFile.pokemon)) {
		if (pokemon.mythical || pokemon.ultraBeast) continue;

		const pokemonId = Number(strPokemonId);
		// const defaultForm = pokemon.defaultFormId ?? 0;

		if (!pokemon.unreleased && !blacklistBasePokemon.includes(pokemonId)) {
			if (!onlyActive || getPokemonStats(pokemonId, 0)?.entry) {
				allPokemon.push({ pokemon_id: pokemonId, form: 0 });
			}
		}

		// specific pokemon to ignore the forms of
		if (blacklistForms.includes(pokemonId)) continue;

		for (const [formIdRaw, form] of Object.entries(pokemon.forms)) {
			const formId = Number(formIdRaw);
			if (
				form.name !== "Normal" &&
				form.name !== "Unset" &&
				!form.name.includes("Costume") &&
				!form.name.includes("20") && // gets rid of year-specific forms
				!(form.isCostume ?? false) &&
				!form.unreleased &&
				(!onlyActive || getPokemonStats(pokemonId, formId)?.entry)
			) {
				allPokemon.push({ pokemon_id: pokemonId, form: formId });
			}
		}
	}

	return [...allPokemon];
}

export function getMasterWeather(
	weatherId: string | number | undefined
): MasterWeather | undefined {
	if (weatherId === undefined) return undefined;

	return masterFile.weather["" + weatherId];
}

export function getAllLureModuleIds(): number[] {
	return masterFile.items.filter((i) => i.startsWith("5")).map(Number);
}

const cpMultipliers = {
	10: 0.422500014305115,
	15: 0.517393946647644,
	20: 0.597400009632111,
	25: 0.667934000492096
};

export function calculateCp(
	level: keyof typeof cpMultipliers,
	pokemonId: number,
	formId: number,
	iv: [number, number, number] = [15, 15, 15]
) {
	const multiplier = cpMultipliers[level];
	const stats = getMasterPokemon(pokemonId, formId);

	if (!multiplier || !stats) return undefined;

	const attack = stats.baseAtk + iv[0];
	const defense = stats.baseDef + iv[1];
	const stamina = stats.baseSta + iv[2];

	return Math.floor(
		(attack * Math.sqrt(defense) * Math.sqrt(stamina) * Math.pow(multiplier, 2)) / 10
	);
}
