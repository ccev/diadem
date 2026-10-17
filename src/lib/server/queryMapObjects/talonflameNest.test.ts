import { buildTalonflameNests, type TalonflameGroup } from "./talonflameNest";
import { polygon } from "@turf/turf";
import { s2 } from "s2js";
import { describe, expect, it } from "vitest";

const group: TalonflameGroup = {
	id: "8103463",
	name: "Planten un Blomen",
	area_name: "Hamburg",
	pokemon_id: 16,
	form: 0,
	last_changed: 1792083600
};

function member(lat: number, lon: number, nest_id = group.id) {
	const cell = s2.cellid.parent(s2.cellid.fromLatLng(s2.LatLng.fromDegrees(lat, lon)), 20);
	return { nest_id, spawnpoint_id: (cell >> 20n).toString() };
}

describe("Talonflame nest footprints", () => {
	it("reconstructs shortened S2 cells and supports single-point nests", () => {
		const [nest] = buildTalonflameNests([group], [member(53.56, 9.98)]);
		expect(nest.lat).toBeCloseTo(53.56, 4);
		expect(nest.lon).toBeCloseTo(9.98, 4);
		expect(nest.spawnpoints).toBe(1);
		expect(nest.m2).toBeGreaterThan(1);
		expect(nest.last_changed).toBe(group.last_changed);
		expect(nest.updated).toBeNull();
		expect(nest.pokemon_ratio).toBeNull();
		const ring = nest.polygon[0][0] as { x: number; y: number }[];
		expect(ring).toHaveLength(5);
		expect(ring[0]).toEqual(ring[4]);
	});

	it("keeps multiple populations in the same park separate", () => {
		const subnest = { ...group, id: "-375", pokemon_id: 769 };
		const nests = buildTalonflameNests(
			[group, subnest],
			[member(53.56, 9.98), member(53.561, 9.981, subnest.id)]
		);
		expect(nests.map((nest) => [nest.id, nest.pokemon_id])).toEqual([
			[group.id, 16],
			["-375", 769]
		]);
		expect(nests[0].polygon).not.toEqual(nests[1].polygon);
		expect(nests[0].lat).not.toEqual(nests[1].lat);
	});

	it("anchors merged groups on a member rather than the gap between sources", () => {
		const members = [member(53, 9), member(54, 10)];
		const [nest] = buildTalonflameNests([group], members);
		const singlePointNests = members.map((row) => buildTalonflameNests([group], [row])[0]);
		expect(singlePointNests.some((row) => row.lat === nest.lat && row.lon === nest.lon)).toBe(true);
		expect(nest.polygon).toHaveLength(2);
	});

	it("excludes members outside the allowed polygon, including its holes", () => {
		const allowed = polygon([
			[
				[9, 53],
				[11, 53],
				[11, 55],
				[9, 55],
				[9, 53]
			],
			[
				[9.9, 53.9],
				[10.1, 53.9],
				[10.1, 54.1],
				[9.9, 54.1],
				[9.9, 53.9]
			]
		]);
		const [nest] = buildTalonflameNests(
			[group],
			[member(53.5, 9.5), member(54, 10), member(52, 8)],
			undefined,
			allowed
		);
		expect(nest.spawnpoints).toBe(1);
		expect(nest.lat).toBeCloseTo(53.5, 4);
		expect(nest.polygon).toHaveLength(1);
	});

	it("requires members in the viewport and anchors there without truncating the footprint", () => {
		const members = [member(53.56, 9.98), member(54, 10)];
		const bounds = { minLat: 53.55, minLon: 9.97, maxLat: 53.57, maxLon: 9.99 };
		const [nest] = buildTalonflameNests([group], members, bounds);
		expect(nest.lat).toBeCloseTo(53.56, 4);
		expect(nest.spawnpoints).toBe(2);
		expect(buildTalonflameNests([group], [members[1]], bounds)).toEqual([]);
	});

	it("does not return empty groups or malformed S2 IDs", () => {
		expect(buildTalonflameNests([group], [])).toEqual([]);
		expect(
			buildTalonflameNests(
				[group],
				[
					{ nest_id: group.id, spawnpoint_id: "0" },
					{ nest_id: group.id, spawnpoint_id: "invalid" },
					{ nest_id: group.id, spawnpoint_id: "18446744073709551615" }
				]
			)
		).toEqual([]);
	});

	it("unwraps cell edges at the antimeridian", () => {
		const [nest] = buildTalonflameNests([group], [member(0, 180)]);
		const ring = nest.polygon[0][0] as { x: number; y: number }[];
		for (let i = 1; i < ring.length; i++) {
			expect(Math.abs(ring[i].x - ring[i - 1].x)).toBeLessThan(1);
		}
	});
});
