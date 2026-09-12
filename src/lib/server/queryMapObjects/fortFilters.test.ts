import { shouldDisplayContest } from "@/lib/features/filterLogic/pokestop";
import { shouldDisplayStation } from "@/lib/features/filterLogic/station";
import type { FilterPokestop } from "@/lib/features/filters/filters";
import type { BaseFilterset } from "@/lib/features/filters/filtersets";
import { queryJoined } from "@/lib/server/db/external/internalQuery";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { ContestFocusPokemon, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { getDefaultPokestopFilter } from "@/lib/utils/pokestopUtils";
import { getDefaultStationFilter } from "@/lib/utils/stationUtils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/features/masterStats.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({
	isCurrentSelectedOverwrite: () => false
}));
vi.mock("@/lib/services/userSettings.svelte", () => ({
	defaultFilter: (enabled = false) => ({ enabled, filters: [] })
}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/uicons.svelte", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({
	getMasterPokemon: () => ({ defaultFormId: 61 })
}));
vi.mock("@/lib/utils/currentTimestamp", () => ({ currentTimestamp: () => 100 }));
vi.mock("@/lib/server/api/rateLimit", () => ({ requestLimits: { pokestop: 100 } }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({
	queryJoined: vi.fn().mockResolvedValue([])
}));
vi.mock("$lib/features/masterStats.svelte", () => ({}));
vi.mock("$lib/server/queryMapObjects/invasionRewards", () => ({}));

const filterset: BaseFilterset = {
	id: "test",
	title: { message: "test" },
	enabled: true,
	icon: { isUserSelected: false }
};
const showcase: Partial<PokestopData> = {
	mapId: "pokestop-test",
	showcase_expiry: 200,
	showcase_ranking_standard: 0,
	contest_focus: { pokemon_form: 0, pokemon_id: 25, type: "pokemon" }
};
const station: Partial<StationData> = {
	mapId: "station-test",
	is_inactive: 0,
	is_battle_available: 1,
	start_time: 150,
	end_time: 200,
	battle_pokemon_id: 809,
	battle_pokemon_form: 0,
	battle_pokemon_bread_mode: 2
};

class TestPokestopQuery extends PokestopQuery {
	override getFilterWhere(filter: FilterPokestop | undefined) {
		return super.getFilterWhere(filter);
	}
}

describe("restricted pokestop SQL", () => {
	it.each([undefined, 100])(
		"preserves both spatial predicates and parameter order with since=%s",
		async (since) => {
			vi.mocked(queryJoined).mockClear();
			const bounds = { minLat: 53, maxLat: 54, minLon: 10, maxLon: 11 };
			const polygon: PermittedPolygon = {
				type: "Feature",
				properties: {},
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[10, 53],
							[11, 53],
							[11, 54],
							[10, 54],
							[10, 53]
						]
					]
				}
			};

			await new PokestopQuery().query(bounds, undefined, polygon, since, 25);

			expect(queryJoined).toHaveBeenCalledOnce();
			const [sql, values] = vi.mocked(queryJoined).mock.calls[0];
			const whereSql =
				" WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND ST_Contains(ST_GeomFromGeoJSON(?), Point(pokestop.lon, pokestop.lat)) AND deleted = 0" +
				(since === undefined ? "" : " AND pokestop.updated > ?");
			const spatialValues = [53, 54, 10, 11, JSON.stringify(polygon.geometry)];
			if (since !== undefined) spatialValues.push(since);

			expect(sql).toContain("SELECT DISTINCT pokestop.id AS id");
			expect(sql).toContain("LIMIT 26");
			expect(sql.split(whereSql)).toHaveLength(3);
			expect(values).toEqual([...spatialValues, ...spatialValues]);
		}
	);
});

describe("showcase filters", () => {
	it.each<ContestFocusPokemon>([
		{ type: "pokemon", pokemon_id: 25 },
		{ type: "pokemon", pokemon_id: 25, pokemon_form: 0 },
		{ type: "pokemon", pokemon_id: 25, pokemon_form: 61 }
	])("matches reordered focus fields and normalizes omitted/default forms (%j)", (focus) => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.contest.enabled = true;
		filter.contest.filters = [{ ...filterset, rankingStandard: 0, focus }];

		expect(shouldDisplayContest(showcase, filter)).toBe(true);
	});

	it("ORs enabled filters while requiring both ranking and focus to match", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.contest.enabled = true;
		filter.contest.filters = [
			{ ...filterset, rankingStandard: 1, focus: { type: "pokemon", pokemon_id: 25 } },
			{ ...filterset, rankingStandard: 0, focus: { type: "pokemon", pokemon_id: 133 } },
			{
				...filterset,
				enabled: false,
				rankingStandard: 0,
				focus: { type: "pokemon", pokemon_id: 25 }
			}
		];

		expect(shouldDisplayContest(showcase, filter)).toBe(false);
		filter.contest.filters[2].enabled = true;
		expect(shouldDisplayContest(showcase, filter)).toBe(true);
		filter.contest.enabled = false;
		expect(shouldDisplayContest(showcase, filter)).toBe(false);
	});

	it("compares the full buddy focus, not just its type", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.contest.enabled = true;
		filter.contest.filters = [
			{ ...filterset, rankingStandard: 0, focus: { type: "buddy", min_level: 2 } }
		];

		expect(
			shouldDisplayContest({ ...showcase, contest_focus: { min_level: 2, type: "buddy" } }, filter)
		).toBe(true);
		expect(
			shouldDisplayContest({ ...showcase, contest_focus: { min_level: 3, type: "buddy" } }, filter)
		).toBe(false);
	});

	it("uses scalar SQL predicates and expiry, leaving forms and structured focus for local matching", () => {
		const filter = getDefaultPokestopFilter();
		filter.enabled = true;
		filter.contest.enabled = true;
		filter.contest.filters = [
			{
				...filterset,
				rankingStandard: 0,
				focus: { type: "pokemon", pokemon_id: 25, pokemon_form: 61 }
			},
			{
				...filterset,
				rankingStandard: 1,
				focus: { type: "type", pokemon_type_1: 13, pokemon_type_2: 4 }
			},
			{ ...filterset, rankingStandard: 4, focus: { type: "buddy", min_level: 2 } },
			{
				...filterset,
				enabled: false,
				rankingStandard: 0,
				focus: { type: "pokemon", pokemon_id: 133 }
			}
		];

		const { sql, values } = new TestPokestopQuery().getFilterWhere(filter);

		expect(sql).toContain("incident.expiration > UNIX_TIMESTAMP()");
		expect(sql).toContain("incident.display_type = ?");
		expect(sql).toContain("pokestop.showcase_expiry > UNIX_TIMESTAMP()");
		expect(sql).toContain(
			"(pokestop.showcase_ranking_standard = ? AND pokestop.showcase_pokemon_id = ?) OR (pokestop.showcase_ranking_standard = ? AND pokestop.showcase_pokemon_type_id = ?) OR (pokestop.showcase_ranking_standard = ?)"
		);
		expect(sql).not.toMatch(/showcase_focus|showcase_pokemon_form_id|JSON/i);
		expect(values).toEqual([9, 0, 25, 1, 13, 4]);
	});
});

describe("station filters", () => {
	it("shows a matching future boss unless the enabled filter requires isActive", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [
			{ ...filterset, bosses: [{ pokemon_id: 809, form: 0, bread_mode: 2 }] },
			{ ...filterset, enabled: false, isActive: true }
		];

		expect(shouldDisplayStation(station, filter)).toBe(true);
		filter.maxBattle.filters[0].isActive = true;
		expect(shouldDisplayStation(station, filter)).toBe(false);
		expect(shouldDisplayStation({ ...station, start_time: 99 }, filter)).toBe(true);
	});

	it("still hides inactive, unavailable and expired battles without filtersets", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;

		expect(shouldDisplayStation(station, filter)).toBe(true);
		expect(shouldDisplayStation({ ...station, is_inactive: 1 }, filter)).toBe(false);
		expect(shouldDisplayStation({ ...station, is_battle_available: 0 }, filter)).toBe(false);
		expect(shouldDisplayStation({ ...station, end_time: 100 }, filter)).toBe(false);
	});
});
