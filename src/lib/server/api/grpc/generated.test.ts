import { describe, expect, it } from "vitest";
import { Gym, PokemonScanResponse } from "./golbat_api";

describe("generated golbat_api codecs", () => {
	it("round-trips a gym with snake_case keys, numeric int64s and absent optionals", () => {
		const bytes = Gym.encode({
			id: "g1",
			lat: 1.5,
			lon: 2.5,
			updated: 1757400000,
			deleted: false,
			first_seen_timestamp: 1,
			raid_pokemon_id: 150,
			defenders_json: "[]"
		}).finish();
		const gym = Gym.decode(bytes);
		expect(gym.id).toBe("g1");
		expect(gym.updated).toBe(1757400000);
		expect(typeof gym.updated).toBe("number");
		expect(gym.raid_pokemon_id).toBe(150);
		expect(gym.raid_pokemon_costume).toBeUndefined();
		expect(gym.defenders_json).toBe("[]");
		expect(gym.rsvps_json).toBeUndefined();
	});

	it("decodes 64-bit id fields as exact decimal strings", () => {
		const bytes = PokemonScanResponse.encode({
			pokemon: [{ id: "18446744073709551557", spawn_id: "9007199254740993", pokemon_id: 25 }]
		}).finish();
		const decoded = PokemonScanResponse.decode(bytes);
		expect(decoded.pokemon?.[0].id).toBe("18446744073709551557");
		expect(decoded.pokemon?.[0].spawn_id).toBe("9007199254740993");
		expect(decoded.pokemon?.[0].pokemon_id).toBe(25);
	});
});
