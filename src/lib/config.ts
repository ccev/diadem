import type {Config} from "@/lib/types/config"
// import {parse} from "toml"
// import {readFile} from 'node:fs/promises';
//
// const rawToml = await readFile("config.toml", "utf-8")
// const config: Config = parse(rawToml)

const config: Config = {
	mapStyles: [
		{
			id: "carto",
			name: "Carto",
			url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
		}
	],
	uiconSets: [
		{
			id: "pogoOutline",
			name: "Pogo (outline)",
			url: "https://raw.githubusercontent.com/whitewillem/PogoAssets/refs/heads/main/uicons-outline/"
		}
	]
}

export function getConfig() {
	return config
}