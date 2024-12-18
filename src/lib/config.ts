// import {parse} from "toml"
// import {readFile} from 'node:fs/promises';
//
// const rawToml = await readFile("config.toml", "utf-8")
// const config: Config = parse(rawToml)

export type UiconSet = {
	id: string
	name: string
	url: string
	scale: number
}

export type Config = {
	mapStyles: {
		id: string
		name: string
		url: string
	}[]
	uiconSets: UiconSet[]
}

const config: Config = {
	mapStyles: [
		{
			id: "positron",
			name: "Positron",
			url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
		},
		{
			id: "dark",
			name: "Dark",
			url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
		},
		{
			id: "voyager",
			name: "Voyager",
			url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
		},
	],
	uiconSets: [
		{
			id: "pogoOutline",
			name: "Default",
			url: "https://raw.githubusercontent.com/whitewillem/PogoAssets/refs/heads/main/uicons-outline/",
			scale: 0.25
		},
		{
			id: "home",
			name: "Home",
			url: "https://raw.githubusercontent.com/nileplumb/PkmnHomeIcons/master/UICONS/",
			scale: 0.05
		},
		{
			id: "shuffle",
			name: "Shuffle",
			url: "https://raw.githubusercontent.com/nileplumb/PkmnShuffleMap/master/UICONS/",
			scale: 0.25
		},
		{
			id: "shuffleShiny",
			name: "Shiny",
			url: "https://raw.githubusercontent.com/jms412/PkmnShuffleMap/master/UICONS_Half_Shiny_128/",
			scale: 0.25
		},
		// {
		// 	id: "cage",
		// 	name: "Cage",
		// 	url: "https://raw.githubusercontent.com/RagingRectangle/CageMons/main",
		// 	scale: 0.035
		// },
	]
}

export function getConfig() {
	return config
}