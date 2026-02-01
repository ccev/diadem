export type MasterPokemon = {
	name: string
	forms: { [key: string]: MasterPokemon }
	isCostume?: boolean
	unreleased?: boolean
	legendary: boolean
	mythical: boolean
	ultraBeast: boolean
	defaultFormId?: number
}

export type MasterWeather = {
	name: string
	types: number[]
}

export type MasterFile = {
	pokemon: { [key: string]: MasterPokemon }
	weather: { [key: string]: MasterWeather }
}
