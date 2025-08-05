import { json } from '@sveltejs/kit';
import {env} from '$env/dynamic/private'
import { getServerConfig } from '@/lib/config/config.server';
import { hasFeatureAnywhere, noPermResult } from '@/lib/user/checkPerm';
import { prefixes as localePrefixesObject } from '@/lib/ingameLocale';
import { AVAILABLE_LANGUAGES } from '@/lib/constants';
import TTLCache from '@isaacs/ttlcache';

type RemoteLocale = { [key: string]: string }

const allowedLanguages = AVAILABLE_LANGUAGES.map(v => v.value)
const url = "https://raw.githubusercontent.com/WatWowMap/pogo-translations/refs/heads/master/static/locales/{}.json"
const allowedPrefixes = Object.keys(localePrefixesObject)
const updateCache: TTLCache<string, undefined> = new TTLCache({ ttl: 24 * 60 * 60 * 1000 })  // update once per day

let remoteLocales: { [key: string]: RemoteLocale } = {}

let initialUpdatePromise: Promise<void> | undefined = updateAllRemoteLocales()
initialUpdatePromise.then(() => initialUpdatePromise = undefined)

async function updateAllRemoteLocales() {
	await Promise.all(allowedLanguages.map(tag => {
		return loadRemoteLocale(tag)
	}))
}

async function loadRemoteLocale(languageTag: string) {
	if (!allowedLanguages.includes(languageTag)) return

	if (updateCache.has(languageTag)) return
	updateCache.set(languageTag, undefined)

	console.log("Updating remote locale: " + languageTag)

	const result = await fetch(url.replaceAll("{}", languageTag))
	const data: RemoteLocale = await result.json()

	const remoteLocale: RemoteLocale  = {}

	for (const [key, value] of Object.entries(data)) {
		for (const allowedPrefix of allowedPrefixes) {
			if (key.startsWith(allowedPrefix)) {
				remoteLocale[key] = value
				break
			}
		}
	}

	remoteLocales[languageTag] = remoteLocale
	console.log("Successfully updated remote locale: " + languageTag)
}

export async function GET({ params }) {
	// update locale in the background (only once per 24h)
	loadRemoteLocale(params.tag).then()

	// if called shortly after startup, this should await the initial load
	if (initialUpdatePromise) await initialUpdatePromise

	return json(remoteLocales[params.tag] ?? {});
}
