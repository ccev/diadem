import {
	buildTalonflameNests,
	type TalonflameGroup,
	type TalonflameMember,
	type TalonflameSource
} from "./talonflameNest";
import {
	area,
	booleanPointInPolygon,
	difference,
	featureCollection,
	intersect,
	multiPolygon,
	point,
	polygon,
	union
} from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
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
const subnest = { ...group, id: "-375", pokemon_id: 769 };
const park = polygon([
	[
		[9.97, 53.55],
		[9.99, 53.55],
		[9.99, 53.57],
		[9.97, 53.57],
		[9.97, 53.55]
	]
]);

function member(lat: number, lon: number, nest_id = group.id): TalonflameMember {
	const cell = s2.cellid.parent(s2.cellid.fromLatLng(s2.LatLng.fromDegrees(lat, lon)), 20);
	return { nest_id, spawnpoint_id: (cell >> 20n).toString() };
}

function source(
	population = group,
	geometry: Polygon | MultiPolygon = park.geometry,
	id = group.id
): TalonflameSource {
	return {
		id,
		group_id: population.id,
		pokemon_id: population.pokemon_id!,
		form: population.form,
		geometry
	};
}

function geometry(nest: MinMapObject<NestData>) {
	return multiPolygon(
		(nest.polygon as { x: number; y: number }[][][]).map((rings) =>
			rings.map((ring) => ring.map(({ x, y }) => [x, y]))
		)
	);
}

function expectPartition(
	nests: MinMapObject<NestData>[],
	original: Feature<Polygon | MultiPolygon>
) {
	const regions = nests.map(geometry);
	const combined = union(featureCollection(regions))!;
	expect(area(combined)).toBeCloseTo(area(original), 3);
	expect(difference(featureCollection([original, combined]))).toBeNull();
	expect(difference(featureCollection([combined, original]))).toBeNull();
	for (let i = 0; i < regions.length; i++) {
		for (let j = i + 1; j < regions.length; j++) {
			const overlap = intersect(featureCollection([regions[i], regions[j]]));
			// Clipping may return a zero-area ring on a shared boundary.
			expect(overlap ? area(overlap) : 0).toBeLessThan(0.00001);
		}
		expect(booleanPointInPolygon(point([nests[i].lon, nests[i].lat]), regions[i])).toBe(true);
	}
}

describe("Talonflame OSM park regions", () => {
	it("keeps the exact OSM outline for a single population, even with one spawnpoint", () => {
		const [nest] = buildTalonflameNests([group], [member(53.56, 9.98)], [source()]);
		expect(geometry(nest).geometry.coordinates).toEqual([park.geometry.coordinates]);
		expect(nest.lat).toBeCloseTo(53.56, 4);
		expect(nest.lon).toBeCloseTo(9.98, 4);
		expect(nest.spawnpoints).toBe(1);
		expect(nest.m2).toBeCloseTo(area(park), 3);
		expect(nest.last_changed).toBe(group.last_changed);
		expect(nest.updated).toBeNull();
		expect(nest.pokemon_ratio).toBeNull();
	});

	it("retains an established single-species park without locally retained membership", () => {
		const [nest] = buildTalonflameNests([group], [], [source()]);
		expect(geometry(nest).geometry.coordinates).toEqual([park.geometry.coordinates]);
		expect(booleanPointInPolygon(point([nest.lon, nest.lat]), park)).toBe(true);
	});

	it("partitions two species with one straight cut, preserving all outer OSM edges", () => {
		const nests = buildTalonflameNests(
			[group, subnest],
			[
				member(53.555, 9.974),
				member(53.565, 9.974),
				member(53.555, 9.986, subnest.id),
				member(53.565, 9.986, subnest.id)
			],
			[source(), source(subnest)]
		);
		expect(nests).toHaveLength(2);
		expectPartition(nests, park);
		const originalVertices = new Set(park.geometry.coordinates[0].map((p) => JSON.stringify(p)));
		const cutVertices = geometry(nests[0])
			.geometry.coordinates.flat(2)
			.filter((p) => !originalVertices.has(JSON.stringify(p)));
		expect(new Set(cutVertices.map((p) => JSON.stringify(p))).size).toBe(2);
		expect(new Set(cutVertices.map((p) => p[1]))).toEqual(new Set([53.55, 53.57]));
		expect(nests.map((nest) => nest.spawnpoints)).toEqual([2, 2]);
	});

	it("fits diagonal disagreements without turning the park into cell patches", () => {
		const nests = buildTalonflameNests(
			[group, subnest],
			[
				member(53.553, 9.973),
				member(53.556, 9.976),
				member(53.564, 9.984, subnest.id),
				member(53.567, 9.987, subnest.id)
			],
			[source(), source(subnest)]
		);
		expectPartition(nests, park);
		for (const nest of nests) expect(geometry(nest).geometry.coordinates).toHaveLength(1);
	});

	it("preserves concave OSM boundaries, holes and disconnected park sections when split", () => {
		const concave = polygon([
			[
				[9.97, 53.55],
				[9.99, 53.55],
				[9.99, 53.57],
				[9.98, 53.57],
				[9.98, 53.565],
				[9.97, 53.565],
				[9.97, 53.55]
			],
			[
				[9.972, 53.552],
				[9.975, 53.552],
				[9.975, 53.554],
				[9.972, 53.554],
				[9.972, 53.552]
			]
		]);
		const multipart = multiPolygon([
			concave.geometry.coordinates,
			[
				[
					[9.97, 53.568],
					[9.974, 53.568],
					[9.974, 53.57],
					[9.97, 53.57],
					[9.97, 53.568]
				]
			]
		]);
		const nests = buildTalonflameNests(
			[group, subnest],
			[member(53.56, 9.974), member(53.569, 9.972), member(53.56, 9.986, subnest.id)],
			[source(group, multipart.geometry), source(subnest, multipart.geometry)]
		);
		expectPartition(nests, multipart);
		for (const nest of nests) {
			expect(booleanPointInPolygon(point([9.973, 53.553]), geometry(nest))).toBe(false);
			expect(booleanPointInPolygon(point([9.975, 53.567]), geometry(nest))).toBe(false);
		}
	});

	it("uses successive straight cuts for three populations without gaps or overlapping interiors", () => {
		const third = { ...group, id: "-255", pokemon_id: 276 };
		const nests = buildTalonflameNests(
			[group, subnest, third],
			[
				member(53.555, 9.973),
				member(53.565, 9.973),
				member(53.56, 9.98, subnest.id),
				member(53.567, 9.987, third.id)
			],
			[source(), source(subnest), source(third)]
		);
		expect(nests).toHaveLength(3);
		expectPartition(nests, park);
	});

	it("does not cut or duplicate a park for groups of the same species/form", () => {
		const sameSpecies = { ...group, id: "-77" };
		const sources = [source(), source(sameSpecies)];
		const members = [member(53.56, 9.974), member(53.56, 9.986, sameSpecies.id)];
		const nests = buildTalonflameNests([group, sameSpecies], members, sources);
		expect(nests).toHaveLength(1);
		expect(nests[0].id).toBe(group.id);
		expect(nests[0].spawnpoints).toBe(2);
		expect(geometry(nests[0]).geometry.coordinates).toEqual([park.geometry.coordinates]);
		const direct = buildTalonflameNests([sameSpecies], members, sources);
		expect(direct[0].id).toBe(sameSpecies.id);
		expect(direct[0].polygon).toEqual(nests[0].polygon);
	});

	it("keeps cuts and marker positions stable when panning or filtering out a competing species", () => {
		const sources = [source(), source(subnest)];
		const members = [member(53.56, 9.974), member(53.56, 9.986, subnest.id)];
		const full = buildTalonflameNests([group, subnest], members, sources);
		const partial = buildTalonflameNests([group], members, sources, {
			minLon: 9.97,
			maxLon: 9.98,
			minLat: 53.55,
			maxLat: 53.56
		});
		expect(partial).toEqual([full[0]]);
	});

	it("clips park regions to allowed areas after fitting the cut with all evidence", () => {
		const sources = [source(), source(subnest)];
		const members = [member(53.56, 9.974), member(53.56, 9.986, subnest.id)];
		const full = buildTalonflameNests([group, subnest], members, sources);
		const allowed = polygon([
			[
				[9.97, 53.55],
				[9.978, 53.55],
				[9.978, 53.57],
				[9.97, 53.57],
				[9.97, 53.55]
			]
		]);
		const nests = buildTalonflameNests([group, subnest], members, sources, undefined, allowed);
		expect(nests).toHaveLength(1);
		expect(nests[0].id).toBe(group.id);
		expect(area(geometry(nests[0]))).toBeCloseTo(area(allowed), 3);
		expect(area(geometry(full[0]))).toBeGreaterThan(nests[0].m2!);
	});

	it("unions linked source parks without duplicate overlapping overlays", () => {
		const second = polygon([
			[
				[9.98, 53.55],
				[10, 53.55],
				[10, 53.57],
				[9.98, 53.57],
				[9.98, 53.55]
			]
		]);
		const [nest] = buildTalonflameNests(
			[group],
			[member(53.56, 9.985)],
			[source(), source(group, second.geometry, "168566")]
		);
		const expected = union(featureCollection([park, second]))!;
		expect(area(geometry(nest))).toBeCloseTo(area(expected), 3);
		expect(nest.spawnpoints).toBe(1);
	});

	it("does not return a park when its cut region is outside the viewport", () => {
		expect(
			buildTalonflameNests(
				[subnest],
				[member(53.56, 9.974), member(53.56, 9.986, subnest.id)],
				[source(), source(subnest)],
				{ minLon: 9.97, maxLon: 9.975, minLat: 53.55, maxLat: 53.57 }
			)
		).toEqual([]);
	});

	it("ignores malformed S2 IDs while retaining the OSM geofence", () => {
		const [nest] = buildTalonflameNests(
			[group],
			["0", "invalid", "18446744073709551615"].map((spawnpoint_id) => ({
				nest_id: group.id,
				spawnpoint_id
			})),
			[source()]
		);
		expect(nest.spawnpoints).toBe(0);
		expect(geometry(nest).geometry.coordinates).toEqual([park.geometry.coordinates]);
	});

	it("supports GeoJSON returned as a SQL string", () => {
		const [nest] = buildTalonflameNests(
			[group],
			[],
			[{ ...source(), geometry: JSON.stringify(park.geometry) }]
		);
		expect(geometry(nest).geometry.coordinates).toEqual([park.geometry.coordinates]);
	});
});
