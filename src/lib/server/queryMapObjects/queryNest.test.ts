import { beforeEach, describe, expect, it, vi } from "vitest";
import { s2 } from "s2js";
import type { FilterNest } from "@/lib/features/filters/filters";

const config = vi.hoisted(() => ({ golbat: { nestSource: "talonflame" as string } }));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));
vi.mock("@/lib/server/db/external/internalQuery", () => ({ query: vi.fn() }));
vi.mock("@/lib/features/filterLogic/nest", () => ({ shouldDisplayNest: () => true }));
vi.mock("@/lib/utils/pokemonUtils", () => ({
	getNormalizedForm: (_id: number, form: number) => form
}));

import { NestQuery } from "./queryNest";

const bounds = { minLat: 53.55, minLon: 9.97, maxLat: 53.57, maxLon: 9.99 };
const group = {
	id: "8103463",
	pokemon_id: 16,
	form: 0,
	name: "Planten un Blomen",
	area_name: "Hamburg",
	last_changed: null
};
const spawnpoint = (
	s2.cellid.parent(s2.cellid.fromLatLng(s2.LatLng.fromDegrees(53.56, 9.98)), 20) >> 20n
).toString();
const member = { nest_id: group.id, spawnpoint_id: spawnpoint };

class TestNestQuery extends NestQuery {
	calls: { sql: string; values: unknown[] }[] = [];
	constructor(private responses: unknown[][]) {
		super();
	}
	protected async executeQuery<T>(sql: string, values: unknown[]): Promise<T> {
		this.calls.push({ sql, values });
		return this.responses.shift() as T;
	}
}

beforeEach(() => {
	config.golbat.nestSource = "talonflame";
});

describe("NestQuery backends", () => {
	it("keeps Fletchling SQL as the default without referencing Talonflame tables", async () => {
		config.golbat.nestSource = "";
		const query = new TestNestQuery([[]]);
		await query.query(bounds, undefined, null, 100);
		expect(query.calls).toHaveLength(1);
		expect(query.calls[0].sql).toContain("FROM nests");
		expect(query.calls[0].sql).toContain("pokemon_id IS NOT NULL");
		expect(query.calls[0].sql).toContain("updated > ?");
		expect(query.calls[0].sql).not.toContain("talonflame");
	});

	it("returns confirmed logical groups even when the legacy species/update is absent", async () => {
		const query = new TestNestQuery([[group], [member]]);
		const result = await query.query(bounds, undefined, null, 2000000000);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].pokemon_id).toBe(16);
		expect(query.calls).toHaveLength(2);
		expect(query.calls[0].sql).toContain("g.status = 'confirmed'");
		expect(query.calls[0].sql).not.toContain("n.pokemon_id");
		expect(query.calls[0].sql).not.toContain("updated >");
		expect(query.calls[0].values).not.toContain(2000000000);
		expect(query.calls[0].sql).toContain("GROUP BY g.nest_id");
		expect(query.calls[1].values).toEqual([group.id]);
	});

	it("applies species filters to logical group species", async () => {
		const query = new TestNestQuery([[]]);
		await query.query(
			bounds,
			{
				enabled: true,
				filters: [{ enabled: true, pokemon: [{ pokemon_id: 16, form: 0 }] }]
			} as FilterNest,
			null
		);
		expect(query.calls[0].sql).toContain("g.pokemon_id = ?");
		expect(query.calls[0].values.at(-1)).toBe(16);
	});

	it("limits logical groups before loading their member footprints", async () => {
		const query = new TestNestQuery([[group, { ...group, id: "-375", pokemon_id: 769 }]]);
		const result = await query.query(bounds, undefined, null, undefined, 1);
		expect(result).toEqual({ data: [], examined: 1, limitReached: true });
		expect(query.calls).toHaveLength(1);
		expect(query.calls[0].sql).toContain("LIMIT 2");
	});

	it("supports stable negative group IDs in direct links", async () => {
		const subnest = { ...group, id: "-375", pokemon_id: 769 };
		const query = new TestNestQuery([[subnest], [{ ...member, nest_id: subnest.id }]]);
		const result = await query.querySingle(subnest.id);
		expect(result[0].id).toBe("-375");
		expect(result[0].pokemon_id).toBe(769);
		expect(query.calls[0].values).toEqual(["-375"]);
		expect(query.calls[0].sql).toContain("g.status = 'confirmed'");
	});

	it("does not load membership when no confirmed group matches", async () => {
		const query = new TestNestQuery([[]]);
		expect(await query.querySingle("-999")).toEqual([]);
		expect(query.calls).toHaveLength(1);
	});
});
