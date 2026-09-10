import { describe, expect, it } from "vitest";
import { status } from "@grpc/grpc-js";
import {
	describeGrpcError,
	fromFortScanResponse,
	fromGymScanResponse,
	fromPokemonScanResponse,
	fromPokestopScanResponse,
	fromStationScanResponse,
	toFortCombinedScanRequest,
	toFortScanRequest,
	toPokemonScanRequest
} from "./golbatGrpcMapping";

const bounds = {
	min: { latitude: 51.5, longitude: -0.2 },
	max: { latitude: 51.6, longitude: -0.1 }
};

describe("toFortScanRequest", () => {
	it("maps bounds, limit, filters and with_incidents", () => {
		const req = toFortScanRequest({
			...bounds,
			limit: 501,
			filters: [
				{
					raid_level: [5],
					quest_reward_amount: { min: 1, max: 500 },
					contest_focus: [{ type: "buddy", min_level: 3 }],
					contest_ranking_standard: [1]
				}
			],
			with_incidents: true
		});
		expect(req).toEqual({
			min: { lat: 51.5, lon: -0.2 },
			max: { lat: 51.6, lon: -0.1 },
			limit: 501,
			filters: [
				{
					raid_level: [5],
					quest_reward_amount: { min: 1, max: 500 },
					contest_focus: [{ type: "buddy", min_level: 3 }],
					contest_ranking_standard: [1]
				}
			],
			with_incidents: true
		});
	});

	it("sends an empty filter list when filters are omitted", () => {
		const req = toFortScanRequest({ ...bounds, limit: 10 });
		expect(req.filters).toEqual([]);
		expect(req.with_incidents).toBe(false);
	});
});

describe("toPokemonScanRequest", () => {
	it("renames pokemon ids and keeps ranges and gender", () => {
		const req = toPokemonScanRequest({
			...bounds,
			limit: 3000,
			filters: [
				{
					pokemon: [{ id: 25 }, { id: 26, form: 3 }],
					iv: { min: 90, max: 100 },
					pvp_great: { min: 1, max: 50 },
					gender: [1]
				}
			]
		});
		expect(req.filters).toEqual([
			{
				pokemon: [
					{ pokemon_id: 25, form: undefined },
					{ pokemon_id: 26, form: 3 }
				],
				iv: { min: 90, max: 100 },
				pvp_great: { min: 1, max: 50 },
				gender: [1]
			}
		]);
		expect(req.limit).toBe(3000);
	});

	it("keeps the empty-pokemon catch-all clause", () => {
		const req = toPokemonScanRequest({ ...bounds, limit: 1, filters: [{ pokemon: [] }] });
		expect(req.filters).toEqual([{ pokemon: [] }]);
	});
});

describe("fromGymScanResponse", () => {
	it("parses json blobs to the native fields the http api sends and drops unused ones", () => {
		const res = fromGymScanResponse({
			gyms: [
				{
					id: "g1",
					lat: 1,
					lon: 2,
					updated: 100,
					deleted: false,
					first_seen_timestamp: 1,
					team_id: 2,
					available_slots: 4,
					raid_pokemon_id: 150,
					defenders_json: '[{"pokemon_id":25,"form":0}]',
					rsvps_json: "[]",
					guarding_pokemon_display_json: "{}",
					cell_id: "5221390000000000000"
				}
			],
			examined: 1,
			skipped: 0,
			total: 1,
			limit_reached: false
		});
		expect(res.examined).toBe(1);
		expect(res.total).toBe(1);
		expect(res.limit_reached).toBe(false);
		const gym = res.gyms[0];
		expect(gym.id).toBe("g1");
		expect(gym.available_slots).toBe(4);
		expect(gym.deleted).toBe(false);
		expect(gym.defenders).toEqual([{ pokemon_id: 25, form: 0 }]);
		expect(gym.rsvps).toEqual([]);
		expect(gym).not.toHaveProperty("defenders_json");
		expect(gym).not.toHaveProperty("rsvps_json");
		expect(gym).not.toHaveProperty("guarding_pokemon_display_json");
		expect(gym).not.toHaveProperty("cell_id");
	});

	it("leaves unset optionals undefined and defaults the envelope", () => {
		const res = fromGymScanResponse({ gyms: [{ id: "g", lat: 0, lon: 0 }] });
		expect(res.gyms[0].defenders).toBeUndefined();
		expect(res.gyms[0].raid_pokemon_id).toBeUndefined();
		expect(res.examined).toBe(0);
		expect(res.limit_reached).toBe(false);
	});
});

describe("fromPokestopScanResponse", () => {
	it("renames json blobs, keeps invasions, converts enabled, drops conditions and cell_id", () => {
		const res = fromPokestopScanResponse({
			pokestops: [
				{
					id: "p1",
					lat: 1,
					lon: 2,
					updated: 5,
					deleted: false,
					enabled: true,
					lure_id: 501,
					quest_pokemon_form_id: 61,
					quest_rewards_json: '[{"type":7}]',
					alternative_quest_rewards_json: '[{"type":3}]',
					quest_conditions_json: "[]",
					alternative_quest_conditions_json: "[]",
					showcase_focus_json: '{"type":"pokemon"}',
					showcase_rankings_json: '{"total_entries":1}',
					cell_id: "1",
					invasions: [
						{
							id: "i1",
							pokestop_id: "p1",
							display_type: 1,
							style: 0,
							character: 4,
							start: 1,
							expiration: 2,
							confirmed: true,
							updated: 3
						}
					]
				}
			],
			examined: 1,
			skipped: 0,
			total: 1
		});
		const stop = res.pokestops[0];
		expect(stop.quest_rewards).toBe('[{"type":7}]');
		expect(stop.alternative_quest_rewards).toBe('[{"type":3}]');
		expect(stop.showcase_focus).toBe('{"type":"pokemon"}');
		expect(stop.showcase_rankings).toBe('{"total_entries":1}');
		expect(stop.enabled).toBe(1);
		expect(stop.lure_id).toBe(501);
		expect(stop.quest_pokemon_form_id).toBe(61);
		expect(stop.invasions?.[0].character).toBe(4);
		expect(stop).not.toHaveProperty("quest_rewards_json");
		expect(stop).not.toHaveProperty("quest_conditions_json");
		expect(stop).not.toHaveProperty("alternative_quest_conditions_json");
		expect(stop).not.toHaveProperty("cell_id");
	});

	it("leaves enabled and invasions undefined when unset or empty", () => {
		const res = fromPokestopScanResponse({
			pokestops: [{ id: "p", lat: 0, lon: 0, invasions: [] }]
		});
		expect(res.pokestops[0].enabled).toBeUndefined();
		expect(res.pokestops[0].invasions).toBeUndefined();
	});
});

describe("fromStationScanResponse", () => {
	it("renames stationed_pokemon_json and drops battles and cell_id", () => {
		const res = fromStationScanResponse({
			stations: [
				{
					id: "s1",
					lat: 1,
					lon: 2,
					name: "S",
					is_inactive: false,
					is_battle_available: true,
					updated: 9,
					battle_level: 6,
					battle_start: 100,
					battle_end: 200,
					stationed_pokemon_json: '[{"pokemon_id":1,"form":0}]',
					cell_id: "2",
					battles: [{ bread_battle_seed: "1", battle_level: 6 }]
				}
			],
			examined: 1,
			skipped: 0,
			total: 1
		});
		const station = res.stations[0];
		expect(station.stationed_pokemon).toBe('[{"pokemon_id":1,"form":0}]');
		expect(station.is_battle_available).toBe(true);
		expect(station.battle_level).toBe(6);
		expect(station.battle_start).toBe(100);
		expect(station).not.toHaveProperty("stationed_pokemon_json");
		expect(station).not.toHaveProperty("battles");
		expect(station).not.toHaveProperty("cell_id");
	});
});

describe("fromPokemonScanResponse", () => {
	it("keys pvp by league, omits empty leagues, drops spawn_id and cell_id", () => {
		const great = {
			pokemon: 26,
			form: 0,
			cap: 50,
			value: 1,
			level: 20,
			cp: 1490,
			percentage: 0.9,
			rank: 3
		};
		const ultra = {
			pokemon: 26,
			form: 0,
			cap: 51,
			value: 2,
			level: 40,
			cp: 2490,
			percentage: 0.8,
			rank: 7
		};
		const res = fromPokemonScanResponse({
			pokemon: [
				{
					id: "18446744073709551557",
					spawn_id: "123",
					cell_id: "456",
					lat: 1,
					lon: 2,
					pokemon_id: 25,
					updated: 7,
					iv: 82.2,
					pvp: { little: [], great: [great], ultra: [ultra] }
				}
			],
			examined: 1,
			skipped: 0,
			total: 1,
			limit_reached: true
		});
		expect(res.limit_reached).toBe(true);
		const mon = res.pokemon[0];
		expect(mon.id).toBe("18446744073709551557");
		expect(mon.pokemon_id).toBe(25);
		expect(mon.iv).toBe(82.2);
		expect(mon.pvp).toEqual({ great: [great], ultra: [ultra] });
		expect(mon).not.toHaveProperty("spawn_id");
		expect(mon).not.toHaveProperty("cell_id");
	});

	it("omits pvp entirely when every league is empty or unset", () => {
		const res = fromPokemonScanResponse({
			pokemon: [
				{ id: "1", lat: 0, lon: 0, pokemon_id: 1, pvp: { little: [], great: [], ultra: [] } },
				{ id: "2", lat: 0, lon: 0, pokemon_id: 1 }
			]
		});
		expect(res.pokemon[0].pvp).toBeUndefined();
		expect(res.pokemon[1].pvp).toBeUndefined();
	});
});

describe("toFortCombinedScanRequest", () => {
	it("maps groups with their own limits and omits absent types", () => {
		const req = toFortCombinedScanRequest({
			...bounds,
			limit: 20003,
			with_incidents: true,
			gyms: { filters: [{ raid_level: [5] }], limit: 10001 },
			pokestops: { filters: [], limit: 10001 }
		});
		expect(req).toEqual({
			min: { lat: 51.5, lon: -0.2 },
			max: { lat: 51.6, lon: -0.1 },
			limit: 20003,
			with_incidents: true,
			gyms: { filters: [{ raid_level: [5] }], limit: 10001 },
			pokestops: { filters: [], limit: 10001 },
			stations: undefined
		});
	});

	it("defaults with_incidents to false and an omitted filter list to []", () => {
		const req = toFortCombinedScanRequest({ ...bounds, limit: 1, stations: { limit: 1 } });
		expect(req.with_incidents).toBe(false);
		expect(req.stations).toEqual({ filters: [], limit: 1 });
		expect(req.gyms).toBeUndefined();
	});
});

describe("fromFortScanResponse", () => {
	it("maps the three slices through the per-type converters and keeps per-type stats", () => {
		const res = fromFortScanResponse({
			gyms: [{ id: "g1", lat: 1, lon: 2, defenders_json: "[]", cell_id: "1" }],
			pokestops: [{ id: "p1", lat: 1, lon: 2, quest_rewards_json: "[]", enabled: true }],
			stations: [{ id: "s1", lat: 1, lon: 2, stationed_pokemon_json: "[]", battles: [] }],
			examined: 30,
			skipped: 1,
			total: 100,
			limit_reached: true,
			gyms_stats: { examined: 10, limit_reached: false },
			pokestops_stats: { examined: 15, limit_reached: true },
			stations_stats: { examined: 5, limit_reached: false }
		});
		expect(res.gyms[0]).toMatchObject({ id: "g1", defenders: [] });
		expect(res.gyms[0]).not.toHaveProperty("cell_id");
		expect(res.pokestops[0]).toMatchObject({ id: "p1", quest_rewards: "[]", enabled: 1 });
		expect(res.stations[0]).toMatchObject({ id: "s1", stationed_pokemon: "[]" });
		expect(res.stations[0]).not.toHaveProperty("battles");
		expect(res).toMatchObject({ examined: 30, skipped: 1, total: 100, limit_reached: true });
		expect(res.gyms_stats).toEqual({ examined: 10, limit_reached: false });
		expect(res.pokestops_stats).toEqual({ examined: 15, limit_reached: true });
		expect(res.stations_stats).toEqual({ examined: 5, limit_reached: false });
	});

	it("defaults missing slices and stats", () => {
		const res = fromFortScanResponse({});
		expect(res.gyms).toEqual([]);
		expect(res.pokestops).toEqual([]);
		expect(res.stations).toEqual([]);
		expect(res.limit_reached).toBe(false);
		expect(res.gyms_stats).toEqual({ examined: 0, limit_reached: false });
	});
});

describe("describeGrpcError", () => {
	it("renders the status name and details", () => {
		const err = Object.assign(new Error("boom"), {
			code: status.UNAVAILABLE,
			details: "connect failed"
		});
		expect(describeGrpcError(err)).toBe("UNAVAILABLE: connect failed");
	});

	it("adds the secret hint for UNAUTHENTICATED", () => {
		const err = Object.assign(new Error("x"), {
			code: status.UNAUTHENTICATED,
			details: "invalid or missing api secret"
		});
		expect(describeGrpcError(err)).toBe(
			"UNAUTHENTICATED: invalid or missing api secret (server.golbat.secret must match Golbat's api_secret)"
		);
	});

	it("falls back to String() for non-grpc errors", () => {
		expect(describeGrpcError(new TypeError("nope"))).toBe("TypeError: nope");
	});
});
