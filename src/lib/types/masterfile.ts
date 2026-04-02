export type MasterPokemon = {
	name: string;
	forms: { [key: string]: MasterPokemon };
	tempEvos: { [key: string]: MasterPokemon };
	isCostume?: boolean;
	unreleased?: boolean;
	legendary: boolean;
	mythical: boolean;
	ultraBeast: boolean;
	defaultFormId?: number;
	types: [number] | [number, number];
	family: number;
	baseAtk: number;
	baseDef: number;
	baseSta: number;
};

export type MasterWeather = {
	types: number[];
};

export type MasterFile = {
	pokemon: { [key: string]: MasterPokemon };
	weather: { [key: string]: MasterWeather };
	items: string[];
};
