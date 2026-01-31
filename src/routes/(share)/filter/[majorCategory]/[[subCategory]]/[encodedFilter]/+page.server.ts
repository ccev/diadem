import type { PageServerLoad } from "./$types";
import { getConfig, setConfig } from "@/lib/services/config/config";
import { loadRemoteLocale } from "@/lib/services/ingameLocale";
import type { FilterCategory } from "@/lib/features/filters/filters";
import type { AnyFilterset } from "@/lib/features/filters/filtersets";
import { getId } from "@/lib/utils/uuid";
import {
	FiltersetInvasionSchema,
	FiltersetPokemonSchema,
	FiltersetRaidSchema
} from "@/lib/features/filters/filtersetSchemas";
import * as m from "@/lib/paraglide/messages";
import { getLogger } from "@/lib/server/logging";
import type { ZodSafeParseResult } from "zod";

const log = getLogger("filtershare")

function decodeFilterset(
	majorCategory: FilterCategory | string,
	subCategory: FilterCategory | string | undefined,
	str: string
) {
	const decoded: AnyFilterset = JSON.parse(decodeURIComponent(atob(str)));
	log.info("Decoding filterset: %s", decoded)
	decoded.id = getId();

	let zodResult: ZodSafeParseResult<AnyFilterset> | undefined = undefined

	if (majorCategory === "pokemon") {
		zodResult = FiltersetPokemonSchema.safeParse(decoded)
	} else if (majorCategory === "gym" && subCategory === "raid") {
		zodResult = FiltersetRaidSchema.safeParse(decoded)
	} else if (majorCategory === "pokestop" && subCategory === "invasion") {
		zodResult = FiltersetInvasionSchema.safeParse(decoded)
	}

	if (!zodResult) return undefined

	if (zodResult?.error) {
		log.crit("Decoding failed!!", zodResult?.error)
		return undefined
	}

	const safe = zodResult.data

	if (safe?.title?.message && !Object.keys(m).includes(safe.title.message)) {
		log.crit("Tried to send invalid message!!", safe.title.message)
		return undefined;
	}

	return safe;
}

export const load: PageServerLoad = async ({ params, fetch }) => {
	const configResponse = await fetch("/api/config");
	setConfig(await configResponse.json());
	await loadRemoteLocale(getConfig().general.defaultLocale, fetch);

	const filterset = decodeFilterset(params.majorCategory, params.subCategory, params.encodedFilter);
	const majorCategory = filterset ? params.majorCategory : undefined;
	const subCategory = filterset ? params.subCategory : undefined;

	return { filterset, majorCategory, subCategory };
};
