import type {Config} from "@/lib/types/config"
import {parse} from "toml"
import {readFile} from 'node:fs/promises';

// const rawToml = await readFile("config.toml", "utf-8")
// const config: Config = parse(rawToml)
//
// export function getConfig() {
// 	return config
// }