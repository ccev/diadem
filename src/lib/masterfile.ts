import type { MasterFile, MasterPokemon } from '@/lib/types/masterfile';

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

export function getMasterPokemon(pokemonId: string | number) : MasterPokemon | undefined {
	return masterFile.pokemon["" + pokemonId]
}
