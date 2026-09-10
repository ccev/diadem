import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import * as golbat from "@/lib/server/api/golbatApi";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import { ApiGymQuery } from "@/lib/server/queryMapObjects/queryGymApi";
import { ApiPokestopQuery } from "@/lib/server/queryMapObjects/queryPokestopApi";
import { ApiStationQuery } from "@/lib/server/queryMapObjects/queryStationApi";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import type { GymData, GymDefender } from "@/lib/types/mapObjectData/gym";
import { Features } from "@/lib/utils/features";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/features/masterStats.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/uicons.svelte", () => ({}));
vi.mock("$lib/features/masterStats.svelte", () => ({}));
vi.mock("$lib/server/queryMapObjects/invasionRewards", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({
	getMasterPokemon: () => ({ defaultFormId: 61 })
}));

afterEach(() => vi.restoreAllMocks());

const bounds = { minLat: 0, minLon: 0, maxLat: 5, maxLon: 5 };
const gym = {
	id: "gym",
	lat: 1,
	lon: 2,
	updated: 100,
	first_seen_timestamp: 50,
	deleted: false
} satisfies golbat.GolbatGymResult;

describe("fort API adapters", () => {
	it.each([false, true])(
		"omits station API-only fields in single and bulk results (battle permission: %s)",
		async (allowed) => {
			const station = {
				id: "station",
				lat: 1,
				lon: 2,
				name: "Station",
				cell_id: 0n,
				cooldown_complete: 0,
				updated: 100,
				is_inactive: false,
				is_battle_available: true,
				battle_pokemon_id: 25,
				battle_start: 100,
				battle_end: 200,
				battles: [{ battle_pokemon_id: 25, battle_start: 100, battle_end: 200 }]
			} satisfies golbat.GolbatStationResult;
			vi.spyOn(golbat, "getGolbatStation").mockResolvedValue(station);
			vi.spyOn(golbat, "scanStations").mockResolvedValue({
				stations: [station],
				examined: 1,
				skipped: 0,
				total: 1,
				limit_reached: false
			});
			const context = new FeaturePermissionContext(
				{
					everywhere: allowed ? [Features.STATION, Features.MAX_BATTLE] : [Features.STATION],
					areas: []
				},
				[Features.STATION, Features.MAX_BATTLE]
			);
			const query = new ApiStationQuery();

			const single = await query.getSingle(station.id, undefined, context);
			const bulk = await query.getMultiple(bounds, undefined, null, undefined, undefined, context);

			expect(bulk.data).toHaveLength(1);
			for (const item of [single, ...bulk.data]) {
				expect(item).toMatchObject({ id: station.id, is_inactive: 0 });
				expect(item?.battle_pokemon_id).toBe(allowed ? 25 : undefined);
				expect(item).not.toHaveProperty("battles");
				expect(item).not.toHaveProperty("battle_start");
				expect(item).not.toHaveProperty("battle_end");
			}
		}
	);

	it.each([false, true])(
		"omits quest API-only fields in single and bulk results (quest permission: %s)",
		async (allowed) => {
			const pokestop = {
				id: "stop",
				lat: 1,
				lon: 2,
				updated: 100,
				first_seen_timestamp: 50,
				deleted: false,
				quests: [],
				quest_target: 1,
				quest_rewards: [{ type: 7, info: { pokemon_id: 25, form_id: 61 } }],
				quest_pokemon_form_id: 61,
				alternative_quest_target: 2,
				alternative_quest_rewards: [{ type: 7, info: { pokemon_id: 25, form_id: 62 } }],
				alternative_quest_pokemon_form_id: 62
			} satisfies golbat.GolbatPokestopResult;
			vi.spyOn(golbat, "getGolbatPokestop").mockResolvedValue(pokestop);
			vi.spyOn(golbat, "scanPokestops").mockResolvedValue({
				pokestops: [pokestop],
				examined: 1,
				skipped: 0,
				total: 1,
				limit_reached: false
			});
			const context = new FeaturePermissionContext(
				{
					everywhere: allowed ? [Features.POKESTOP, Features.QUEST] : [Features.POKESTOP],
					areas: []
				},
				[Features.POKESTOP, Features.QUEST]
			);
			const query = new ApiPokestopQuery();

			const single = await query.getSingle(pokestop.id, undefined, context);
			const bulk = await query.getMultiple(bounds, undefined, null, undefined, undefined, context);

			expect(bulk.data).toHaveLength(1);
			for (const item of [single, ...bulk.data]) {
				expect(item).toMatchObject({ id: pokestop.id, deleted: 0 });
				expect(item?.quests).toHaveLength(allowed ? 2 : 0);
				expect(item?.quest_target).toBe(allowed ? 1 : undefined);
				expect(item?.alternative_quest_target).toBe(allowed ? 2 : undefined);
				expect(item).not.toHaveProperty("quest_pokemon_form_id");
				expect(item).not.toHaveProperty("alternative_quest_pokemon_form_id");
			}
		}
	);

	it.each([null, undefined])("maps nullish gym fields to undefined (%s)", async (value) => {
		vi.spyOn(golbat, "getGolbatGym").mockResolvedValue({
			...gym,
			available_slots: value,
			defenders: value,
			rsvps: value
		});

		const [mapped] = await new ApiGymQuery().querySingle(gym.id);

		expect(mapped).toMatchObject({
			deleted: 0,
			availble_slots: undefined,
			defenders: undefined,
			rsvps: undefined
		});
	});

	it.each(["SQL", "API"])("normalizes %s defenders in common preparation", (source) => {
		const defender = {
			pokemon_id: 25,
			form: 61,
			gender: 1,
			shiny: false,
			deployed_ms: 0,
			deployed_time: 0,
			battles_won: 0,
			battles_lost: 0,
			times_fed: 0,
			motivation_now: 100,
			cp_now: 100,
			cp_when_deployed: 100
		} satisfies GymDefender;
		const data: MinMapObject<GymData> = { ...gym, deleted: 0 };
		if (source === "SQL") data.defenders_raw = JSON.stringify([defender]);
		else data.defenders = [{ ...defender }];

		new GymQuery().prepare(data);

		expect(data.defenders).toEqual([{ ...defender, form: 0 }]);
		expect(data).not.toHaveProperty("defenders_raw");
	});

	it("finish() applies prepare, filter and makeMapObject like getMultiple()", async () => {
		vi.spyOn(golbat, "scanGyms").mockResolvedValue({
			gyms: [gym],
			examined: 3,
			skipped: 0,
			total: 3,
			limit_reached: false
		});
		const query = new ApiGymQuery();
		const viaGetMultiple = await query.getMultiple(bounds, undefined, null);
		const viaFinish = query.finish(
			query.processScan([gym], 3, null, undefined),
			undefined,
			null,
			undefined
		);
		expect(viaFinish).toEqual(viaGetMultiple);
		expect(viaFinish.data[0]).toMatchObject({ type: "gym", mapId: "gym-gym", deleted: 0 });
		expect(viaFinish.examined).toBe(3);
	});

	it("finish() passes limitReached through without processing", () => {
		const out = new ApiGymQuery().finish(
			{ data: [], examined: 7, limitReached: true },
			undefined,
			null
		);
		expect(out).toEqual({ data: [], examined: 7, limitReached: true });
	});

	it("processScan() drops deleted, stale and out-of-polygon records and adjusts examined", () => {
		const inside = { ...gym, id: "in" };
		const deleted = { ...gym, id: "del", deleted: true };
		const stale = { ...gym, id: "old", updated: 10 };
		const outside = { ...gym, id: "out", lat: 50, lon: 50 };
		const polygon = {
			type: "Feature" as const,
			properties: {},
			geometry: {
				type: "Polygon" as const,
				coordinates: [
					[
						[0, 0],
						[5, 0],
						[5, 5],
						[0, 5],
						[0, 0]
					]
				]
			}
		};
		const out = new ApiGymQuery().processScan([inside, deleted, stale, outside], 4, polygon, 50);
		expect(out.data.map((g) => g.id)).toEqual(["in"]);
		expect(out.examined).toBe(3);
	});
});
