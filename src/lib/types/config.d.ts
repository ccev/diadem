import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';

export type UiconSet = {
	id: string
	name: string
	url: string
	use: MapObjectType[]
	scale: {[key in MapObjectType | "base"]: number} | number
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