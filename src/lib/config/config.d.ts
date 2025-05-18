import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
import type { FeaturesKey } from '@/lib/server/auth/permissions';

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
	serverLink: string
}

type Permissions = {
	everyone?: boolean
	loggedIn?: boolean
	guildId?: string
	roleId?: string
	areas?: string[]
	features?: FeaturesKey[]
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
	internalDb: DbCreds
	auth: Auth
	permissions?: Permissions[]
}

export type Config = {
	server: ServerConfig
	client: ClientConfig
}