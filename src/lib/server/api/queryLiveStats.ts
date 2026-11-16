import { getMultiplePokemon } from "@/lib/server/api/golbat/http";

import { query } from "@/lib/server/db/external/internalQuery";

export type LiveStats = {
	pokemon: number;
	gyms: number;
	pokestops: number;
};

export type FortLiveStats = {
	pokestops: number;
	gyms: number;
};

type CountResult = {
	count: number;
};

export async function queryLivePokemonStats() {
	// v3 scan's total describes the whole tree, independently of the bounding box.
	// Never request a world-sized result list (or rely on a backend's meaning of limit=0).
	const body = {
		min: {
			latitude: 0,
			longitude: 0
		},
		max: {
			latitude: 0,
			longitude: 0
		},
		limit: 1,
		filters: [
			{
				pokemon: []
			}
		]
	};
	const result = await getMultiplePokemon(body);
	const total = result?.total;
	if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0)
		throw new Error("Golbat v3 scan did not supply a valid whole-tree total");
	return total;
}

export async function queryLiveFortStats(): Promise<FortLiveStats> {
	// Do not release a failed refresh lease while its sibling count is still running.
	const [pokestops, gyms] = await Promise.allSettled([
		query<CountResult[]>("SELECT COUNT(*) AS count FROM pokestop", undefined, 8000),
		query<CountResult[]>("SELECT COUNT(*) AS count FROM gym", undefined, 8000)
	]);
	if (pokestops.status === "rejected") throw pokestops.reason;
	if (gyms.status === "rejected") throw gyms.reason;
	const pokestopResult = pokestops.value;
	const gymResult = gyms.value;
	if (
		!Number.isSafeInteger(pokestopResult[0]?.count) ||
		pokestopResult[0].count < 0 ||
		!Number.isSafeInteger(gymResult[0]?.count) ||
		gymResult[0].count < 0
	)
		throw new Error("Database did not supply valid fort totals");

	return {
		pokestops: pokestopResult[0].count,
		gyms: gymResult[0].count
	};
}
