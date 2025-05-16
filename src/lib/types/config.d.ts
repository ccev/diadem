import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

type UiconSetModifiers = {
	default: boolean,
	scale?: number,
	offsetX?: number,
	offsetY?: number,
	name?: string,
	spacing?: number
}

export type UiconSetModifierType = MapObjectType
	| "quest"
	| "invasion"
	| "raid_pokemon"
	| "raid_pokemon_6"
	| "raid_egg"
	| "raid_egg_6"

export type UiconSet = {
	id: string
	name: string
	url: string
	base: UiconSetModifiers | undefined
} & {
	[key in UiconSetModifierType]: UiconSetModifiers | boolean | undefined
}

type General = {
	mapName: string
}

export type ClientConfig = {
	mapStyles: {
		id: string
		name: string
		url: string
	}[]
	uiconSets: UiconSet[]
	general: General
}

export type ServerConfig = {
	golbat: {
		url: string
		auth: string
	}
	db?: {
		host: string
		port: number
		database: string
		user: string
		password: string
	}
	koji?: {
		url: string
		secret: string
		projectName: string
	}
	nominatim?: {
		url: string
		basicAuth?: string
	}
}

export type Config = {
	server: ServerConfig
	client: ClientConfig
}