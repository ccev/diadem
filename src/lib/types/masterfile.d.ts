export type MasterPokemon = {
	[key: string]
	name: string
}

export type MasterWeather = {
	[key: string]
	name: string
	types: number[]
}

export type MasterFile = {
	pokemon: MasterPokemon
	weather: MasterWeather
}
