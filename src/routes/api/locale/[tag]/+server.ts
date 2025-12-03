import { json } from "@sveltejs/kit";
import { prefixes as localePrefixesObject } from "@/lib/services/ingameLocale";
import { AVAILABLE_LANGUAGES } from "@/lib/constants";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from "@/lib/server/logging";

type RemoteLocale = { [key: string]: string };

const log = getLogger("locale");

const allowedLanguages = AVAILABLE_LANGUAGES.map((v) => v.value);
const url =
	"https://raw.githubusercontent.com/WatWowMap/pogo-translations/refs/heads/master/static/locales/{}.json";
const allowedPrefixes = Object.values(localePrefixesObject);
const updateCache: TTLCache<string, undefined> = new TTLCache({ ttl: 24 * 60 * 60 * 1000 }); // update once per day

let remoteLocales: { [key: string]: RemoteLocale } = {};

let initialUpdatePromise: Promise<void> | undefined = updateAllRemoteLocales();
initialUpdatePromise.then(() => (initialUpdatePromise = undefined));

async function updateAllRemoteLocales() {
	await Promise.all(
		allowedLanguages.map((tag) => {
			return loadRemoteLocale(tag);
		})
	);
}

async function loadRemoteLocale(languageTag: string) {
	if (!allowedLanguages.includes(languageTag)) return;

	if (updateCache.has(languageTag)) return;
	updateCache.set(languageTag, undefined);

	log.info("[%s] Updating remote locale", languageTag);

	const result = await fetch(url.replaceAll("{}", languageTag));

	if (!result.ok) {
		log.crit("[%s] Fetching remote locale failed: %s", languageTag, await result.text());
		return;
	}

	const data: RemoteLocale = await result.json();

	const remoteLocale: RemoteLocale = {};

	for (const [key, value] of Object.entries(data)) {
		for (const allowedPrefix of allowedPrefixes) {
			if (key.startsWith(allowedPrefix)) {
				remoteLocale[key] = value;
				break;
			}
		}
	}

	remoteLocales[languageTag] = remoteLocale;
	log.info("[%s] Updated remote locale", languageTag);
}

export async function GET({ params }) {
	// update locale in the background (only once per 24h)
	loadRemoteLocale(params.tag).then();

	// if called shortly after startup, this should await the initial load
	if (initialUpdatePromise) await initialUpdatePromise;

	return json(remoteLocales[params.tag] ?? {});
}
