import { prefixes as localePrefixesObject } from "@/lib/services/ingameLocale";
import { locales } from "@/lib/paraglide/runtime";
import { getLogger } from "@/lib/utils/logger";
import { BaseDataProvider, BulkDataProvider } from "@/lib/server/provider/dataProvider";
import { REFRESH_REMOTE_LOCALE } from "@/lib/constants";
import { sleep } from "@/lib/utils/time";
import type { UiconsIndex } from "uicons.js";

type Locales = (typeof locales)[number];
type RemoteLocale = { [key: string]: string };

const log = getLogger("q:remotelocale");

const url =
	"https://raw.githubusercontent.com/WatWowMap/pogo-translations/refs/heads/master/static/locales/{}.json";
const allowedPrefixes = Object.values(localePrefixesObject);

export class RemoteLocaleProvider extends BulkDataProvider<Locales, RemoteLocale, Locales> {
	constructor() {
		super(REFRESH_REMOTE_LOCALE);
	}

	protected async querySingle(locale: Locales): Promise<[Locales, RemoteLocale]> {
		let targetLocale: string = locale;
		if (locale === "pt") {
			targetLocale = "pt-br";
		}

		const rawData = await this.fetchData(
			url.replaceAll("{}", targetLocale),
			log,
			`remote locale ${locale}`
		);
		const data = JSON.parse(rawData) as UiconsIndex;

		const remoteLocale: RemoteLocale = {};

		for (const [key, value] of Object.entries(data)) {
			for (const allowedPrefix of allowedPrefixes) {
				if (key.startsWith(allowedPrefix)) {
					remoteLocale[key] = value;
					break;
				}
			}
		}

		return [locale, remoteLocale];
	}

	protected allKeys() {
		return locales;
	}

	public async getSingle(locale: Locales) {
		if (!this.allKeys().includes(locale)) return undefined;
		return super.getSingle(locale);
	}
}

export const remoteLocaleProvider = new RemoteLocaleProvider();
