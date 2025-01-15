import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

type UiconSetModifiers = {
	default: boolean,
	scale?: number,
	offsetX?: number,
	offsetY?: number,
	name?: string,
}

export type UiconSet = {
	id: string
	name: string
	url: string
	base: UiconSetModifiers | undefined
} & {
	[key in MapObjectType]: UiconSetModifiers | boolean | undefined
}

export type Area = {
	name: string
	center: number[]
	zoom: number
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
	areas: Area[]
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
}

export type Config = {
	server: ServerConfig
	client: ClientConfig
}