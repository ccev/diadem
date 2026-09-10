# Combined Fort Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Golbat call per map pan for gyms, pokéstops and stations (via `POST /api/forts` → `ScanForts`), station scans that return only displayable stations, with every per-type behaviour (permissions, rate-limit budgets, limit fallback, deltas, filter-hash cache) preserved.

**Architecture:** The per-type route's admit/resolve/settle pipeline moves into a shared module used by both the existing `/api/<type>` route and a new `/api/forts` route. `queryFortsCombined` issues one combined scan (gRPC, then HTTP, then three parallel SQL queries) and feeds each slice through the same `Api*Query.processScan` and `MapObjectQuery.finish` steps the single-type path uses. The client splits `updateMapObject` into a plan half and an apply half so one `fetchForts` request can serve three plans.

**Tech Stack:** SvelteKit (TypeScript 6 strict, Svelte 5 runes), grpc-js + ts-proto generated client, vitest 5, pnpm 11, Node 24.

**Spec:** `docs/superpowers/specs/2026-09-09-combined-fort-request-design.md`. Read it before starting.

## Global Constraints

- Package manager is pnpm 11.25.0. `pnpm` is NOT on PATH in this environment; prefix every command with `export PATH=/private/tmp/claude-501/-Users-james-dev-diadem/391ea162-2b86-4557-83ec-d2da87ceb0d7/scratchpad/bin:$PATH` (a shim that runs `corepack pnpm`). Node 24.
- **Gates for every task:** `pnpm test` fully green. `pnpm run check` and `pnpm run lint` have pre-existing failures in UI files (`src/components/**`, `src/lib/drawer`, `src/lib/ui`, `src/lib/utils/numberFormat.ts`, `project.inlang/.meta.json`) that are out of scope and must not be touched. The gate is: `pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'` prints nothing, and `pnpm exec prettier --check <every file you created or modified>` passes (markdown and TOML are not prettier-checked).
- If `pnpm run check` reports missing paraglide messages, run `pnpm exec paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` first.
- Formatting: tabs, double quotes. Run `pnpm exec prettier --write <files>` before committing; the plan's code blocks may need prettier's wrapping.
- Golbat proto pinned at commit `b24956a` of UnownHash/Golbat `feat/grpc-api`. The generated file `src/lib/server/api/grpc/golbat_api.ts` is never hand-edited.
- Logger API: `getLogger(name)` → `{ debug, info, warning, error }`. No `warn`.
- `golbatGrpcMapping.ts` must not import `@/lib/utils/pokemonUtils` at runtime.
- Behaviour of the single-type `/api/<type>` route, of pokémon scans, and of active-search mode must not change. The existing tests `fortAdapters.test.ts`, `fortDnf.test.ts`, `golbatGrpc.test.ts`, `golbatGrpcMapping.test.ts` are modified only where a task says so.
- Commit messages: conventional prefix, and end with exactly this trailer line: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- Do not touch files unrelated to the task.

---

## File map

| File | Responsibility |
|---|---|
| `proto/golbat_api.proto`, `src/lib/server/api/grpc/golbat_api.ts` | bump to `b24956a` (regenerated) |
| `src/lib/server/queryMapObjects/queries.d.ts` | `battle_available`, `FortTypeScanGroup`, `FortCombinedScanBody`, `FortTypeScanStats` |
| `src/lib/server/api/golbatApi.ts` | `FortCombinedScanResponse`, `scanForts` |
| `src/lib/server/queryMapObjects/fortDnf.ts` | station clauses carry `station_active` + `battle_available` |
| `src/lib/server/api/golbatGrpcMapping.ts` | `toFortCombinedScanRequest`, `fromFortScanResponse` |
| `src/lib/server/api/golbatGrpc.ts` | `grpcScanForts` |
| `src/lib/server/queryMapObjects/MapObjectQuery.ts` | `finish()` split out of `getMultiple()` |
| `queryGymApi.ts`, `queryPokestopApi.ts`, `queryStationApi.ts` | `processScan()` split out of `query()` |
| `src/lib/server/queryMapObjects/queryMapObjects.ts` | `FortType`, `fortTypes`, `FortQueryEntry`, `queryFortsCombined()` |
| `src/lib/server/api/mapObjectRequest.ts` | `isValidBounds`, `admitType`, `resolveTypeRequest`, `refundDenied`, `settleTypeRequest` |
| `src/routes/api/[queryMapObject=mapObject]/+server.ts` | uses the shared pipeline |
| `src/routes/api/forts/+server.ts` | new combined route |
| `src/lib/mapObjects/updateMapObject.ts` | `planMapObjectRequest`, `applyMapObjectResponse`, `runPlan`, `fetchForts`, fort partition |
| `CLAUDE.md` | data-flow note |

---

### Task 1: Proto bump, types, station DNF

**Files:**
- Modify: `proto/golbat_api.proto` (re-copy), `src/lib/server/api/grpc/golbat_api.ts` (regenerate)
- Modify: `src/lib/server/queryMapObjects/queries.d.ts`
- Modify: `src/lib/server/api/golbatApi.ts`
- Modify: `src/lib/server/queryMapObjects/fortDnf.ts` (`buildStationDnfFilters`)
- Modify: `src/lib/server/queryMapObjects/fortDnf.test.ts` (station describe block)

**Interfaces:**
- Produces in `queries.d.ts`:
  ```ts
  // added to GolbatFortDnfFilter
  battle_available?: boolean;

  export type FortTypeScanGroup = { filters?: GolbatFortDnfFilter[]; limit: number };
  export type FortCombinedScanBody = {
  	min: { latitude: number; longitude: number };
  	max: { latitude: number; longitude: number };
  	limit: number;
  	with_incidents?: boolean;
  	gyms?: FortTypeScanGroup;
  	pokestops?: FortTypeScanGroup;
  	stations?: FortTypeScanGroup;
  };
  export type FortTypeScanStats = { examined: number; limit_reached: boolean };
  ```
- Produces in `golbatApi.ts`:
  ```ts
  export type FortCombinedScanResponse = {
  	gyms: GolbatGymResult[]; pokestops: GolbatPokestopResult[]; stations: GolbatStationResult[];
  	examined: number; skipped: number; total: number; limit_reached: boolean;
  	gyms_stats: FortTypeScanStats; pokestops_stats: FortTypeScanStats; stations_stats: FortTypeScanStats;
  };
  export function scanForts(body: FortCombinedScanBody): Promise<FortCombinedScanResponse | undefined>
  ```
- Produces in the generated module: `FortCombinedScanRequest`, `FortTypeScanGroup`, `FortTypeScanStats`, `FortScanResponse` (with `gyms_stats`/`pokestops_stats`/`stations_stats`), `FortDnfFilter.battle_available`, and `GolbatApiClient.scanForts(request, metadata, options, callback)`.

- [ ] **Step 1: Re-copy the proto and regenerate**

```bash
curl -fsSL https://raw.githubusercontent.com/UnownHash/Golbat/b24956a/grpc/api.proto -o proto/golbat_api.proto
```

Prepend these two lines above `syntax = "proto3";`:

```proto
// Copied verbatim from UnownHash/Golbat grpc/api.proto at commit b24956a (branch feat/grpc-api).
// Do not edit. Re-copy when Golbat changes it, then run `pnpm run grpc:generate` and commit both.
```

Then:

```bash
pnpm run grpc:generate
grep -c "battle_available" src/lib/server/api/grpc/golbat_api.ts
grep -n "gyms_stats?: FortTypeScanStats" src/lib/server/api/grpc/golbat_api.ts
grep -n "^  scanForts(" src/lib/server/api/grpc/golbat_api.ts | head -1
```

Expected: a count of at least 3; one `gyms_stats` interface line; a `scanForts(` client method.

- [ ] **Step 2: Extend the types**

In `queries.d.ts`, add `battle_available?: boolean;` to `GolbatFortDnfFilter` directly after `station_active?: boolean;`, and append at the end of the file:

```ts
export type FortTypeScanGroup = { filters?: GolbatFortDnfFilter[]; limit: number };

export type FortCombinedScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	with_incidents?: boolean;
	gyms?: FortTypeScanGroup;
	pokestops?: FortTypeScanGroup;
	stations?: FortTypeScanGroup;
};

export type FortTypeScanStats = { examined: number; limit_reached: boolean };
```

In `golbatApi.ts`, extend the `queries` type import to include `FortCombinedScanBody` and `FortTypeScanStats`, add after `StationScanResponse`:

```ts
export type FortCombinedScanResponse = {
	gyms: GolbatGymResult[];
	pokestops: GolbatPokestopResult[];
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached: boolean;
	gyms_stats: FortTypeScanStats;
	pokestops_stats: FortTypeScanStats;
	stations_stats: FortTypeScanStats;
};
```

and after `scanStations`:

```ts
export function scanForts(body: FortCombinedScanBody) {
	return callGolbat<FortCombinedScanResponse>("api/fort/scan", "POST", JSON.stringify(body));
}
```

- [ ] **Step 3: Update the station DNF tests (RED)**

In `fortDnf.test.ts`, replace the whole `describe("buildStationDnfFilters", ...)` block with:

```ts
describe("buildStationDnfFilters", () => {
	const active = { station_active: true, battle_available: true };

	it("falls back to the active-with-battle-available clause when no filterset is enabled", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [];

		expect(buildStationDnfFilters(filter)).toStrictEqual([active]);
	});

	it("translates isActive to the same clause", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [{ ...filterset, isActive: true }];

		expect(buildStationDnfFilters(filter)).toStrictEqual([active]);
	});

	it("merges enabled bosses with the active clause but without form or bread-mode constraints", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [
			{
				...filterset,
				bosses: [
					{ pokemon_id: 809, form: 0, bread_mode: 2 },
					{ pokemon_id: 25, form: 61, bread_mode: 1 }
				]
			},
			{ ...filterset, enabled: false, bosses: [{ pokemon_id: 6, form: 0, bread_mode: 2 }] }
		];

		expect(buildStationDnfFilters(filter)).toStrictEqual([
			{ ...active, battle_pokemon: [{ pokemon_id: 809 }, { pokemon_id: 25 }] }
		]);
	});

	it("translates hasGmax", () => {
		const filter = getDefaultStationFilter();
		filter.enabled = true;
		filter.maxBattle.enabled = true;
		filter.maxBattle.filters = [{ ...filterset, hasGmax: true }];

		expect(buildStationDnfFilters(filter)).toStrictEqual([{ ...active, stationed_gmax: true }]);
	});
});
```

Run: `pnpm test src/lib/server/queryMapObjects/fortDnf.test.ts`
Expected: the four station tests FAIL (missing `battle_available`).

- [ ] **Step 4: Update the builder (GREEN)**

Replace `buildStationDnfFilters` in `fortDnf.ts` with:

```ts
export function buildStationDnfFilters(filter: FilterStation | undefined): GolbatFortDnfFilter[] {
	if (!filter || filter.stationPlain.enabled || !filter.maxBattle.enabled) return [];

	// Diadem's max-battle display rule (shouldDisplayStation / isMaxBattleActive): not inactive,
	// battle available, inside the station window. Golbat's station_active + battle_available is
	// exactly that, so every clause starts from it.
	const active: GolbatFortDnfFilter = { station_active: true, battle_available: true };
	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.maxBattle.filters.filter((f) => f.enabled)) {
		if (filterset.isActive) {
			clauses.push({ ...active });
			continue;
		}
		if (filterset.hasGmax) {
			clauses.push({ ...active, stationed_gmax: true });
			continue;
		}
		if (filterset.bosses?.length) {
			clauses.push({
				...active,
				battle_pokemon: filterset.bosses.map((boss) => ({ pokemon_id: boss.pokemon_id }))
			});
		}
	}

	return clauses.length ? clauses : [{ ...active }];
}
```

Run: `pnpm test src/lib/server/queryMapObjects/fortDnf.test.ts`
Expected: all pass.

- [ ] **Step 5: Gates and commit**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/lib/server/queryMapObjects/queries.d.ts src/lib/server/api/golbatApi.ts src/lib/server/queryMapObjects/fortDnf.ts src/lib/server/queryMapObjects/fortDnf.test.ts`
Expected: green, grep prints nothing, prettier passes. The existing `generated.test.ts` and `golbatGrpc.test.ts` must still pass against the regenerated client.

```bash
git add proto/golbat_api.proto src/lib/server/api/grpc/golbat_api.ts src/lib/server/queryMapObjects/queries.d.ts src/lib/server/api/golbatApi.ts src/lib/server/queryMapObjects/fortDnf.ts src/lib/server/queryMapObjects/fortDnf.test.ts
git commit -m "feat: golbat b24956a proto, combined scan types, battle_available on station dnf"
```

---

### Task 2: Combined scan mapping and gRPC call

**Files:**
- Modify: `src/lib/server/api/golbatGrpcMapping.ts`
- Modify: `src/lib/server/api/golbatGrpcMapping.test.ts` (append)
- Modify: `src/lib/server/api/golbatGrpc.ts`
- Modify: `src/lib/server/api/golbatGrpc.test.ts` (stub `scanForts`, add a case)

**Interfaces:**
- Consumes: Task 1 types; the private `fromGym`, `fromPokestop`, `fromStation`, `toLatLon` already in the mapping module; `call()` and `scanViaGrpcOrHttp` in `golbatGrpc.ts`.
- Produces:
  ```ts
  export function toFortCombinedScanRequest(body: FortCombinedScanBody): pb.FortCombinedScanRequest
  export function fromFortScanResponse(res: pb.FortScanResponse): FortCombinedScanResponse
  export function grpcScanForts(body: FortCombinedScanBody): Promise<FortCombinedScanResponse>
  ```

- [ ] **Step 1: Mapping tests (RED)**

Append to `golbatGrpcMapping.test.ts` (extend the import list with `fromFortScanResponse`, `toFortCombinedScanRequest`):

```ts
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
```

Run: `pnpm test src/lib/server/api/golbatGrpcMapping.test.ts`
Expected: FAIL, the two new functions are not exported.

- [ ] **Step 2: Mapping implementation (GREEN)**

In `golbatGrpcMapping.ts`, extend the type imports (`FortCombinedScanBody`, `FortTypeScanGroup`, `FortTypeScanStats` from `queries`; `FortCombinedScanResponse` from `golbatApi`) and add after `toPokemonScanRequest`:

```ts
export function toFortCombinedScanRequest(body: FortCombinedScanBody): pb.FortCombinedScanRequest {
	// An absent group excludes that type; an empty filter list means every fort of the type.
	const group = (g: FortTypeScanGroup | undefined): pb.FortTypeScanGroup | undefined =>
		g && { filters: g.filters ?? [], limit: g.limit };
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		with_incidents: body.with_incidents ?? false,
		gyms: group(body.gyms),
		pokestops: group(body.pokestops),
		stations: group(body.stations)
	};
}
```

and after `fromStationScanResponse`:

```ts
export function fromFortScanResponse(res: pb.FortScanResponse): FortCombinedScanResponse {
	const stats = (s: pb.FortTypeScanStats | undefined): FortTypeScanStats => ({
		examined: s?.examined ?? 0,
		limit_reached: s?.limit_reached ?? false
	});
	return {
		gyms: (res.gyms ?? []).map(fromGym),
		pokestops: (res.pokestops ?? []).map(fromPokestop),
		stations: (res.stations ?? []).map(fromStation),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false,
		gyms_stats: stats(res.gyms_stats),
		pokestops_stats: stats(res.pokestops_stats),
		stations_stats: stats(res.stations_stats)
	};
}
```

Run: `pnpm test src/lib/server/api/golbatGrpcMapping.test.ts`
Expected: all pass.

- [ ] **Step 3: Wire test (RED)**

In `golbatGrpc.test.ts`:

- Extend the generated import with `type FortCombinedScanRequest`.
- Extend the import from `./golbatGrpc` with `grpcScanForts`.
- Add `let receivedCombined: FortCombinedScanRequest | undefined;` next to `received`, reset it in `beforeEach`.
- Replace `scanForts: unimplemented,` in the server implementation with:

```ts
		scanForts(call, callback) {
			receivedCombined = call.request;
			callback(null, {
				gyms: [{ id: "g1", lat: 1.5, lon: 2.5, updated: 100, deleted: false, first_seen_timestamp: 1 }],
				pokestops: [],
				stations: [{ id: "s1", lat: 1, lon: 2, name: "S", updated: 9, is_inactive: false, is_battle_available: true }],
				examined: 40,
				skipped: 0,
				total: 40,
				limit_reached: false,
				gyms_stats: { examined: 25, limit_reached: false },
				pokestops_stats: { examined: 0, limit_reached: false },
				stations_stats: { examined: 15, limit_reached: true }
			});
		},
```

- Add a test to the `golbatGrpc` describe block:

```ts
	it("round-trips a combined fort scan with per-type groups and stats", async () => {
		const res = await grpcScanForts({
			min: { latitude: 51.5, longitude: -0.2 },
			max: { latitude: 51.6, longitude: -0.1 },
			limit: 22,
			with_incidents: true,
			gyms: { filters: [{ raid_level: [5] }], limit: 11 },
			stations: { filters: [{ station_active: true, battle_available: true }], limit: 11 }
		});

		expect(receivedCombined?.limit).toBe(22);
		expect(receivedCombined?.with_incidents).toBe(true);
		expect(receivedCombined?.gyms?.limit).toBe(11);
		expect(receivedCombined?.gyms?.filters?.[0].raid_level).toEqual([5]);
		expect(receivedCombined?.pokestops).toBeUndefined();
		expect(receivedCombined?.stations?.filters?.[0].battle_available).toBe(true);

		expect(res.gyms.map((g) => g.id)).toEqual(["g1"]);
		expect(res.pokestops).toEqual([]);
		expect(res.stations[0]).toMatchObject({ id: "s1", is_battle_available: true });
		expect(res.gyms_stats).toEqual({ examined: 25, limit_reached: false });
		expect(res.stations_stats).toEqual({ examined: 15, limit_reached: true });
	});
```

Run: `pnpm test src/lib/server/api/golbatGrpc.test.ts`
Expected: FAIL, `grpcScanForts` not exported.

- [ ] **Step 4: `grpcScanForts` (GREEN)**

In `golbatGrpc.ts`, extend the imports (`FortCombinedScanBody` from `queries`, `FortCombinedScanResponse` from `golbatApi`, `fromFortScanResponse` and `toFortCombinedScanRequest` from the mapping module) and add after `grpcScanStations`:

```ts
export async function grpcScanForts(body: FortCombinedScanBody): Promise<FortCombinedScanResponse> {
	const request = toFortCombinedScanRequest(body);
	return fromFortScanResponse(
		await call("ScanForts", (c, md, opts, cb) => c.scanForts(request, md, opts, cb))
	);
}
```

Run: `pnpm test src/lib/server/api/golbatGrpc.test.ts`
Expected: all pass (8 tests).

- [ ] **Step 5: Gates and commit**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/lib/server/api/golbatGrpcMapping.ts src/lib/server/api/golbatGrpcMapping.test.ts src/lib/server/api/golbatGrpc.ts src/lib/server/api/golbatGrpc.test.ts`

```bash
git add src/lib/server/api/golbatGrpcMapping.ts src/lib/server/api/golbatGrpcMapping.test.ts src/lib/server/api/golbatGrpc.ts src/lib/server/api/golbatGrpc.test.ts
git commit -m "feat: combined fort scan over grpc and http"
```

---

### Task 3: Split the query classes into scan and post-processing

**Files:**
- Modify: `src/lib/server/queryMapObjects/MapObjectQuery.ts` (`getMultiple`)
- Modify: `src/lib/server/queryMapObjects/queryGymApi.ts`, `queryPokestopApi.ts`, `queryStationApi.ts` (`query()`)
- Modify: `src/lib/server/queryMapObjects/fortAdapters.test.ts` (append)

**Interfaces:**
- Produces on `MapObjectQuery<MapObject, Filter>`:
  ```ts
  public finish(result: MapObjectResponse<MinMapObject<MapObject>>, filter: Filter | undefined, polygon: PermittedPolygon, context?: FeaturePermissionContext): MapObjectResponse<MapObject>
  ```
  `getMultiple` becomes `this.finish(await this.query(...), filter, polygon, context)`. No behaviour change.
- Produces on `ApiGymQuery` / `ApiPokestopQuery` / `ApiStationQuery`:
  ```ts
  processScan(records: GolbatGymResult[] /* GolbatPokestopResult[] / GolbatStationResult[] */, examined: number, polygon: PermittedPolygon, since?: number): MapObjectResponse<MinMapObject<GymData /* PokestopData / StationData */>>
  ```
  which is the per-record loop currently inside `query()` (deleted / `since` / polygon / map). `query()` becomes: build body → `scanViaGrpcOrHttp` → `if (!result || result.limit_reached) return super.query(...)` → `return this.processScan(...)`.

- [ ] **Step 1: Tests (RED)**

Append inside the `describe("fort API adapters", ...)` block of `fortAdapters.test.ts`:

```ts
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
		const out = new ApiGymQuery().finish({ data: [], examined: 7, limitReached: true }, undefined, null);
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
```

Run: `pnpm test src/lib/server/queryMapObjects/fortAdapters.test.ts`
Expected: FAIL, `finish`/`processScan` do not exist.

- [ ] **Step 2: `MapObjectQuery.finish` (GREEN, part 1)**

In `MapObjectQuery.ts`, replace `getMultiple` with:

```ts
	public async getMultiple(
		bounds: Bounds,
		filter: Filter | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number,
		context?: FeaturePermissionContext
	): Promise<MapObjectResponse<MapObject>> {
		return this.finish(
			await this.query(bounds, filter, polygon, since, limit, context),
			filter,
			polygon,
			context
		);
	}

	// Everything after the scan: permission stripping, local filtering, map object shaping.
	// Shared by getMultiple() and the combined fort scan.
	public finish(
		result: MapObjectResponse<MinMapObject<MapObject>>,
		filter: Filter | undefined,
		polygon: PermittedPolygon,
		context?: FeaturePermissionContext
	): MapObjectResponse<MapObject> {
		if (result.limitReached) {
			return {
				examined: result.examined,
				data: [],
				limitReached: true
			};
		}

		for (const item of result.data) {
			this.prepare(item, context);
		}

		const data: MapObject[] = [];
		for (const item of result.data) {
			if (!filter || this.filter(item, filter, polygon, context)) {
				data.push(this.makeMapObject(item));
			}
		}

		return { examined: result.examined, data };
	}
```

- [ ] **Step 3: `processScan` on the three classes (GREEN, part 2)**

`queryGymApi.ts`: replace the body of `query()` after the `try/catch` with

```ts
		if (!result || result.limit_reached) return super.query(bounds, filter, polygon, since, limit);
		return this.processScan(result.gyms, result.examined, polygon, since);
	}

	// Per-record trimming after any scan (single or combined). examined drops for records the
	// permission polygon excludes, so rate-limit charges match what the user could see.
	processScan(
		gyms: GolbatGymResult[],
		examined: number,
		polygon: PermittedPolygon,
		since?: number
	): MapObjectResponse<MinMapObject<GymData>> {
		const data: MinMapObject<GymData>[] = [];
		for (const g of gyms) {
			if (g.deleted) continue;
			if (since !== undefined && (g.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([g.lon, g.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapGym(g));
		}
		return { data, examined };
	}
```

`queryPokestopApi.ts`: same shape with `result.pokestops`, `GolbatPokestopResult[]`, `PokestopData`, `mapPokestop(p)` and the `deleted` check kept.

`queryStationApi.ts`: same shape with `result.stations`, `GolbatStationResult[]`, `StationData`, `mapStation(s)`, and no `deleted` check (stations have none).

Run: `pnpm test src/lib/server/queryMapObjects/fortAdapters.test.ts`
Expected: all pass.

- [ ] **Step 4: Gates and commit**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/lib/server/queryMapObjects/MapObjectQuery.ts src/lib/server/queryMapObjects/queryGymApi.ts src/lib/server/queryMapObjects/queryPokestopApi.ts src/lib/server/queryMapObjects/queryStationApi.ts src/lib/server/queryMapObjects/fortAdapters.test.ts`

```bash
git add src/lib/server/queryMapObjects/MapObjectQuery.ts src/lib/server/queryMapObjects/queryGymApi.ts src/lib/server/queryMapObjects/queryPokestopApi.ts src/lib/server/queryMapObjects/queryStationApi.ts src/lib/server/queryMapObjects/fortAdapters.test.ts
git commit -m "refactor: split fort query classes into scan and post-processing"
```

---

### Task 4: `queryFortsCombined`

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryMapObjects.ts`
- Create: `src/lib/server/queryMapObjects/queryFortsCombined.test.ts`

**Interfaces:**
- Consumes: `scanForts` (Task 1), `grpcScanForts` (Task 2), `processScan`/`finish` (Task 3), `buildGymDnfFilters`/`buildPokestopDnfFilters`/`buildStationDnfFilters`, `getFortApiScanLimit`, `isFortApiEnabled`, `requestLimits`, `scanViaGrpcOrHttp`.
- Produces in `queryMapObjects.ts`:
  ```ts
  export type FortType = MapObjectType.GYM | MapObjectType.POKESTOP | MapObjectType.STATION;
  export const fortTypes: FortType[];
  export type FortQueryEntry = {
  	filter: AnyFilter | undefined;
  	bounds: Bounds;
  	polygon: PermittedPolygon;
  	since?: number;
  	limit: number;
  	context?: FeaturePermissionContext;
  };
  export async function queryFortsCombined(entries: Partial<Record<FortType, FortQueryEntry>>): Promise<Partial<Record<FortType, MapObjectResponse<MapData>>>>
  ```

- [ ] **Step 1: Test (RED)**

`queryFortsCombined.test.ts`:

```ts
import type { AnyFilter } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import * as golbat from "@/lib/server/api/golbatApi";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import { fortTypes, queryFortsCombined } from "@/lib/server/queryMapObjects/queryMapObjects";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/activeSearch.svelte", () => ({}));
vi.mock("@/lib/features/masterStats.svelte", () => ({}));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({}));
vi.mock("@/lib/services/userSettings.svelte", () => ({}));
vi.mock("@/lib/services/ingameLocale", () => ({}));
vi.mock("@/lib/services/uicons.svelte", () => ({}));
vi.mock("$lib/features/masterStats.svelte", () => ({}));
vi.mock("$lib/server/queryMapObjects/invasionRewards", () => ({}));
vi.mock("@/lib/services/masterfile", () => ({ getMasterPokemon: () => ({ defaultFormId: 0 }) }));

const fortApi = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/server/api/golbatFortApi", () => ({
	isFortApiEnabled: () => fortApi.enabled,
	getFortApiScanLimit: (limit: number) => Math.min(limit, 9000)
}));

afterEach(() => {
	vi.restoreAllMocks();
	fortApi.enabled = true;
});

const bounds = { minLat: 0, minLon: 0, maxLat: 5, maxLon: 5 };
const wider = { minLat: -1, minLon: 0, maxLat: 5, maxLon: 6 };
const gym = { id: "gym", lat: 1, lon: 2, updated: 100, first_seen_timestamp: 50, deleted: false };
const station = {
	id: "station",
	lat: 1,
	lon: 2,
	name: "S",
	cell_id: 0n,
	cooldown_complete: 0,
	updated: 100,
	is_inactive: false,
	is_battle_available: true
};
const emptyStats = { examined: 0, limit_reached: false };
const entry = (limit = 10000) => ({ filter: undefined, bounds, polygon: null, limit });

describe("queryFortsCombined", () => {
	it("issues one scan with a group per type, the union bbox and per-type limits, then post-processes each slice", async () => {
		const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [station],
			examined: 30,
			skipped: 0,
			total: 30,
			limit_reached: false,
			gyms_stats: { examined: 12, limit_reached: false },
			pokestops_stats: { examined: 8, limit_reached: false },
			stations_stats: { examined: 10, limit_reached: false }
		});

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: { ...entry(500), bounds: wider },
			[MapObjectType.STATION]: entry()
		});

		expect(scan).toHaveBeenCalledTimes(1);
		const body = scan.mock.calls[0][0];
		expect(body.min).toEqual({ latitude: -1, longitude: 0 });
		expect(body.max).toEqual({ latitude: 5, longitude: 6 });
		expect(body.with_incidents).toBe(true);
		expect(body.gyms).toEqual({ filters: [], limit: 9000 });
		expect(body.pokestops).toEqual({ filters: [], limit: 501 });
		expect(body.stations).toEqual({ filters: [], limit: 9000 });
		expect(body.limit).toBe(9000 + 501 + 9000);

		expect(results[MapObjectType.GYM]).toMatchObject({ examined: 12 });
		expect(results[MapObjectType.GYM]?.data[0]).toMatchObject({ type: "gym", id: "gym", deleted: 0 });
		expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 8, data: [] });
		expect(results[MapObjectType.STATION]?.data[0]).toMatchObject({ type: "station", id: "station" });
		expect(results[MapObjectType.STATION]?.examined).toBe(10);
	});

	it("omits types that were not requested and skips with_incidents without pokestops", async () => {
		const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [],
			pokestops: [],
			stations: [],
			examined: 0,
			skipped: 0,
			total: 0,
			limit_reached: false,
			gyms_stats: emptyStats,
			pokestops_stats: emptyStats,
			stations_stats: emptyStats
		});
		const results = await queryFortsCombined({ [MapObjectType.GYM]: entry() });
		const body = scan.mock.calls[0][0];
		expect(body.pokestops).toBeUndefined();
		expect(body.stations).toBeUndefined();
		expect(body.with_incidents).toBe(false);
		expect(Object.keys(results)).toEqual([MapObjectType.GYM]);
	});

	it("falls back to SQL for only the type whose per-type limit was reached", async () => {
		vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [],
			examined: 0,
			skipped: 0,
			total: 0,
			limit_reached: true,
			gyms_stats: { examined: 5, limit_reached: false },
			pokestops_stats: { examined: 9000, limit_reached: true },
			stations_stats: emptyStats
		});
		const sqlPokestops = vi
			.spyOn(PokestopQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 3, data: [] });
		const sqlGyms = vi.spyOn(GymQuery.prototype, "getMultiple");

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: entry()
		});

		expect(sqlPokestops).toHaveBeenCalledTimes(1);
		expect(sqlGyms).not.toHaveBeenCalled();
		expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 3, data: [] });
		expect(results[MapObjectType.GYM]?.data).toHaveLength(1);
	});

	it("answers a disabled filter and a match-nothing pokestop filter without scanning them", async () => {
		const scan = vi.spyOn(golbat, "scanForts").mockResolvedValue({
			gyms: [gym],
			pokestops: [],
			stations: [],
			examined: 1,
			skipped: 0,
			total: 1,
			limit_reached: false,
			gyms_stats: { examined: 1, limit_reached: false },
			pokestops_stats: emptyStats,
			stations_stats: emptyStats
		});
		const disabled = { enabled: false } as unknown as AnyFilter;
		// pokestop filter with every sub-filter off: buildPokestopDnfFilters returns null
		const nothing = {
			enabled: true,
			pokestopPlain: { enabled: false },
			lure: { enabled: false, filters: [] },
			quest: { enabled: false, filters: [] },
			invasion: { enabled: false, filters: [] },
			goldPokestop: { enabled: false },
			kecleon: { enabled: false },
			contest: { enabled: false, filters: [] }
		} as unknown as AnyFilter;

		const results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.POKESTOP]: { ...entry(), filter: nothing },
			[MapObjectType.STATION]: { ...entry(), filter: disabled }
		});

		const body = scan.mock.calls[0][0];
		expect(body.pokestops).toBeUndefined();
		expect(body.stations).toBeUndefined();
		expect(results[MapObjectType.POKESTOP]).toEqual({ examined: 0, data: [] });
		expect(results[MapObjectType.STATION]).toEqual({ examined: 0, data: [] });
		expect(results[MapObjectType.GYM]?.data).toHaveLength(1);
	});

	it("runs the SQL classes in parallel when the fort API is off or the scan fails", async () => {
		const gymSql = vi.spyOn(GymQuery.prototype, "getMultiple").mockResolvedValue({ examined: 1, data: [] });
		const stationSql = vi
			.spyOn(StationQuery.prototype, "getMultiple")
			.mockResolvedValue({ examined: 2, data: [] });
		const scan = vi.spyOn(golbat, "scanForts");

		fortApi.enabled = false;
		let results = await queryFortsCombined({
			[MapObjectType.GYM]: entry(),
			[MapObjectType.STATION]: entry()
		});
		expect(scan).not.toHaveBeenCalled();
		expect(results[MapObjectType.GYM]).toEqual({ examined: 1, data: [] });
		expect(results[MapObjectType.STATION]).toEqual({ examined: 2, data: [] });

		fortApi.enabled = true;
		scan.mockRejectedValue(new Error("boom"));
		results = await queryFortsCombined({ [MapObjectType.GYM]: entry() });
		expect(gymSql).toHaveBeenCalledTimes(2);
		expect(results[MapObjectType.GYM]).toEqual({ examined: 1, data: [] });
	});

	it("exposes the fort types in scan order", () => {
		expect(fortTypes).toEqual([MapObjectType.GYM, MapObjectType.POKESTOP, MapObjectType.STATION]);
	});
});
```

Run: `pnpm test src/lib/server/queryMapObjects/queryFortsCombined.test.ts`
Expected: FAIL, `queryFortsCombined`/`fortTypes` not exported.

- [ ] **Step 2: Implementation (GREEN)**

In `queryMapObjects.ts`, add imports:

```ts
import type { FilterGym, FilterPokestop, FilterStation } from "@/lib/features/filters/filters";
import { scanForts } from "@/lib/server/api/golbatApi";
import { getFortApiScanLimit } from "@/lib/server/api/golbatFortApi";
import { grpcScanForts, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
import { requestLimits } from "@/lib/server/api/rateLimit";
import {
	buildGymDnfFilters,
	buildPokestopDnfFilters,
	buildStationDnfFilters
} from "@/lib/server/queryMapObjects/fortDnf";
import type {
	FortCombinedScanBody,
	FortTypeScanGroup
} from "@/lib/server/queryMapObjects/queries";
import { getLogger } from "@/lib/utils/logger";
```

Replace the `fortApiRegistry` declaration with typed instances so the combined path can call `processScan` with the right record type:

```ts
const apiGymQuery = new ApiGymQuery();
const apiPokestopQuery = new ApiPokestopQuery();
const apiStationQuery = new ApiStationQuery();

// Used instead of the SQL classes while the Golbat fort API is detected (golbatFortApi.ts)
const fortApiRegistry: Partial<Record<MapObjectType, MapObjectQuery<any, any>>> = {
	[MapObjectType.GYM]: apiGymQuery,
	[MapObjectType.POKESTOP]: apiPokestopQuery,
	[MapObjectType.STATION]: apiStationQuery
};
```

Append at the end of the file:

```ts
const log = getLogger("query:forts");

export type FortType = MapObjectType.GYM | MapObjectType.POKESTOP | MapObjectType.STATION;
export const fortTypes: FortType[] = [MapObjectType.GYM, MapObjectType.POKESTOP, MapObjectType.STATION];

export type FortQueryEntry = {
	filter: AnyFilter | undefined;
	bounds: Bounds;
	polygon: PermittedPolygon;
	since?: number;
	limit: number;
	context?: FeaturePermissionContext;
};

/**
 * One Golbat scan for every requested fort type, then the same per-type post-processing the
 * single-type routes run. Per-type limit_reached falls back to SQL for that type only; a failed
 * scan or a disabled fort API runs the SQL classes in parallel.
 */
export async function queryFortsCombined(
	entries: Partial<Record<FortType, FortQueryEntry>>
): Promise<Partial<Record<FortType, MapObjectResponse<MapData>>>> {
	const results: Partial<Record<FortType, MapObjectResponse<MapData>>> = {};
	const viaSql = async (type: FortType) => {
		const e = entries[type]!;
		results[type] = await registry[type]!.getMultiple(
			e.bounds,
			e.filter,
			e.polygon,
			e.since,
			e.limit,
			e.context
		);
	};

	const requested = fortTypes.filter((type) => entries[type]);
	if (!isFortApiEnabled()) {
		await Promise.all(requested.map(viaSql));
		return results;
	}

	const groups: Partial<Record<FortType, FortTypeScanGroup>> = {};
	for (const type of requested) {
		const e = entries[type]!;
		if (e.filter !== undefined && !e.filter.enabled) {
			results[type] = { examined: 0, data: [] };
			continue;
		}
		const dnf =
			type === MapObjectType.GYM
				? buildGymDnfFilters(e.filter as FilterGym | undefined)
				: type === MapObjectType.POKESTOP
					? buildPokestopDnfFilters(e.filter as FilterPokestop | undefined)
					: buildStationDnfFilters(e.filter as FilterStation | undefined);
		if (dnf === null) {
			results[type] = { examined: 0, data: [] };
			continue;
		}
		groups[type] = {
			filters: dnf,
			limit: getFortApiScanLimit(Math.min(e.limit, requestLimits[type]) + 1)
		};
	}

	const scanTypes = requested.filter((type) => groups[type]);
	if (!scanTypes.length) return results;

	// Each type's polygon is applied per record in processScan; the scan just needs a bbox
	// covering every type's permitted bounds.
	const union = scanTypes.reduce(
		(acc, type) => {
			const b = entries[type]!.bounds;
			return {
				minLat: Math.min(acc.minLat, b.minLat),
				minLon: Math.min(acc.minLon, b.minLon),
				maxLat: Math.max(acc.maxLat, b.maxLat),
				maxLon: Math.max(acc.maxLon, b.maxLon)
			};
		},
		{ ...entries[scanTypes[0]]!.bounds }
	);

	const body: FortCombinedScanBody = {
		min: { latitude: union.minLat, longitude: union.minLon },
		max: { latitude: union.maxLat, longitude: union.maxLon },
		limit: scanTypes.reduce((sum, type) => sum + groups[type]!.limit, 0),
		with_incidents: Boolean(groups[MapObjectType.POKESTOP]),
		gyms: groups[MapObjectType.GYM],
		pokestops: groups[MapObjectType.POKESTOP],
		stations: groups[MapObjectType.STATION]
	};

	let scan;
	try {
		scan = await scanViaGrpcOrHttp("forts", body, grpcScanForts, scanForts);
	} catch (err) {
		log.debug("Combined fort scan failed, falling back to SQL: %s", err);
	}
	if (!scan) {
		await Promise.all(scanTypes.map(viaSql));
		return results;
	}

	await Promise.all(
		scanTypes.map(async (type) => {
			const e = entries[type]!;
			if (type === MapObjectType.GYM) {
				if (scan.gyms_stats.limit_reached) return viaSql(type);
				results[type] = apiGymQuery.finish(
					apiGymQuery.processScan(scan.gyms, scan.gyms_stats.examined, e.polygon, e.since),
					e.filter as FilterGym | undefined,
					e.polygon,
					e.context
				);
			} else if (type === MapObjectType.POKESTOP) {
				if (scan.pokestops_stats.limit_reached) return viaSql(type);
				results[type] = apiPokestopQuery.finish(
					apiPokestopQuery.processScan(
						scan.pokestops,
						scan.pokestops_stats.examined,
						e.polygon,
						e.since
					),
					e.filter as FilterPokestop | undefined,
					e.polygon,
					e.context
				);
			} else {
				if (scan.stations_stats.limit_reached) return viaSql(type);
				results[type] = apiStationQuery.finish(
					apiStationQuery.processScan(
						scan.stations,
						scan.stations_stats.examined,
						e.polygon,
						e.since
					),
					e.filter as FilterStation | undefined,
					e.polygon,
					e.context
				);
			}
		})
	);
	return results;
}
```

Note: `registry[type]!.getMultiple` is the SQL class regardless of fort API state; that is deliberate (limit fallback must not re-scan the API). If TypeScript complains that `scan` is possibly undefined inside the `map` callback, annotate `let scan: FortCombinedScanResponse | undefined;` and capture `const done = scan;` before the `Promise.all`.

Run: `pnpm test src/lib/server/queryMapObjects/queryFortsCombined.test.ts`
Expected: all pass (6 tests).

- [ ] **Step 3: Gates and commit**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/lib/server/queryMapObjects/queryMapObjects.ts src/lib/server/queryMapObjects/queryFortsCombined.test.ts`

```bash
git add src/lib/server/queryMapObjects/queryMapObjects.ts src/lib/server/queryMapObjects/queryFortsCombined.test.ts
git commit -m "feat: queryFortsCombined runs one golbat scan for gyms, pokestops and stations"
```

---

### Task 5: Shared request pipeline and the per-type route

**Files:**
- Create: `src/lib/server/api/mapObjectRequest.ts`
- Create: `src/lib/server/api/mapObjectRequest.test.ts`
- Modify: `src/routes/api/[queryMapObject=mapObject]/+server.ts`

**Interfaces:**
- Produces in `mapObjectRequest.ts`:
  ```ts
  export type TypeRequestData = { filter?: AnyFilter; filterHash?: string; since?: number };
  export function isValidBounds(data: unknown): data is Bounds
  export function requestSince(data: TypeRequestData): number | undefined   // finite number or undefined
  export async function admitType(type: MapObjectType, locals: App.Locals, rateLimitKey: string):
  	Promise<{ status: 401 } | { status: 429; headers: Record<string, string>; totalLimit: number } | { status: 200; requestLimit: number; totalLimit: number }>
  export async function refundDenied(type: MapObjectType, rateLimitKey: string, requestLimit: number): Promise<void>
  export async function resolveTypeRequest(type: MapObjectType, locals: App.Locals, rateLimitKey: string, requestLimit: number, bounds: Bounds, data: TypeRequestData):
  	Promise<{ status: 400 | 401 | 409 } | { status: 200; filter: AnyFilter | undefined; permitted: PermittedBounds; context: FeaturePermissionContext; filterCached?: "0" | "1" }>
  export async function settleTypeRequest(type: MapObjectType, rateLimitKey: string, requestLimit: number, since: number | undefined, result: MapObjectResponse<MapData>):
  	Promise<{ charge: number; remainingPoints: number }>
  ```
  `resolveTypeRequest` refunds via `refundDenied` before returning any non-200 status. `admitType` does not refund on 401 (nothing was consumed) nor on 429 (the limiter refused).

- [ ] **Step 1: Tests (RED)**

`mapObjectRequest.test.ts`:

```ts
import type { AnyFilter } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { rememberFilter } from "@/lib/server/api/filterCache";
import { getFilterHash } from "@/lib/utils/filterHash";
import { Features } from "@/lib/utils/features";
import { beforeEach, describe, expect, it, vi } from "vitest";

const limiter = vi.hoisted(() => ({
	consume: vi.fn(),
	reward: vi.fn(),
	penalty: vi.fn()
}));
vi.mock("@/lib/server/api/rateLimit", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/lib/server/api/rateLimit")>();
	return {
		...original,
		rateLimitConsume: limiter.consume,
		rateLimitReward: limiter.reward,
		rateLimit: limiter.penalty
	};
});
const auth = vi.hoisted(() => ({ allowed: true }));
vi.mock("@/lib/server/auth/checkIfAuthed", () => ({
	hasAnyFeatureAnywhereServer: () => auth.allowed
}));

import {
	admitType,
	isValidBounds,
	refundDenied,
	requestSince,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
import { requestLimits } from "@/lib/server/api/rateLimit";

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const locals = {
	user: { id: "u1" },
	perms: { everywhere: [Features.GYM, Features.RAID], areas: [] }
} as unknown as App.Locals;
const type = MapObjectType.GYM;
const limit = requestLimits[type];
const filter = { category: "gym", enabled: true } as unknown as AnyFilter;

beforeEach(() => {
	limiter.consume.mockReset().mockResolvedValue([true, 5, 10, { "X-RateLimit-Remaining": "5" }]);
	limiter.reward.mockReset().mockResolvedValue(7);
	limiter.penalty.mockReset().mockResolvedValue(3);
	auth.allowed = true;
});

describe("isValidBounds / requestSince", () => {
	it("accepts finite bounds and rejects anything else", () => {
		expect(isValidBounds(bounds)).toBe(true);
		expect(isValidBounds({ ...bounds, maxLon: "1" })).toBe(false);
		expect(isValidBounds([])).toBe(false);
		expect(isValidBounds(null)).toBe(false);
	});

	it("passes a finite since through and drops anything else", () => {
		expect(requestSince({ since: 100 })).toBe(100);
		expect(requestSince({ since: Number.NaN })).toBeUndefined();
		expect(requestSince({})).toBeUndefined();
	});
});

describe("admitType", () => {
	it("returns 401 without consuming when the family is not permitted", async () => {
		auth.allowed = false;
		expect(await admitType(type, locals, "u1")).toEqual({ status: 401 });
		expect(limiter.consume).not.toHaveBeenCalled();
	});

	it("returns 429 with the limiter headers when consume is refused", async () => {
		limiter.consume.mockResolvedValue([false, 0, 10, { "Retry-After": "3" }]);
		expect(await admitType(type, locals, "u1")).toEqual({
			status: 429,
			headers: { "Retry-After": "3" },
			totalLimit: 10
		});
	});

	it("consumes the type's request limit and returns it", async () => {
		expect(await admitType(type, locals, "u1")).toEqual({ status: 200, requestLimit: limit, totalLimit: 10 });
		expect(limiter.consume).toHaveBeenCalledWith("u1", limit, type);
	});
});

describe("refundDenied", () => {
	it("refunds all but the denied charge", async () => {
		await refundDenied(type, "u1", limit);
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - 100, type);
	});

	it("refunds nothing when the limit is below the denied charge", async () => {
		await refundDenied(type, "u1", 50);
		expect(limiter.reward).not.toHaveBeenCalled();
	});
});

describe("resolveTypeRequest", () => {
	it("returns the permitted bounds, context and filter for a plain request", async () => {
		const out = await resolveTypeRequest(type, locals, "u1", limit, bounds, { filter });
		expect(out.status).toBe(200);
		if (out.status !== 200) return;
		expect(out.filter).toBe(filter);
		expect(out.permitted).toEqual({ bounds, polygon: null });
		expect(out.filterCached).toBeUndefined();
		expect(limiter.reward).not.toHaveBeenCalled();
	});

	it("returns 401 and refunds when nothing in bounds is permitted", async () => {
		const noArea = { user: { id: "u1" }, perms: { everywhere: [], areas: [] } } as unknown as App.Locals;
		expect(await resolveTypeRequest(type, noArea, "u1", limit, bounds, {})).toEqual({ status: 401 });
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - 100, type);
	});

	it("returns 400 and refunds on a malformed filter hash", async () => {
		expect(await resolveTypeRequest(type, locals, "u1", limit, bounds, { filterHash: "nope" })).toEqual({
			status: 400
		});
		expect(limiter.reward).toHaveBeenCalledTimes(1);
	});

	it("remembers a filter sent with its hash and reports it cached", async () => {
		const hash = getFilterHash(filter)!;
		const out = await resolveTypeRequest(type, locals, "u1", limit, bounds, { filter, filterHash: hash });
		expect(out).toMatchObject({ status: 200, filter, filterCached: "1" });
	});

	it("reports a mismatched hash as not cached", async () => {
		const out = await resolveTypeRequest(type, locals, "u1", limit, bounds, {
			filter,
			filterHash: "a".repeat(64)
		});
		expect(out).toMatchObject({ status: 200, filterCached: "0" });
	});

	it("recalls a known hash and returns 409 with a refund for an unknown one", async () => {
		const known = { category: "gym", enabled: true, filters: [{ id: "k" }] } as unknown as AnyFilter;
		const hash = getFilterHash(known)!;
		rememberFilter(hash, known);
		const hit = await resolveTypeRequest(type, locals, "u1", limit, bounds, { filterHash: hash });
		expect(hit).toMatchObject({ status: 200, filter: known });

		const miss = await resolveTypeRequest(type, locals, "u1", limit, bounds, { filterHash: "b".repeat(64) });
		expect(miss).toEqual({ status: 409 });
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - 100, type);
	});
});

describe("settleTypeRequest", () => {
	it("rewards the unused part of the request limit", async () => {
		const out = await settleTypeRequest(type, "u1", limit, undefined, { examined: 10, data: [] });
		expect(out.charge).toBeGreaterThan(0);
		expect(out.charge).toBeLessThan(limit);
		expect(limiter.reward).toHaveBeenCalledWith("u1", limit - out.charge, type);
		expect(out.remainingPoints).toBe(7);
	});

	it("caps the charged amount at the type's hard limit", async () => {
		const capped = await settleTypeRequest(type, "u1", limit, undefined, { examined: limit * 10, data: [] });
		const atLimit = await settleTypeRequest(type, "u1", limit, undefined, { examined: limit, data: [] });
		expect(capped.charge).toBe(atLimit.charge);
	});
});
```

Run: `pnpm test src/lib/server/api/mapObjectRequest.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implementation (GREEN)**

`mapObjectRequest.ts`:

```ts
import type { AnyFilter } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MapData, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { recallFilter, rememberFilter } from "@/lib/server/api/filterCache";
import {
	calculateRequestCharge,
	rateLimit,
	rateLimitConsume,
	rateLimitReward,
	requestLimits
} from "@/lib/server/api/rateLimit";
import { hasAnyFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import {
	checkFeaturesInBounds,
	FeaturePermissionContext,
	type PermittedBounds
} from "@/lib/services/user/checkPerm";
import { featureFamily } from "@/lib/utils/features";
import { getFilterHash } from "@/lib/utils/filterHash";

// The per-type admission, filter resolution and settlement shared by the single-type route
// (/api/<type>) and the combined fort route (/api/forts). Statuses mirror the single-type route.

const FILTER_HASH_PATTERN = /^[0-9a-f]{64}$/;
const DENIED_CHARGE = 100;

export type TypeRequestData = { filter?: AnyFilter; filterHash?: string; since?: number };

export function isValidBounds(data: unknown): data is Bounds {
	if (!data || typeof data !== "object" || Array.isArray(data)) return false;
	const b = data as Record<string, unknown>;
	return (
		Number.isFinite(b.minLat) &&
		Number.isFinite(b.maxLat) &&
		Number.isFinite(b.minLon) &&
		Number.isFinite(b.maxLon)
	);
}

export function requestSince(data: TypeRequestData): number | undefined {
	return Number.isFinite(data.since) ? data.since : undefined;
}

export async function admitType(type: MapObjectType, locals: App.Locals, rateLimitKey: string) {
	if (!hasAnyFeatureAnywhereServer(locals.perms, featureFamily[type], locals.user)) {
		return { status: 401 } as const;
	}
	const requestLimit = requestLimits[type];
	const [allowed, , totalLimit, headers] = await rateLimitConsume(rateLimitKey, requestLimit, type);
	if (!allowed) return { status: 429, headers, totalLimit } as const;
	return { status: 200, requestLimit, totalLimit } as const;
}

export async function refundDenied(type: MapObjectType, rateLimitKey: string, requestLimit: number) {
	if (requestLimit > DENIED_CHARGE) {
		await rateLimitReward(rateLimitKey, requestLimit - DENIED_CHARGE, type);
	}
}

export async function resolveTypeRequest(
	type: MapObjectType,
	locals: App.Locals,
	rateLimitKey: string,
	requestLimit: number,
	bounds: Bounds,
	data: TypeRequestData
): Promise<
	| { status: 400 | 401 | 409 }
	| {
			status: 200;
			filter: AnyFilter | undefined;
			permitted: PermittedBounds;
			context: FeaturePermissionContext;
			filterCached?: "0" | "1";
	  }
> {
	const family = featureFamily[type];
	const permitted = checkFeaturesInBounds(locals.perms, family, bounds);
	if (!permitted) {
		await refundDenied(type, rateLimitKey, requestLimit);
		return { status: 401 };
	}

	const filterHash =
		typeof data.filterHash === "string" && FILTER_HASH_PATTERN.test(data.filterHash)
			? data.filterHash
			: undefined;
	if (data.filterHash !== undefined && !filterHash) {
		await refundDenied(type, rateLimitKey, requestLimit);
		return { status: 400 };
	}

	let filter = data.filter;
	let filterCached: "0" | "1" | undefined;
	if (filterHash) {
		if (filter) {
			filterCached =
				getFilterHash(filter) === filterHash && rememberFilter(filterHash, filter) ? "1" : "0";
		} else {
			filter = recallFilter(filterHash);
			if (!filter) {
				await refundDenied(type, rateLimitKey, requestLimit);
				return { status: 409 };
			}
		}
	}

	return {
		status: 200,
		filter,
		permitted,
		context: new FeaturePermissionContext(locals.perms, family),
		filterCached
	};
}

export async function settleTypeRequest(
	type: MapObjectType,
	rateLimitKey: string,
	requestLimit: number,
	since: number | undefined,
	result: MapObjectResponse<MapData>
) {
	const charge = calculateRequestCharge(
		since,
		result.data.length,
		Math.min(result.examined, requestLimits[type])
	);
	const refundPoints = requestLimit - charge;
	let remainingPoints = 1;
	if (refundPoints > 0) {
		remainingPoints = await rateLimitReward(rateLimitKey, refundPoints, type);
	} else if (refundPoints < 0) {
		remainingPoints = await rateLimit(rateLimitKey, -1 * refundPoints, type);
	}
	return { charge, remainingPoints };
}
```

Run: `pnpm test src/lib/server/api/mapObjectRequest.test.ts`
Expected: all pass.

- [ ] **Step 3: Route uses the pipeline (no behaviour change)**

Replace the `POST` handler in `src/routes/api/[queryMapObject=mapObject]/+server.ts` with:

```ts
export const POST: RequestHandler = async ({ request, locals, params, getClientAddress }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const type = params.queryMapObject as MapObjectType;

	const start = performance.now();
	const admitted = await admitType(type, locals, rateLimitKey);
	if (admitted.status === 401) error(401);
	const permCheckTime = performance.now();
	if (admitted.status === 429) {
		log.info(
			"[%s] User %s reached %d and was rate-limited",
			params.queryMapObject,
			locals.user?.id ?? "<ip>",
			admitted.totalLimit
		);
		return respond(
			request,
			{ data: [] },
			{ headers: admitted.headers, status: constants.HTTP_STATUS_TOO_MANY_REQUESTS }
		);
	}
	const { requestLimit, totalLimit } = admitted;

	let data: MapObjectRequestData;
	try {
		data = await readRequestBody(request);
	} catch {
		await refundDenied(type, rateLimitKey, requestLimit);
		error(400);
	}
	if (!isValidBounds(data)) {
		await refundDenied(type, rateLimitKey, requestLimit);
		error(400);
	}

	const resolved = await resolveTypeRequest(type, locals, rateLimitKey, requestLimit, data, data);
	if (resolved.status === 400) error(400);
	if (resolved.status === 401) {
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_UNAUTHORIZED });
	}
	if (resolved.status === 409) {
		return respond(request, { data: [] }, { status: constants.HTTP_STATUS_CONFLICT });
	}
	const extraHeaders = resolved.filterCached ? { "X-Filter-Cached": resolved.filterCached } : undefined;
	const since = requestSince(data);

	const result = await queryMapObjects(
		type,
		resolved.permitted.bounds,
		resolved.filter,
		resolved.permitted.polygon,
		since,
		requestLimit,
		resolved.context
	).catch(async (e) => {
		await rateLimitReward(rateLimitKey, requestLimit, type);
		throw e;
	});

	const { charge, remainingPoints } = await settleTypeRequest(
		type,
		rateLimitKey,
		requestLimit,
		since,
		result
	);

	const queryTime = performance.now();
	const response = respond(request, result, { headers: extraHeaders });
	const serializeTime = performance.now();

	log.info(
		"[%s] count: %d | rate limit: %d/%d (charged %d) | permcheck: %fms + query: %fms + serialize: %fms",
		params.queryMapObject,
		result.data.length,
		remainingPoints,
		totalLimit,
		charge,
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return response;
};
```

Update the imports: drop `getFilterHash`, `recallFilter`, `rememberFilter`, `calculateRequestCharge`, `rateLimit`, `rateLimitConsume`, `requestLimits`, `hasAnyFeatureAnywhereServer`, `checkFeaturesInBounds`, `FeaturePermissionContext`, `featureFamily`; keep `rateLimitReward`, `readRequestBody`, `respond`, `queryMapObjects`, `getLogger`, `error`, `constants`; add

```ts
import {
	admitType,
	isValidBounds,
	refundDenied,
	requestSince,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
```

Remove the now-unused `FILTER_HASH_PATTERN` and `DENIED_CHARGE` constants from the route. One deliberate difference from the old route: `since` is now `requestSince(data)` (a non-finite `since` is ignored instead of passed through); everything else is the same sequence with the same statuses and refunds.

- [ ] **Step 4: Gates and commit**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/lib/server/api/mapObjectRequest.ts src/lib/server/api/mapObjectRequest.test.ts "src/routes/api/[queryMapObject=mapObject]/+server.ts"`

```bash
git add src/lib/server/api/mapObjectRequest.ts src/lib/server/api/mapObjectRequest.test.ts "src/routes/api/[queryMapObject=mapObject]/+server.ts"
git commit -m "refactor: share the map object request pipeline between routes"
```

---

### Task 6: The combined route

**Files:**
- Create: `src/routes/api/forts/+server.ts`
- Modify: `src/lib/mapObjects/updateMapObject.ts` (types only: `FortsRequestData`, `FortsResponse` exported next to `MapObjectRequestData`, so client and server share them)

**Interfaces:**
- Consumes: Task 4 `queryFortsCombined`, `fortTypes`, `FortQueryEntry`; Task 5 pipeline.
- Produces (in `updateMapObject.ts`, type-only, isomorphic):
  ```ts
  export type FortsRequestData = Bounds & {
  	types: Partial<Record<FortType, { filter?: AnyFilter; filterHash?: string; since?: number }>>;
  };
  export type FortsTypeResponse = {
  	status: 200 | 401 | 409 | 429;
  	filterCached?: "0" | "1";
  	result?: MapObjectResponse<MapData>;
  };
  export type FortsResponse = Partial<Record<FortType, FortsTypeResponse>>;
  ```
  and the route `POST /api/forts` answering `FortsResponse` (HTTP 200) or 400 for a malformed body.

- [ ] **Step 1: Shared types**

In `updateMapObject.ts`, add `import type { FortType } from "@/lib/server/queryMapObjects/queryMapObjects";` (type-only, so the client bundle pulls nothing from the server module) and after `MapObjectRequestData`:

```ts
export type FortsRequestData = Bounds & {
	types: Partial<Record<FortType, { filter?: AnyFilter; filterHash?: string; since?: number }>>;
};

export type FortsTypeResponse = {
	status: 200 | 401 | 409 | 429;
	filterCached?: "0" | "1";
	result?: MapObjectResponse<MapData>;
};

export type FortsResponse = Partial<Record<FortType, FortsTypeResponse>>;
```

- [ ] **Step 2: Route**

`src/routes/api/forts/+server.ts`:

```ts
import type { FortsRequestData, FortsResponse } from "@/lib/mapObjects/updateMapObject";
import {
	admitType,
	isValidBounds,
	requestSince,
	resolveTypeRequest,
	settleTypeRequest
} from "@/lib/server/api/mapObjectRequest";
import { rateLimitReward } from "@/lib/server/api/rateLimit";
import { readRequestBody } from "@/lib/server/api/requestBody";
import { respond } from "@/lib/server/api/respond";
import {
	type FortQueryEntry,
	type FortType,
	fortTypes,
	queryFortsCombined
} from "@/lib/server/queryMapObjects/queryMapObjects";
import { getLogger } from "@/lib/utils/logger";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const log = getLogger("mapobjects");

// Gyms, pokéstops and stations in one request: each type is admitted, resolved, charged and
// answered exactly as /api/<type> would, around a single combined Golbat scan.
export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const rateLimitKey = locals.user?.id ?? getClientAddress();
	const start = performance.now();

	let data: FortsRequestData;
	try {
		data = await readRequestBody(request);
	} catch {
		error(400);
	}
	if (!isValidBounds(data) || !data.types || typeof data.types !== "object") error(400);
	const bounds = { minLat: data.minLat, minLon: data.minLon, maxLat: data.maxLat, maxLon: data.maxLon };

	const response: FortsResponse = {};
	const entries: Partial<Record<FortType, FortQueryEntry>> = {};
	const admitted: Partial<
		Record<FortType, { requestLimit: number; totalLimit: number; since?: number; filterCached?: "0" | "1" }>
	> = {};

	for (const type of fortTypes) {
		const typeData = data.types[type];
		if (!typeData || typeof typeData !== "object") continue;

		const admit = await admitType(type, locals, rateLimitKey);
		if (admit.status !== 200) {
			response[type] = { status: admit.status };
			continue;
		}
		const resolved = await resolveTypeRequest(
			type,
			locals,
			rateLimitKey,
			admit.requestLimit,
			bounds,
			typeData
		);
		if (resolved.status !== 200) {
			response[type] = { status: resolved.status === 400 ? 409 : resolved.status };
			continue;
		}
		const since = requestSince(typeData);
		entries[type] = {
			filter: resolved.filter,
			bounds: resolved.permitted.bounds,
			polygon: resolved.permitted.polygon,
			since,
			limit: admit.requestLimit,
			context: resolved.context
		};
		admitted[type] = {
			requestLimit: admit.requestLimit,
			totalLimit: admit.totalLimit,
			since,
			filterCached: resolved.filterCached
		};
	}
	const permCheckTime = performance.now();

	const queried = fortTypes.filter((type) => entries[type]);
	const results = await queryFortsCombined(entries).catch(async (e) => {
		await Promise.all(
			queried.map((type) => rateLimitReward(rateLimitKey, admitted[type]!.requestLimit, type))
		);
		throw e;
	});

	const summary: string[] = [];
	for (const type of queried) {
		const result = results[type] ?? { examined: 0, data: [] };
		const a = admitted[type]!;
		const { charge, remainingPoints } = await settleTypeRequest(
			type,
			rateLimitKey,
			a.requestLimit,
			a.since,
			result
		);
		response[type] = { status: 200, filterCached: a.filterCached, result };
		summary.push(`${type}: ${result.data.length} (charged ${charge}, ${remainingPoints}/${a.totalLimit})`);
	}

	const queryTime = performance.now();
	const httpResponse = respond(request, response);
	const serializeTime = performance.now();

	log.info(
		"[forts] %s | permcheck: %fms + query: %fms + serialize: %fms",
		summary.join(" | ") || "nothing admitted",
		(permCheckTime - start).toFixed(1),
		(queryTime - permCheckTime).toFixed(1),
		(serializeTime - queryTime).toFixed(1)
	);

	return httpResponse;
};
```

A per-type 400 (malformed filter hash) is reported as 409 so the client re-sends that type's filter through the single-type path, which then answers 400 itself if the hash is still malformed. The whole request only 400s when the body or bounds are unusable.

- [ ] **Step 3: Gates and commit**

The route has no unit test (SvelteKit handlers are exercised manually; the pipeline and the query are covered by Tasks 4 and 5). Verify it type-checks and formats:

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/routes/api/forts/+server.ts src/lib/mapObjects/updateMapObject.ts`

```bash
git add src/routes/api/forts/+server.ts src/lib/mapObjects/updateMapObject.ts
git commit -m "feat: POST /api/forts serves gyms, pokestops and stations from one scan"
```

---

### Task 7: Client: one request for the fort types

**Files:**
- Modify: `src/lib/mapObjects/updateMapObject.ts`
- Create: `src/lib/mapObjects/updateMapObject.test.ts`

**Interfaces:**
- Consumes: `FortsRequestData`, `FortsResponse` (Task 6), `fortTypes`/`FortType` (type-only import allowed; for the runtime list the client defines its own constant, see below, to avoid importing a server module).
- Produces (exported for tests):
  ```ts
  export const clientFortTypes: MapObjectType[]   // [GYM, POKESTOP, STATION]
  export type MapObjectPlan = { type: MapObjectType; filter: AnyFilter; since?: number; isDelta: boolean; limitInfo?: DataLimitInfo; removeOld: boolean };
  export function planMapObjectRequest(type, removeOld?, filterOverwrite?, onlyChanged?, signal?): MapObjectPlan | undefined
  export function applyMapObjectResponse(plan: MapObjectPlan, response: MapObjectResponse<MapData> | undefined, signal?: AbortSignal): MapObjectType | undefined
  export async function fetchForts(plans: MapObjectPlan[], bounds: Bounds, signal?: AbortSignal): Promise<Map<MapObjectType, MapObjectResponse<MapData> | undefined>>
  ```
  `updateMapObject` and `updateAllMapObjects` keep their signatures.

- [ ] **Step 1: Test (RED)**

`updateMapObject.test.ts`:

```ts
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { encode } from "@msgpack/msgpack";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/activeSearch.svelte.js", () => ({ getActiveSearch: () => undefined }));
vi.mock("@/lib/map/featuresGen.svelte", () => ({ updateFeatures: vi.fn() }));
vi.mock("@/lib/map/map.svelte", () => ({ getMap: () => ({ getZoom: () => 15 }) }));
vi.mock("@/lib/mapObjects/dataLimitState.svelte", () => ({
	clearAllDataLimits: vi.fn(),
	clearDataLimit: vi.fn(),
	getDataLimit: () => undefined,
	setDataLimit: vi.fn()
}));
const state = vi.hoisted(() => ({ replace: vi.fn(), add: vi.fn() }));
vi.mock("@/lib/mapObjects/mapObjectsState.svelte.js", () => ({
	addMapObjects: state.add,
	clearAllMapObjects: vi.fn(),
	clearMapObjects: vi.fn(),
	getMapObjects: () => ({}),
	replaceMapObjects: state.replace
}));
vi.mock("@/lib/mapObjects/s2cells.js", () => ({ getS2CellMapObjects: () => [] }));
vi.mock("@/lib/mapObjects/weather.svelte", () => ({ updateWeather: vi.fn() }));
vi.mock("@/lib/mapObjects/currentSelectedState.svelte", () => ({ getCurrentSelectedData: () => undefined }));
vi.mock("@/lib/services/user/checkPerm", () => ({ hasAnyFeatureAnywhere: () => true }));
vi.mock("@/lib/services/user/userDetails.svelte", () => ({ getUserDetails: () => ({ permissions: {} }) }));
vi.mock("@/lib/services/userSettings.svelte.js", () => ({
	getUserSettings: () => ({
		filters: {
			gym: { enabled: true, category: "gym" },
			pokestop: { enabled: true, category: "pokestop" },
			station: { enabled: false, category: "station" }
		}
	})
}));
vi.mock("@/lib/services/config/config", () => ({ getConfig: () => ({ general: { msgpack: false } }) }));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => false }));

import { applyMapObjectResponse, fetchForts, planMapObjectRequest } from "@/lib/mapObjects/updateMapObject";

const bounds = { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 };
const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);
	state.replace.mockReset();
	state.add.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("planMapObjectRequest", () => {
	it("plans enabled types and skips disabled ones", () => {
		expect(planMapObjectRequest(MapObjectType.GYM)).toMatchObject({
			type: MapObjectType.GYM,
			isDelta: false,
			removeOld: true
		});
		expect(planMapObjectRequest(MapObjectType.STATION)).toBeUndefined();
	});
});

describe("fetchForts", () => {
	it("posts one request carrying each planned type and applies the per-type results", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				gym: { status: 200, filterCached: "1", result: { examined: 2, data: [{ id: "g" }] } },
				pokestop: { status: 200, result: { examined: 1, data: [] } }
			})
		);
		const plans = [planMapObjectRequest(MapObjectType.GYM)!, planMapObjectRequest(MapObjectType.POKESTOP)!];

		const results = await fetchForts(plans, bounds);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/forts");
		const body = JSON.parse(init.body as string);
		expect(body).toMatchObject({ ...bounds });
		expect(Object.keys(body.types).sort()).toEqual(["gym", "pokestop"]);
		expect(body.types.gym.filter).toEqual({ enabled: true, category: "gym" });
		expect(typeof body.types.gym.filterHash).toBe("string");

		expect(results.get(MapObjectType.GYM)).toEqual({ examined: 2, data: [{ id: "g" }] });
		expect(results.get(MapObjectType.POKESTOP)).toEqual({ examined: 1, data: [] });

		for (const plan of plans) applyMapObjectResponse(plan, results.get(plan.type));
		expect(state.replace).toHaveBeenCalledWith([{ id: "g" }], MapObjectType.GYM, 2);
		expect(state.replace).toHaveBeenCalledWith([], MapObjectType.POKESTOP, 1);
	});

	it("omits a filter whose hash the server already knows, and re-sends it after a 409", async () => {
		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({ gym: { status: 200, filterCached: "1", result: { examined: 0, data: [] } } })
			)
			.mockResolvedValueOnce(jsonResponse({ gym: { status: 409 } }))
			.mockResolvedValueOnce(jsonResponse({ examined: 5, data: [] }));

		const plan = planMapObjectRequest(MapObjectType.GYM)!;
		await fetchForts([plan], bounds);
		const second = await fetchForts([plan], bounds);

		const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
		expect(secondBody.types.gym.filter).toBeUndefined();
		expect(typeof secondBody.types.gym.filterHash).toBe("string");

		// 409 → retried alone through /api/gym with the filter attached
		expect(fetchMock.mock.calls[2][0]).toBe("/api/gym");
		const retryBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
		expect(retryBody.filter).toEqual({ enabled: true, category: "gym" });
		expect(second.get(MapObjectType.GYM)).toEqual({ examined: 5, data: [] });
	});

	it("yields undefined for a type the server refused, without throwing", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ gym: { status: 429 } }));
		const results = await fetchForts([planMapObjectRequest(MapObjectType.GYM)!], bounds);
		expect(results.get(MapObjectType.GYM)).toBeUndefined();
	});

	it("marks every type limit-reached data as empty with a data limit", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ gym: { status: 200, result: { examined: 9, data: [], limitReached: true } } })
		);
		const plan = planMapObjectRequest(MapObjectType.GYM)!;
		const results = await fetchForts([plan], bounds);
		applyMapObjectResponse(plan, results.get(MapObjectType.GYM));
		expect(state.replace).toHaveBeenCalledWith([], MapObjectType.GYM, 9);
	});
});
```

Run: `pnpm test src/lib/mapObjects/updateMapObject.test.ts`
Expected: FAIL, the three functions are not exported.

- [ ] **Step 2: Implementation (GREEN)**

In `updateMapObject.ts`:

1. Add `import type { DataLimitInfo } from "@/lib/mapObjects/dataLimitState.svelte";` and export the plan type and the client-side fort list after `FortsResponse`:

```ts
export type MapObjectPlan = {
	type: MapObjectType;
	filter: AnyFilter;
	since?: number;
	isDelta: boolean;
	limitInfo?: DataLimitInfo;
	removeOld: boolean;
};

// The types /api/forts serves together. Kept here (not imported from the server module) so
// the client bundle stays free of server code.
export const clientFortTypes: MapObjectType[] = [
	MapObjectType.GYM,
	MapObjectType.POKESTOP,
	MapObjectType.STATION
];
```

2. Pull the filter-hash bookkeeping out of `fetchMapObjects` into two helpers placed above it (both used by `fetchMapObjects` and `fetchForts`):

```ts
function filterHashToSend(filter: AnyFilter | undefined) {
	const hash = getFilterHash(filter);
	const filterHash = hash !== undefined && uncacheableFilterHashes.has(hash) ? undefined : hash;
	const sendFilter = hash === undefined || !knownFilterHashes.has(hash);
	return { hash, filterHash, sendFilter };
}

function noteFilterCached(hash: string | undefined, cached: string | null | undefined) {
	if (hash === undefined) return;
	if (cached === "1") {
		knownFilterHashes.add(hash);
	} else if (cached === "0") {
		uncacheableFilterHashes.add(hash);
		knownFilterHashes.delete(hash);
	}
}
```

and rewrite the top of `fetchMapObjects` to use them (behaviour unchanged):

```ts
	const { hash, filterHash, sendFilter } = filterHashToSend(filter);

	function post(withFilter: boolean): Promise<Response> {
		...as before...
	}

	try {
		let response = await post(sendFilter);
		if (response.status === STATUS_FILTER_UNKNOWN && hash !== undefined && !sendFilter) {
			knownFilterHashes.delete(hash);
			await response.body?.cancel();
			response = await post(true);
		}

		noteFilterCached(hash, response.headers.get("X-Filter-Cached"));
		...rest as before...
```

3. Add `fetchForts` after `fetchMapObjects`:

```ts
export async function fetchForts(
	plans: MapObjectPlan[],
	bounds: Bounds,
	signal?: AbortSignal
): Promise<Map<MapObjectType, MapObjectResponse<MapData> | undefined>> {
	const results = new Map<MapObjectType, MapObjectResponse<MapData> | undefined>();
	const hashes = new Map<MapObjectType, string | undefined>();
	const body: FortsRequestData = { ...bounds, types: {} };
	for (const plan of plans) {
		const { hash, filterHash, sendFilter } = filterHashToSend(plan.filter);
		hashes.set(plan.type, hash);
		body.types[plan.type as FortType] = {
			filter: sendFilter ? plan.filter : undefined,
			filterHash,
			since: plan.since
		};
	}

	let parsed: FortsResponse | undefined;
	try {
		const encoded = encodeRequestBody(body);
		const response = await fetch("/api/forts", {
			method: "POST",
			body: encoded.body,
			headers: getHeaders(encoded.contentType),
			signal
		});
		if (response.ok) {
			parsed = await parseResponse<FortsResponse>(response);
		} else {
			console.error(`Error while fetching forts: ${response.status}`);
		}
	} catch (e) {
		if (!(e instanceof DOMException && e.name === "AbortError")) {
			console.error("Error while fetching forts", e);
		}
	}
	if (!parsed) return results;

	for (const plan of plans) {
		const typeResponse = parsed[plan.type as FortType];
		const hash = hashes.get(plan.type);
		if (typeResponse?.status === 200) {
			noteFilterCached(hash, typeResponse.filterCached);
			results.set(plan.type, typeResponse.result);
		} else if (typeResponse?.status === STATUS_FILTER_UNKNOWN) {
			// the server lost this filter; the single-type path re-sends it
			if (hash !== undefined) knownFilterHashes.delete(hash);
			results.set(plan.type, await fetchMapObjects(plan.type, bounds, plan.filter, signal, plan.since));
		} else {
			console.error(`Error while fetching ${plan.type}: ${typeResponse?.status ?? "missing"}`);
			results.set(plan.type, undefined);
		}
	}
	return results;
}
```

4. Split `updateMapObject`. Replace it with:

```ts
export function planMapObjectRequest(
	type: MapObjectType,
	removeOld: boolean = true,
	filterOverwrite: AnyFilter | undefined = undefined,
	onlyChanged: boolean = false,
	signal?: AbortSignal
): MapObjectPlan | undefined {
	if (!hasAnyFeatureAnywhere(getUserDetails().permissions, featureFamily[type])) return;

	let filter: AnyFilter | undefined = undefined;

	if (filterOverwrite) {
		filter = filterOverwrite;
	} else {
		...the existing type → getUserSettings().filters.<x> chain, unchanged...
	}

	if (!filter || !filter.enabled) {
		const selected = getCurrentSelectedData();
		const preserveRoutesForFortPopup =
			type === MapObjectType.ROUTE &&
			(selected?.type === MapObjectType.POKESTOP || selected?.type === MapObjectType.GYM);
		if (preserveRoutesForFortPopup) return;

		clearMapObjects(type);
		clearDataLimit(type);
		if (!signal) updateFeatures(getMapObjects());
		return;
	}

	const limitInfo = getDataLimit(type);
	if (limitInfo) {
		// don't refetch a limited type until the map was zoomed in or its filters changed
		const zoomedIn = (getMap()?.getZoom() ?? 0) > limitInfo.zoom + 0.01;
		const filterChanged = JSON.stringify(filter) !== limitInfo.filterJson;
		if (!zoomedIn && !filterChanged) return;
	}

	const since = onlyChanged ? lastQueryTimestamps.get(type) : undefined;
	const isDelta = onlyChanged && since !== undefined;
	lastQueryTimestamps.set(type, currentTimestamp());

	return { type, filter, since, isDelta, limitInfo, removeOld };
}

export function applyMapObjectResponse(
	plan: MapObjectPlan,
	response: MapObjectResponse<MapData> | undefined,
	signal?: AbortSignal
): MapObjectType | undefined {
	const { type, filter, isDelta, limitInfo, removeOld } = plan;
	if (signal?.aborted) return;

	let examined = 0;
	let data: MapData[] | undefined = undefined;
	let clearLimitAfterRender = false;
	if (response) {
		if (response.limitReached) {
			setDataLimit(type, {
				zoom: getMap()?.getZoom() ?? 0,
				filterJson: JSON.stringify(filter)
			});
			data = [];
		} else {
			data = response.data;
			clearLimitAfterRender = Boolean(limitInfo);
		}
		examined = response.examined;
	}

	if (!data) {
		if (!signal) updateFeatures(getMapObjects());
		return;
	}

	try {
		if (removeOld && !isDelta) {
			replaceMapObjects(data, type, examined);
		} else {
			addMapObjects(data, type, examined, isDelta);
		}
	} catch (e) {
		clearLimitAfterRender = false;
		console.log(data);
		console.error(e);
	}

	if (!signal) {
		updateFeatures(getMapObjects());
		if (clearLimitAfterRender) clearDataLimit(type);
	}

	return clearLimitAfterRender ? type : undefined;
}

// Plan → single-type fetch → apply. S2 cells are computed locally instead of fetched.
async function runPlan(plan: MapObjectPlan, signal?: AbortSignal) {
	if (plan.type === MapObjectType.S2_CELL) {
		const data = getS2CellMapObjects(getBounds(), plan.filter as FilterS2Cell);
		return applyMapObjectResponse(plan, { data, examined: data.length }, signal);
	}
	const response = await fetchMapObjects(plan.type, getBounds(), plan.filter, signal, plan.since);
	return applyMapObjectResponse(plan, response, signal);
}

export async function updateMapObject(
	type: MapObjectType,
	removeOld: boolean = true,
	filterOverwrite: AnyFilter | undefined = undefined,
	signal?: AbortSignal,
	onlyChanged: boolean = false
) {
	const plan = planMapObjectRequest(type, removeOld, filterOverwrite, onlyChanged, signal);
	if (!plan) return;
	return runPlan(plan, signal);
}
```

5. In `updateAllMapObjects`, replace the non-search branch with:

```ts
	} else {
		const otherTypes = allMapObjectTypes.filter((type) => !clientFortTypes.includes(type));
		const fortPlans = clientFortTypes
			.map((type) => planMapObjectRequest(type, removeOld, undefined, onlyChanged, controller.signal))
			.filter((plan): plan is MapObjectPlan => plan !== undefined);

		const updateForts = async () => {
			if (fortPlans.length < 2) {
				return Promise.all(fortPlans.map((plan) => runPlan(plan, controller.signal)));
			}
			const responses = await fetchForts(fortPlans, getBounds(), controller.signal);
			return fortPlans.map((plan) =>
				applyMapObjectResponse(plan, responses.get(plan.type), controller.signal)
			);
		};

		const [otherResults, fortResults] = await Promise.all([
			Promise.all(
				otherTypes.map((type) =>
					updateMapObject(type, removeOld, undefined, controller.signal, onlyChanged)
				)
			),
			updateForts(),
			updateWeather()
		]);
		limitsToClear = [...otherResults, ...fortResults].filter((type) => type !== undefined);
	}
```

Run: `pnpm test src/lib/mapObjects/updateMapObject.test.ts`
Expected: all pass (5 tests).

- [ ] **Step 3: Gates and commit**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|src/lib/mapObjects|src/lib/utils/requests|src/routes/api|proto)/'; pnpm exec prettier --check src/lib/mapObjects/updateMapObject.ts src/lib/mapObjects/updateMapObject.test.ts`

```bash
git add src/lib/mapObjects/updateMapObject.ts src/lib/mapObjects/updateMapObject.test.ts
git commit -m "feat: fetch gyms, pokestops and stations with one /api/forts request"
```

---

### Task 8: Docs and manual verification

**Files:**
- Modify: `CLAUDE.md` (Data Flow item 3)

- [ ] **Step 1: CLAUDE.md**

Replace Data Flow item 3 with:

```markdown
3. Map queries: client POSTs bounds + filters to `/api/[mapObject]` (or, for gyms/pokéstops/stations together, `/api/forts`) → server queries Golbat (fort API over gRPC/HTTP, or SQL) with permission checks → returns filtered data. The per-type admit/resolve/settle pipeline lives in `src/lib/server/api/mapObjectRequest.ts`.
```

```bash
git add CLAUDE.md
git commit -m "docs: note the combined fort route in the data flow"
```

- [ ] **Step 2: Manual verification against Golbat b24956a**

1. Pull, `pnpm install`, `pnpm run build`, restart; keep `grpc` set and log level `debug`.
2. Pan the same viewport as the earlier measurements. Expect one `[golbat:grpc] [ScanForts] Request took …` line and one `[forts] gym: N | pokestop: N | station: N …` line per pan, instead of three fort lines; `[pokemon]` unchanged.
3. Confirm the station count in the `[forts]` line is small and equals what renders; the previous behaviour returned ~100 and rendered 0.
4. Toggle a raid filter and a quest filter: the `[forts]` line reflects the new filter and the map matches the SQL path (`fortApi = false`).
5. Zoom far out until the gym data limit trips: only gyms show the limit toast; pokéstops and stations still render.
6. Comment out `grpc` (HTTP combined) and set `fortApi = false` (three SQL queries) and confirm the map is identical.
7. Record the per-pan timings in PR #175 next to the earlier table.

---

## Self-review

**Spec coverage:** §2 proto/types → Task 1, 2. §3 station DNF → Task 1. §4 server route, shared pipeline, combined scan, per-type limit fallback, union bounds, `with_incidents`, SQL fallback, logging → Tasks 4, 5, 6. §5 client plan/apply split, `fetchForts`, 409 retry, partition (≥2 fort plans), search mode untouched → Task 7. §6 error table → Tasks 4 (scan failure, limit), 6 (per-type statuses, 400), 7 (client handling). §7 tests → each task; manual → Task 8. §8 files → file map.

**Type consistency:** `FortType`/`fortTypes`/`FortQueryEntry` defined in Task 4, consumed in Task 6 and (type-only) Task 7. `FortsRequestData`/`FortsResponse` defined in Task 6 (in `updateMapObject.ts`), used by the route and Task 7. `finish`/`processScan` defined in Task 3, used in Task 4. `admitType`/`resolveTypeRequest`/`refundDenied`/`settleTypeRequest`/`isValidBounds`/`requestSince` defined in Task 5, used in Tasks 5 and 6. `FortCombinedScanBody`/`FortCombinedScanResponse`/`scanForts` from Task 1, `grpcScanForts` from Task 2, used in Task 4. `MapObjectPlan`, `planMapObjectRequest`, `applyMapObjectResponse`, `fetchForts`, `clientFortTypes` defined and used within Task 7.
