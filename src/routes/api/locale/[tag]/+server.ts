import { json } from "@sveltejs/kit";
import { prefixes as localePrefixesObject } from "@/lib/services/ingameLocale";
import TTLCache from "@isaacs/ttlcache";
import { getLogger } from "@/lib/server/logging";
import { locales } from "@/lib/paraglide/runtime";

type Locale = (typeof locales)[number];
type RemoteLocale = { [key: string]: string };

const log = getLogger("remotelocale");

const url =
	"https://raw.githubusercontent.com/WatWowMap/pogo-translations/refs/heads/master/static/locales/{}.json";
const allowedPrefixes = Object.values(localePrefixesObject);
const updateCache: TTLCache<string, undefined> = new TTLCache({ ttl: 24 * 60 * 60 * 1000 }); // update once per day

let remoteLocales: { [key in Locale]: RemoteLocale } = Object.fromEntries(
	locales.map((l) => [l, {}])
);

let initialUpdatePromise: Promise<void> | undefined = updateAllRemoteLocales();
initialUpdatePromise.then(() => (initialUpdatePromise = undefined));

async function updateAllRemoteLocales() {
	await Promise.all(
		locales.map((tag) => {
			return loadRemoteLocale(tag);
		})
	);
}

async function loadRemoteLocale(locale: Locale) {
	if (!locales.includes(locale)) return;

	if (locale === "pt") {
		locale = "pt-br"
	}

	if (updateCache.has(locale)) return;
	updateCache.set(locale, undefined);

	log.info("[%s] Updating remote locale", locale);

	const result = await fetch(url.replaceAll("{}", locale));

	if (!result.ok) {
		log.crit("[%s] Fetching remote locale failed: %s", locale, await result.text());
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

	remoteLocales[locale] = remoteLocale;
	log.info("[%s] Updated remote locale", locale);
}

export async function GET({ params }) {
	if (!locales.includes(params.tag)) return;

	// update locale in the background (only once per 24h)
	loadRemoteLocale(params.tag).then();

	// if called shortly after startup, this should await the initial load
	if (initialUpdatePromise) await initialUpdatePromise;

	return json(remoteLocales[params.tag] ?? {});
}
