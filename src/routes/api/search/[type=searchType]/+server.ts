import { error, json } from "@sveltejs/kit";
import { getLogger } from "@/lib/server/logging";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { searchGyms } from "@/lib/server/api/golbatApi";
import { Coords } from "@/lib/utils/coordinates";
import { type SearchPayload, SearchType, sortSearchResults } from "@/lib/services/search.svelte";

const log = getLogger("search");

export async function POST({ request, locals, params }) {
	const start = performance.now();
	const type: SearchType = params.type as SearchType;

	if (!hasFeatureAnywhereServer(locals.perms, type, locals.user)) error(401);

	const permCheckTime = performance.now();

	// this bypasses area perm restrictions (up to 20km), but cba to respect that

	const payload: SearchPayload = await request.json();

	if (payload.range > 50_000) error(400)

	// surely sylvie wouldn't find a rce here
	const center = Coords.infer(payload.center);
	let results: any[] | undefined = undefined;

	if (type === SearchType.GYM) {
		results = await searchGyms(payload.name, center, payload.range);
	}

	if (!results) {
		error(500);
	}

	results = sortSearchResults(results, payload.name, o => o.name)

	log.info(
		"[%s] search for <%s> / count: %d / permcheck: %fms + query: %fms",
		type,
		results?.length,
		(permCheckTime - start).toFixed(1),
		(performance.now() - permCheckTime).toFixed(1),
	);

	return json(results);
}
