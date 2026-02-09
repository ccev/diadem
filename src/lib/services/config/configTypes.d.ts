import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

import type { FeaturesKey } from "@/lib/utils/features";

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
	| "max_battle"
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
	defaultLocale: string
	customHome: boolean
	defaultLat?: number
	defaultLon?: number
	defaultZoom?: number
}

export type DbCreds = {
	host: string
	port: number
	database: string
	user: string
	password: string
}

type Auth = {
	enabled: boolean
	optional: boolean
	discord?: AuthDiscord
}

type AuthDiscord = {
	clientId: string
	clientSecret: string
	redirectUri: string
}

type ClientDiscord = {
	serverLink: string
	serverId: string
}

export type Permissions = {
	everyone?: boolean
	loggedIn?: boolean
	guildId?: string
	roleId?: string
	areas?: string[]
	features?: FeaturesKey[]
}

export type Log = {
	level: string
	file?: string
}

export type MapStyle = {
	id: string
	name: string
	url: string
	default?: "dark" | "light"
}

type MapPositions = {
	styleLat: number
	styleLon: number
	styleZoom: number
	coverageLat: number
	coverageLon: number
	coverageZoom: number
}

export type ClientConfig = {
	mapStyles: MapStyle[]
	uiconSets: UiconSet[]
	general: General,
	discord: ClientDiscord,
	mapPositions: MapPositions,
	tools: {
		showToolsMenu: boolean
		coverageMap: boolean
		scout: boolean
		stats: boolean
	}
}

export type ServerConfig = {
	golbat: {
		url: string
		auth?: string
		secret?: string
		defaultNestName?: string
	}
	dragonite: {  // TODO: this should be optional and scout disabled
		url: string
		secret?: string
		basicAuth?: string
	}
	db: DbCreds
	koji?: {
		url: string
		secret: string
		projectName: string
	}
	nominatim?: {
		url: string
		basicAuth?: string
	}
	pelias?: {
		url: string
		apiKey?: string
		basicAuth?: string
	}
	log: Log
	internalDb: DbCreds
	auth: Auth
	permissions?: Permissions[]
}

export type Config = {
	server: ServerConfig
	client: ClientConfig
}
