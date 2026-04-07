import { getMultiplePokemon } from "@/lib/server/api/golbatApi";

import { query } from "@/lib/server/db/external/internalQuery";
import type { GymData } from "@/lib/types/mapObjectData/gym";

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
	// TODO: add count endpoint to golbat
	const body = {
		min: {
			latitude: 0,
			longitude: 0
		},
		max: {
			latitude: 0,
			longitude: 0
		},
		limit: 0,
		filters: [
			{
				pokemon: []
			}
		]
	};
	const result = await getMultiplePokemon(body);

	return result?.total ?? 0;
}

export async function queryLiveFortStats(): Promise<FortLiveStats> {
	const [pokestopResult, gymResult] = await Promise.all([
		query<CountResult[]>("SELECT COUNT(*) AS count FROM pokestop"),
		query<CountResult[]>("SELECT COUNT(*) AS count FROM gym")
	]);

	return {
		pokestops: pokestopResult[0]?.count ?? 0,
		gyms: gymResult[0]?.count ?? 0
	};
}
