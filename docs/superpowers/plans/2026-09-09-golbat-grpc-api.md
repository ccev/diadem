# Golbat gRPC Map Scans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve gym, pokestop, station and pokemon map scans from Golbat's `GolbatApi` gRPC service when `server.golbat.grpc` is configured, falling back to the existing HTTP path (and SQL for forts) on any error.

**Architecture:** A ts-proto generated grpc-js client (`src/lib/server/api/grpc/golbat_api.ts`) is wrapped by `golbatGrpc.ts`, which exposes four promise-returning scan functions that accept and return exactly the types the HTTP functions in `golbatApi.ts` use. Pure request/response mapping lives in `golbatGrpcMapping.ts`. Each query class gains one "try gRPC first" step in front of its existing HTTP call.

**Tech Stack:** SvelteKit server code (TypeScript strict), `@grpc/grpc-js`, `@bufbuild/protobuf` (wire reader used by generated code), `ts-proto` + `@bufbuild/buf` for codegen, vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-golbat-grpc-api-design.md`. Read it before starting.

## Global Constraints

- Package manager is pnpm 9.15.9. If `pnpm` is not on PATH use `corepack pnpm`.
- Node 22+. Tests run with `pnpm test` (vitest, node environment, `@` alias to `src`).
- `pnpm test`, `pnpm run check` (svelte-check) and `pnpm run lint` (prettier) must pass at the end of every task.
- Formatting: tabs, double quotes, prettier config in repo. Run `pnpm run format` before committing if unsure.
- ts-proto options are fixed by the spec: `forceLong=number`, `useOptionals=all`, `snakeToCamel=false`, `useJsTypeOverride=true`, `outputServices=grpc-js`, `esModuleInterop=true`.
- The generated file `src/lib/server/api/grpc/golbat_api.ts` is never hand-edited.
- Logger API is `getLogger(name)` returning `{ debug, info, warning, error }`. There is no `warn`.
- `golbatGrpcMapping.ts` must not import `@/lib/utils/pokemonUtils` at runtime (it drags in Svelte-only state and breaks vitest). Use `import type` only.
- Commit messages: conventional prefix (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), end with the attribution trailer given in the session.
- Do not touch files unrelated to the task.

---

## File map

| File | Responsibility |
|---|---|
| `proto/golbat_api.proto` | Verbatim copy of Golbat `grpc/api.proto` at commit `8f10ee9`, plus a two-line provenance header |
| `buf.gen.yaml` | ts-proto generation config |
| `package.json` | new deps and the `grpc:generate` script |
| `.prettierignore` | excludes the generated directory |
| `src/lib/server/api/grpc/golbat_api.ts` | generated client, service definition, message codecs |
| `src/lib/server/api/grpc/generated.test.ts` | smoke test that the generated codecs behave as the spec assumes |
| `src/lib/services/config/configTypes.d.ts` | `golbat.grpc?: string` |
| `src/lib/server/queryMapObjects/queries.d.ts` | `PokemonScanBody` type |
| `src/lib/server/api/golbatApi.ts` | result types gain raw-string fields; `getMultiplePokemon` typed |
| `src/lib/server/api/golbatGrpcMapping.ts` | pure request/response mapping + `describeGrpcError` |
| `src/lib/server/api/golbatGrpcMapping.test.ts` | mapping unit tests |
| `src/lib/server/api/golbatGrpc.ts` | channel, metadata, deadline, timing log, four scan functions |
| `src/lib/server/api/golbatGrpc.test.ts` | in-process grpc-js server wire test |
| `src/lib/server/queryMapObjects/queryPokestopApi.ts` | HTTP JSON fix + gRPC-first step |
| `src/lib/server/queryMapObjects/queryPokestopApi.test.ts` | HTTP JSON fix test |
| `src/lib/server/queryMapObjects/queryGymApi.ts` | gRPC-first step |
| `src/lib/server/queryMapObjects/queryStationApi.ts` | gRPC-first step |
| `src/lib/server/queryMapObjects/queryPokemon.ts` | gRPC-first step |
| `config/config.example.toml`, `docs/src/content/docs/reference/configuration.md`, `CLAUDE.md` | documentation |

---

### Task 1: Codegen toolchain, generated client, config type

**Files:**
- Create: `proto/golbat_api.proto`
- Create: `buf.gen.yaml`
- Modify: `package.json` (dependencies, devDependencies, scripts)
- Modify: `.prettierignore`
- Create (generated): `src/lib/server/api/grpc/golbat_api.ts`
- Create: `src/lib/server/api/grpc/generated.test.ts`
- Modify: `src/lib/services/config/configTypes.d.ts:140-145`

**Interfaces:**
- Produces: module `@/lib/server/api/grpc/golbat_api` exporting, among others, `GolbatApiClient` (class: `new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>)`), `GolbatApiService` (service definition for `server.addService`), `GolbatApiServer` (server implementation interface), and message interfaces + codecs `LatLon`, `IntRange`, `DnfId`, `FortDnfFilter`, `FortScanRequest`, `PokemonDnfFilter`, `PokemonScanRequest`, `PokemonScanResponse`, `Pokemon`, `PvpRankings`, `PvpEntry`, `Gym`, `GymScanResponse`, `Pokestop`, `PokestopScanResponse`, `Incident`, `Station`, `StationScanResponse`. Every message field is optional (`?: T | undefined`), snake_case, int64 as `number`, and the eight `jstype` fields as `string`.
- Produces: `ServerConfig.golbat.grpc?: string`.

- [ ] **Step 1: Copy the proto from Golbat 8f10ee9 with a provenance header**

Fetch the file (no local Golbat checkout is required):

```bash
mkdir -p proto
curl -fsSL https://raw.githubusercontent.com/UnownHash/Golbat/8f10ee9/grpc/api.proto -o proto/golbat_api.proto
```

Then prepend these two lines (they go above `syntax = "proto3";`):

```proto
// Copied verbatim from UnownHash/Golbat grpc/api.proto at commit 8f10ee9 (branch feat/grpc-api).
// Do not edit. Re-copy when Golbat changes it, then run `pnpm run grpc:generate` and commit both.
```

Verify the copy is the annotated version:

```bash
grep -c "jstype = JS_STRING" proto/golbat_api.proto
```

Expected: `8`.

- [ ] **Step 2: Add dependencies and the generate script**

```bash
pnpm add @grpc/grpc-js@^1.14.4 @bufbuild/protobuf@^2.14.1
pnpm add -D ts-proto@^2.12.3 @bufbuild/buf@^1.72.0
```

If pnpm reports `Ignored build scripts: @bufbuild/buf`, add `"@bufbuild/buf"` to the `pnpm.onlyBuiltDependencies` array in `package.json` and run `pnpm install` again.

Add to `"scripts"` in `package.json`, after `"db:studio"`:

```json
"grpc:generate": "buf generate",
```

- [ ] **Step 3: Write `buf.gen.yaml`**

```yaml
version: v2
inputs:
  - directory: proto
plugins:
  - local: node_modules/.bin/protoc-gen-ts_proto
    out: src/lib/server/api/grpc
    opt:
      - forceLong=number
      - useOptionals=all
      - snakeToCamel=false
      - useJsTypeOverride=true
      - outputServices=grpc-js
      - esModuleInterop=true
```

- [ ] **Step 4: Generate and exclude from prettier**

```bash
pnpm run grpc:generate
ls src/lib/server/api/grpc/
```

Expected: `golbat_api.ts`.

Append to `.prettierignore` under the `# Generated` heading (next to `src/lib/paraglide`):

```
src/lib/server/api/grpc
```

Sanity-check the generated file:

```bash
grep -n "^import" src/lib/server/api/grpc/golbat_api.ts
grep -n "  spawn_id?: string" src/lib/server/api/grpc/golbat_api.ts
grep -n "export const GolbatApiClient" src/lib/server/api/grpc/golbat_api.ts
```

Expected: imports from `@bufbuild/protobuf/wire` and `@grpc/grpc-js`; `spawn_id?: string | undefined;` present; `GolbatApiClient` exported.

- [ ] **Step 5: Write the smoke test**

`src/lib/server/api/grpc/generated.test.ts`:

```ts
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
```

- [ ] **Step 6: Run the smoke test**

Run: `pnpm test src/lib/server/api/grpc/generated.test.ts`
Expected: 2 passed.

- [ ] **Step 7: Add the config type**

In `src/lib/services/config/configTypes.d.ts`, change the `golbat` block of `ServerConfig` to:

```ts
	golbat: {
		url: string;
		auth?: string;
		secret?: string;
		defaultNestName?: string;
		/** Golbat gRPC target ("host:port"). When set, map scans use gRPC with HTTP fallback. */
		grpc?: string;
	};
```

- [ ] **Step 8: Type-check and lint**

Run: `pnpm run check && pnpm run lint`
Expected: both pass. If `check` reports errors inside `golbat_api.ts` about `Buffer`, confirm `@types/node` is installed (it is, `^18`) and that `tsconfig.json` extends `.svelte-kit/tsconfig.json`; re-run `pnpm run check` (it runs `svelte-kit sync` first).

- [ ] **Step 9: Commit**

```bash
git add proto/golbat_api.proto buf.gen.yaml package.json pnpm-lock.yaml .prettierignore src/lib/server/api/grpc/ src/lib/services/config/configTypes.d.ts
git commit -m "chore: generate golbat grpc client with ts-proto"
```

---

### Task 2: Types and pure mapping module

**Files:**
- Modify: `src/lib/server/queryMapObjects/queries.d.ts` (append)
- Modify: `src/lib/server/api/golbatApi.ts:20-44` (result types) and `:120-122` (`getMultiplePokemon`)
- Create: `src/lib/server/api/golbatGrpcMapping.ts`
- Create: `src/lib/server/api/golbatGrpcMapping.test.ts`

**Interfaces:**
- Consumes: generated module from Task 1.
- Produces in `queries.d.ts`:
  ```ts
  export type PokemonScanBody = {
  	min: { latitude: number; longitude: number };
  	max: { latitude: number; longitude: number };
  	limit: number;
  	filters: GolbatPokemonQuery[];
  };
  ```
- Produces in `golbatApi.ts`: `GolbatGymResult` gains `defenders_raw?: string; raw_rsvps?: string`; `GolbatPokestopResult` declares `quest_rewards`, `alternative_quest_rewards`, `showcase_focus`, `showcase_rankings` as `string | object | null | undefined`; `getMultiplePokemon(body: PokemonScanBody)`.
- Produces in `golbatGrpcMapping.ts`:
  ```ts
  export function toFortScanRequest(body: FortScanBody): FortScanRequest
  export function toPokemonScanRequest(body: PokemonScanBody): PokemonScanRequest
  export function fromGymScanResponse(res: pb.GymScanResponse): GymScanResponse
  export function fromPokestopScanResponse(res: pb.PokestopScanResponse): PokestopScanResponse
  export function fromStationScanResponse(res: pb.StationScanResponse): StationScanResponse
  export function fromPokemonScanResponse(res: pb.PokemonScanResponse): PokemonResponse
  export function describeGrpcError(err: unknown): string
  ```

- [ ] **Step 1: Add `PokemonScanBody` to `queries.d.ts`**

Append to the end of `src/lib/server/queryMapObjects/queries.d.ts`:

```ts
export type PokemonScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	filters: GolbatPokemonQuery[];
};
```

- [ ] **Step 2: Widen the HTTP result types in `golbatApi.ts`**

Replace the `GolbatGymResult` and `GolbatPokestopResult` definitions with:

```ts
// Raw API records: like diadem's rows except the fields the mappers rename/reshape.
export type GolbatGymResult = Omit<
	MinMapObject<GymData>,
	"availble_slots" | "defenders_raw" | "defenders" | "raw_rsvps" | "rsvps" | "deleted"
> & {
	available_slots?: number | null;
	deleted: boolean;
	defenders?: GymDefender[] | null; // HTTP: native JSON
	rsvps?: Rsvp[] | null; // HTTP: native JSON
	defenders_raw?: string; // gRPC: JSON text, parsed by GymQuery.prepare()
	raw_rsvps?: string; // gRPC: JSON text, parsed by GymQuery.prepare()
};

export type GolbatIncidentResult = Omit<Incident, "confirmed"> & { confirmed: boolean };

// HTTP emits the four JSON columns as native JSON, gRPC and SQL as JSON text.
// mapPokestop normalises to text before PokestopQuery.prepare() parses them.
export type GolbatPokestopResult = Omit<
	MinMapObject<PokestopData>,
	| "incident"
	| "deleted"
	| "quest_rewards"
	| "alternative_quest_rewards"
	| "showcase_focus"
	| "showcase_rankings"
> & {
	deleted: boolean;
	invasions?: GolbatIncidentResult[];
	quest_rewards?: string | object | null;
	alternative_quest_rewards?: string | object | null;
	showcase_focus?: string | object | null;
	showcase_rankings?: string | object | null;
};
```

Change the import line at the top of `golbatApi.ts` from

```ts
import type { FortAvailability, FortScanBody } from "@/lib/server/queryMapObjects/queries";
```

to

```ts
import type {
	FortAvailability,
	FortScanBody,
	PokemonScanBody
} from "@/lib/server/queryMapObjects/queries";
```

and change `getMultiplePokemon` to:

```ts
export async function getMultiplePokemon(body: PokemonScanBody) {
	return await callGolbat<PokemonResponse>("api/pokemon/v3/scan", "POST", JSON.stringify(body));
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm run check`
Expected: passes. `queryPokemon.ts` builds a body literal that already matches `PokemonScanBody`.

- [ ] **Step 4: Write the failing mapping tests**

`src/lib/server/api/golbatGrpcMapping.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { status } from "@grpc/grpc-js";
import {
	describeGrpcError,
	fromGymScanResponse,
	fromPokemonScanResponse,
	fromPokestopScanResponse,
	fromStationScanResponse,
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
			filters: [{ raid_level: [5], quest_reward_amount: { min: 1, max: 2147483647 } }],
			with_incidents: true
		});
		expect(req).toEqual({
			min: { lat: 51.5, lon: -0.2 },
			max: { lat: 51.6, lon: -0.1 },
			limit: 501,
			filters: [{ raid_level: [5], quest_reward_amount: { min: 1, max: 2147483647 } }],
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
				pokemon: [{ pokemon_id: 25, form: undefined }, { pokemon_id: 26, form: 3 }],
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
	it("renames json blobs to the SQL raw fields and drops unused ones", () => {
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
		expect(gym.defenders_raw).toBe('[{"pokemon_id":25,"form":0}]');
		expect(gym.raw_rsvps).toBe("[]");
		expect(gym).not.toHaveProperty("defenders_json");
		expect(gym).not.toHaveProperty("rsvps_json");
		expect(gym).not.toHaveProperty("guarding_pokemon_display_json");
		expect(gym).not.toHaveProperty("cell_id");
	});

	it("leaves unset optionals undefined", () => {
		const res = fromGymScanResponse({ gyms: [{ id: "g", lat: 0, lon: 0 }] });
		expect(res.gyms[0].defenders_raw).toBeUndefined();
		expect(res.gyms[0].raid_pokemon_id).toBeUndefined();
		expect(res.examined).toBe(0);
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
		expect(stop.invasions?.[0].character).toBe(4);
		expect(stop).not.toHaveProperty("quest_rewards_json");
		expect(stop).not.toHaveProperty("quest_conditions_json");
		expect(stop).not.toHaveProperty("alternative_quest_conditions_json");
		expect(stop).not.toHaveProperty("cell_id");
	});

	it("leaves enabled undefined when unset", () => {
		const res = fromPokestopScanResponse({ pokestops: [{ id: "p", lat: 0, lon: 0 }] });
		expect(res.pokestops[0].enabled).toBeUndefined();
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
		expect(station).not.toHaveProperty("stationed_pokemon_json");
		expect(station).not.toHaveProperty("battles");
		expect(station).not.toHaveProperty("cell_id");
	});
});

describe("fromPokemonScanResponse", () => {
	it("keys pvp by league, omits empty leagues, drops spawn_id and cell_id", () => {
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
					pvp: {
						little: [],
						great: [{ pokemon: 26, form: 0, cap: 50, value: 1, level: 20, cp: 1490, percentage: 0.9, rank: 3 }],
						ultra: [{ pokemon: 26, form: 0, cap: 51, value: 2, level: 40, cp: 2490, percentage: 0.8, rank: 7 }]
					}
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
		expect(mon.pvp).toEqual({
			great: [{ pokemon: 26, form: 0, cap: 50, value: 1, level: 20, cp: 1490, percentage: 0.9, rank: 3 }],
			ultra: [{ pokemon: 26, form: 0, cap: 51, value: 2, level: 40, cp: 2490, percentage: 0.8, rank: 7 }]
		});
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

describe("describeGrpcError", () => {
	it("renders the status name and details", () => {
		const err = Object.assign(new Error("boom"), { code: status.UNAVAILABLE, details: "connect failed" });
		expect(describeGrpcError(err)).toBe("UNAVAILABLE: connect failed");
	});

	it("adds the secret hint for UNAUTHENTICATED", () => {
		const err = Object.assign(new Error("x"), { code: status.UNAUTHENTICATED, details: "invalid or missing api secret" });
		expect(describeGrpcError(err)).toBe(
			"UNAUTHENTICATED: invalid or missing api secret (server.golbat.secret must match Golbat's api_secret)"
		);
	});

	it("falls back to String() for non-grpc errors", () => {
		expect(describeGrpcError(new TypeError("nope"))).toBe("TypeError: nope");
	});
});
```

- [ ] **Step 5: Run the tests to confirm they fail**

Run: `pnpm test src/lib/server/api/golbatGrpcMapping.test.ts`
Expected: FAIL, "Failed to resolve import ./golbatGrpcMapping".

- [ ] **Step 6: Write `golbatGrpcMapping.ts`**

```ts
import { status, type ServiceError } from "@grpc/grpc-js";
import type * as pb from "@/lib/server/api/grpc/golbat_api";
import type {
	GolbatGymResult,
	GolbatIncidentResult,
	GolbatPokestopResult,
	GolbatStationResult,
	GymScanResponse,
	PokemonResponse,
	PokestopScanResponse,
	StationScanResponse
} from "@/lib/server/api/golbatApi";
import type { FortScanBody, PokemonScanBody } from "@/lib/server/queryMapObjects/queries";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";

// Pure conversions between the HTTP request/response shapes used throughout diadem and the
// generated protobuf messages. Kept free of config and channel state so they unit test alone.
// NOTE: no runtime import of pokemonUtils here (it pulls Svelte-only state into vitest); the
// League keys below are its literal enum values.

function toLatLon(p: { latitude: number; longitude: number }): pb.LatLon {
	return { lat: p.latitude, lon: p.longitude };
}

export function toFortScanRequest(body: FortScanBody): pb.FortScanRequest {
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		// GolbatFortDnfFilter is structurally a FortDnfFilter; [] means "every fort" like omission
		filters: body.filters ?? [],
		with_incidents: body.with_incidents ?? false
	};
}

export function toPokemonScanRequest(body: PokemonScanBody): pb.PokemonScanRequest {
	return {
		min: toLatLon(body.min),
		max: toLatLon(body.max),
		limit: body.limit,
		filters: body.filters.map(({ pokemon, ...ranges }) => ({
			...ranges,
			pokemon: pokemon?.map(({ id, form }) => ({ pokemon_id: id, form })) ?? []
		}))
	};
}

function fromGym(g: pb.Gym): GolbatGymResult {
	const { defenders_json, rsvps_json, guarding_pokemon_display_json, cell_id, ...rest } = g;
	const gym = rest as GolbatGymResult;
	if (defenders_json !== undefined) gym.defenders_raw = defenders_json;
	if (rsvps_json !== undefined) gym.raw_rsvps = rsvps_json;
	return gym;
}

export function fromGymScanResponse(res: pb.GymScanResponse): GymScanResponse {
	return {
		gyms: (res.gyms ?? []).map(fromGym),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached
	};
}

function fromPokestop(p: pb.Pokestop): GolbatPokestopResult {
	const {
		enabled,
		quest_rewards_json,
		alternative_quest_rewards_json,
		quest_conditions_json,
		alternative_quest_conditions_json,
		showcase_focus_json,
		showcase_rankings_json,
		cell_id,
		invasions,
		...rest
	} = p;
	const stop = rest as GolbatPokestopResult;
	if (enabled !== undefined) stop.enabled = enabled ? 1 : 0;
	if (quest_rewards_json !== undefined) stop.quest_rewards = quest_rewards_json;
	if (alternative_quest_rewards_json !== undefined)
		stop.alternative_quest_rewards = alternative_quest_rewards_json;
	if (showcase_focus_json !== undefined) stop.showcase_focus = showcase_focus_json;
	if (showcase_rankings_json !== undefined) stop.showcase_rankings = showcase_rankings_json;
	if (invasions?.length) stop.invasions = invasions as GolbatIncidentResult[];
	return stop;
}

export function fromPokestopScanResponse(res: pb.PokestopScanResponse): PokestopScanResponse {
	return {
		pokestops: (res.pokestops ?? []).map(fromPokestop),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached
	};
}

function fromStation(s: pb.Station): GolbatStationResult {
	const { stationed_pokemon_json, battles, cell_id, ...rest } = s;
	const station = rest as GolbatStationResult;
	if (stationed_pokemon_json !== undefined) station.stationed_pokemon = stationed_pokemon_json;
	return station;
}

export function fromStationScanResponse(res: pb.StationScanResponse): StationScanResponse {
	return {
		stations: (res.stations ?? []).map(fromStation),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached
	};
}

function fromPokemon(p: pb.Pokemon): MinMapObject<PokemonData> {
	const { spawn_id, cell_id, pvp, ...rest } = p;
	const pokemon = rest as MinMapObject<PokemonData>;
	const rankings: NonNullable<PokemonData["pvp"]> = {};
	if (pvp?.little?.length) rankings.little = pvp.little as PvpStats[];
	if (pvp?.great?.length) rankings.great = pvp.great as PvpStats[];
	if (pvp?.ultra?.length) rankings.ultra = pvp.ultra as PvpStats[];
	if (Object.keys(rankings).length) pokemon.pvp = rankings;
	return pokemon;
}

export function fromPokemonScanResponse(res: pb.PokemonScanResponse): PokemonResponse {
	return {
		pokemon: (res.pokemon ?? []).map(fromPokemon),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached
	};
}

/** "UNAVAILABLE: connect failed" style summary for log lines; hints at the secret on auth failure. */
export function describeGrpcError(err: unknown): string {
	const e = err as Partial<ServiceError> | null | undefined;
	if (e && typeof e.code === "number") {
		const text = `${status[e.code] ?? e.code}: ${e.details || e.message || ""}`;
		return e.code === status.UNAUTHENTICATED
			? `${text} (server.golbat.secret must match Golbat's api_secret)`
			: text;
	}
	return String(err);
}
```

Notes for the implementer:
- `rest as GolbatGymResult` is a plain assertion. If `pnpm run check` reports TS2352 ("neither type sufficiently overlaps") on one of the three fort casts, the error names the offending property; destructure it out like `enabled` is for pokestops and convert explicitly. Do not switch to `as unknown as`.
- `rankings.little` relies on `PokemonData["pvp"]` having keys `"little" | "great" | "ultra"` (the `League` enum's string values). If TS rejects the property name, write `rankings["little" as League.LITTLE]` with `import type { League } from "@/lib/utils/pokemonUtils"` (type-only import is fine).

- [ ] **Step 7: Run the tests**

Run: `pnpm test src/lib/server/api/golbatGrpcMapping.test.ts`
Expected: all pass (14 tests).

- [ ] **Step 8: Type-check, lint, full test run**

Run: `pnpm run check && pnpm run lint && pnpm test`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/server/queryMapObjects/queries.d.ts src/lib/server/api/golbatApi.ts src/lib/server/api/golbatGrpcMapping.ts src/lib/server/api/golbatGrpcMapping.test.ts
git commit -m "feat: map golbat grpc messages to the http scan types"
```

---

### Task 3: gRPC client module with wire test

**Files:**
- Create: `src/lib/server/api/golbatGrpc.ts`
- Create: `src/lib/server/api/golbatGrpc.test.ts`

**Interfaces:**
- Consumes: Task 1 generated client; Task 2 mapping functions; `getServerConfig().golbat.grpc` / `.secret`.
- Produces:
  ```ts
  export function isGrpcEnabled(): boolean
  export function grpcScanGyms(body: FortScanBody): Promise<GymScanResponse>
  export function grpcScanPokestops(body: FortScanBody): Promise<PokestopScanResponse>
  export function grpcScanStations(body: FortScanBody): Promise<StationScanResponse>
  export function grpcScanPokemon(body: PokemonScanBody): Promise<PokemonResponse>
  ```
  All four reject with the grpc-js `ServiceError` (has `.code`) on failure.

- [ ] **Step 1: Write the failing wire test**

`src/lib/server/api/golbatGrpc.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Server, ServerCredentials, status, type Metadata } from "@grpc/grpc-js";
import {
	GolbatApiService,
	type FortScanRequest,
	type GolbatApiServer
} from "./grpc/golbat_api";

// golbatGrpc.ts reads the config object once at import and its fields lazily per call, so
// mutating this hoisted object after the server binds is enough to point the client at it.
const golbatConfig = vi.hoisted(() => ({
	url: "http://127.0.0.1:1",
	secret: "topsecret",
	grpc: "" as string | undefined
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ golbat: golbatConfig })
}));

import { grpcScanGyms, isGrpcEnabled } from "./golbatGrpc";

let server: Server;
let received: { metadata: Metadata; request: FortScanRequest } | undefined;
let respondWith: "ok" | "unauthenticated" = "ok";

const unimplemented = (_call: unknown, callback: (err: { code: status }) => void) =>
	callback({ code: status.UNIMPLEMENTED });

beforeAll(async () => {
	server = new Server();
	const impl: GolbatApiServer = {
		scanGyms(call, callback) {
			received = { metadata: call.metadata, request: call.request };
			if (respondWith === "unauthenticated") {
				callback({ code: status.UNAUTHENTICATED, details: "invalid or missing api secret" });
				return;
			}
			callback(null, {
				gyms: [
					{
						id: "g1",
						lat: 1.5,
						lon: 2.5,
						updated: 100,
						deleted: false,
						first_seen_timestamp: 1,
						team_id: 2,
						available_slots: 4,
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
		},
		scanPokestops: unimplemented,
		scanStations: unimplemented,
		scanForts: unimplemented,
		scanPokemon: unimplemented,
		getPokemon: unimplemented
	};
	server.addService(GolbatApiService, impl);
	const port = await new Promise<number>((resolve, reject) =>
		server.bindAsync("127.0.0.1:0", ServerCredentials.createInsecure(), (err, p) =>
			err ? reject(err) : resolve(p)
		)
	);
	golbatConfig.grpc = `127.0.0.1:${port}`;
});

afterAll(() => {
	server.forceShutdown();
});

beforeEach(() => {
	received = undefined;
	respondWith = "ok";
});

describe("golbatGrpc", () => {
	it("is enabled when the grpc target is configured", () => {
		expect(isGrpcEnabled()).toBe(true);
	});

	it("sends the secret as x-golbat-secret metadata and maps the response", async () => {
		const res = await grpcScanGyms({
			min: { latitude: 51.5, longitude: -0.2 },
			max: { latitude: 51.6, longitude: -0.1 },
			limit: 11,
			filters: [{ raid_level: [5] }]
		});

		expect(received?.metadata.get("x-golbat-secret")).toEqual(["topsecret"]);
		expect(received?.request).toEqual({
			min: { lat: 51.5, lon: -0.2 },
			max: { lat: 51.6, lon: -0.1 },
			limit: 11,
			filters: [
				{
					raid_level: [5],
					team_id: [],
					raid_pokemon_id: [],
					raid_temp_evolution_id: [],
					lure_id: [],
					quest_reward_type: [],
					quest_reward_item_id: [],
					quest_reward_pokemon: [],
					incident_display_type: [],
					incident_character: [],
					contest_pokemon: [],
					contest_pokemon_type: [],
					contest_focus: [],
					contest_ranking_standard: [],
					battle_level: [],
					battle_pokemon: []
				}
			],
			with_incidents: false
		});

		expect(res.examined).toBe(1);
		expect(res.gyms).toHaveLength(1);
		expect(res.gyms[0].id).toBe("g1");
		expect(res.gyms[0].available_slots).toBe(4);
		expect(res.gyms[0].defenders_raw).toBe('[{"pokemon_id":25,"form":0}]');
		expect(res.gyms[0].raw_rsvps).toBe("[]");
		expect(res.gyms[0]).not.toHaveProperty("cell_id");
	});

	it("rejects with the grpc status code on error", async () => {
		respondWith = "unauthenticated";
		await expect(
			grpcScanGyms({
				min: { latitude: 0, longitude: 0 },
				max: { latitude: 1, longitude: 1 },
				limit: 1
			})
		).rejects.toMatchObject({ code: status.UNAUTHENTICATED });
	});
});
```

Note on the `received.request` expectation: the server decodes the wire bytes with the generated
`FortDnfFilter.decode`, whose base object initialises every `repeated` field to `[]`. That is why
the empty lists appear. If the generated base object differs (check `createBaseFortDnfFilter` in
`golbat_api.ts`), adjust the expected object to match; the point of the assertion is
`raid_level: [5]`, the bounds and the limit.

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm test src/lib/server/api/golbatGrpc.test.ts`
Expected: FAIL, "Failed to resolve import ./golbatGrpc".

- [ ] **Step 3: Write `golbatGrpc.ts`**

```ts
import { ChannelCredentials, Metadata, type CallOptions, type ServiceError } from "@grpc/grpc-js";
import { GolbatApiClient } from "@/lib/server/api/grpc/golbat_api";
import type {
	GymScanResponse,
	PokemonResponse,
	PokestopScanResponse,
	StationScanResponse
} from "@/lib/server/api/golbatApi";
import {
	fromGymScanResponse,
	fromPokemonScanResponse,
	fromPokestopScanResponse,
	fromStationScanResponse,
	toFortScanRequest,
	toPokemonScanRequest
} from "@/lib/server/api/golbatGrpcMapping";
import type { FortScanBody, PokemonScanBody } from "@/lib/server/queryMapObjects/queries";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("golbat:grpc");
const config = getServerConfig().golbat;
const DEADLINE_MS = 30_000;

let client: GolbatApiClient | undefined;

export function isGrpcEnabled() {
	return Boolean(config.grpc);
}

// One channel per process; grpc-js reconnects on its own.
function getClient() {
	if (!client) {
		client = new GolbatApiClient(config.grpc!, ChannelCredentials.createInsecure(), {
			"grpc.keepalive_time_ms": 30_000,
			"grpc.keepalive_permit_without_calls": 1
		});
	}
	return client;
}

// Same log format as callGolbat so HTTP and gRPC timings compare in one stream.
function call<Res>(
	name: string,
	invoke: (
		client: GolbatApiClient,
		metadata: Metadata,
		options: Partial<CallOptions>,
		callback: (err: ServiceError | null, res: Res) => void
	) => unknown
): Promise<Res> {
	const start = performance.now();
	const metadata = new Metadata();
	if (config.secret) metadata.set("x-golbat-secret", config.secret);

	return new Promise<Res>((resolve, reject) => {
		invoke(getClient(), metadata, { deadline: Date.now() + DEADLINE_MS }, (err, res) => {
			if (err) return reject(err);
			log.debug("[%s] Request took %fms", name, (performance.now() - start).toFixed(1));
			resolve(res);
		});
	});
}

export async function grpcScanGyms(body: FortScanBody): Promise<GymScanResponse> {
	const request = toFortScanRequest(body);
	return fromGymScanResponse(
		await call("ScanGyms", (c, md, opts, cb) => c.scanGyms(request, md, opts, cb))
	);
}

export async function grpcScanPokestops(body: FortScanBody): Promise<PokestopScanResponse> {
	const request = toFortScanRequest(body);
	return fromPokestopScanResponse(
		await call("ScanPokestops", (c, md, opts, cb) => c.scanPokestops(request, md, opts, cb))
	);
}

export async function grpcScanStations(body: FortScanBody): Promise<StationScanResponse> {
	const request = toFortScanRequest(body);
	return fromStationScanResponse(
		await call("ScanStations", (c, md, opts, cb) => c.scanStations(request, md, opts, cb))
	);
}

export async function grpcScanPokemon(body: PokemonScanBody): Promise<PokemonResponse> {
	const request = toPokemonScanRequest(body);
	return fromPokemonScanResponse(
		await call("ScanPokemon", (c, md, opts, cb) => c.scanPokemon(request, md, opts, cb))
	);
}
```

- [ ] **Step 4: Run the wire test**

Run: `pnpm test src/lib/server/api/golbatGrpc.test.ts`
Expected: 3 passed. If the `received.request` assertion fails only on the empty-list fields, fix the expectation as described in Step 1's note; if it fails on `raid_level`, the bounds or the limit, the mapping or the call is wrong.

- [ ] **Step 5: Type-check, lint, full tests**

Run: `pnpm run check && pnpm run lint && pnpm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/api/golbatGrpc.ts src/lib/server/api/golbatGrpc.test.ts
git commit -m "feat: golbat grpc client for fort and pokemon scans"
```

---

### Task 4: Fix the HTTP pokestop mapper's native-JSON fields

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryPokestopApi.ts:20-28`
- Create: `src/lib/server/queryMapObjects/queryPokestopApi.test.ts`

**Interfaces:**
- Consumes: `GolbatPokestopResult` from Task 2 (four JSON fields typed `string | object | null | undefined`).
- Produces: `export function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData>` (was module-private; exported for the test).

- [ ] **Step 1: Write the failing test**

`src/lib/server/queryMapObjects/queryPokestopApi.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

// queryPokestopApi.ts extends PokestopQuery, which reaches the MySQL pool, Svelte state and
// SvelteKit virtual modules at import. Stub every runtime import except the module under test.
vi.mock("@/lib/server/queryMapObjects/queryPokestop", () => ({
	PokestopQuery: class {}
}));
vi.mock("@/lib/server/api/golbatApi", () => ({}));
vi.mock("@/lib/server/api/golbatGrpc", () => ({ isGrpcEnabled: () => false }));
vi.mock("@/lib/server/api/golbatGrpcMapping", () => ({ describeGrpcError: String }));
vi.mock("@/lib/server/queryMapObjects/fortDnf", () => ({
	buildPokestopDnfFilters: () => []
}));
vi.mock("@/lib/utils/logger", () => ({
	getLogger: () => ({ debug() {}, info() {}, warning() {}, error() {} })
}));

import { mapPokestop } from "./queryPokestopApi";

const base = { id: "p1", lat: 1, lon: 2, updated: 1, deleted: false } as const;

describe("mapPokestop", () => {
	it("stringifies native-JSON quest and showcase fields from the HTTP API", () => {
		const stop = mapPokestop({
			...base,
			quest_rewards: [{ type: 7, info: { pokemon_id: 25 } }],
			alternative_quest_rewards: [{ type: 3, info: { amount: 500 } }],
			showcase_focus: { type: "pokemon", pokemon_id: 1 },
			showcase_rankings: { total_entries: 2 }
		} as any);
		expect(stop.quest_rewards).toBe('[{"type":7,"info":{"pokemon_id":25}}]');
		expect(stop.alternative_quest_rewards).toBe('[{"type":3,"info":{"amount":500}}]');
		expect(stop.showcase_focus).toBe('{"type":"pokemon","pokemon_id":1}');
		expect(stop.showcase_rankings).toBe('{"total_entries":2}');
		expect(JSON.parse(stop.quest_rewards!)[0].type).toBe(7);
	});

	it("passes string fields through unchanged and leaves null/undefined absent", () => {
		const stop = mapPokestop({
			...base,
			quest_rewards: '[{"type":7}]',
			alternative_quest_rewards: null,
			showcase_focus: undefined
		} as any);
		expect(stop.quest_rewards).toBe('[{"type":7}]');
		expect(stop.alternative_quest_rewards).toBeUndefined();
		expect(stop.showcase_focus).toBeUndefined();
		expect(stop.showcase_rankings).toBeUndefined();
	});

	it("converts deleted to a number and invasions to incident", () => {
		const stop = mapPokestop({
			...base,
			deleted: true,
			invasions: [{ id: "i", pokestop_id: "p1", display_type: 1, style: 0, character: 4, start: 1, expiration: 2, confirmed: true, updated: 1 }]
		} as any);
		expect(stop.deleted).toBe(1);
		expect(stop.incident).toHaveLength(1);
		expect(stop.incident[0].character).toBe(4);
		expect(stop).not.toHaveProperty("invasions");
	});
});
```

The `golbatGrpc` and `golbatGrpcMapping` mocks are inert until Task 5 adds those imports; vitest ignores mocks of modules that are never imported, so this test keeps passing after Task 5.

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm test src/lib/server/queryMapObjects/queryPokestopApi.test.ts`
Expected: FAIL, `mapPokestop` is not exported (SyntaxError or "does not provide an export named").

- [ ] **Step 3: Export and fix `mapPokestop`**

Replace the `mapPokestop` function in `queryPokestopApi.ts` with:

```ts
// HTTP emits these four as native JSON, SQL and gRPC as JSON text. prepare() and
// parseQuestReward JSON.parse them, so hand them text either way.
const asJsonText = (value: unknown) =>
	value == null ? undefined : typeof value === "string" ? value : JSON.stringify(value);

export function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData> {
	const {
		deleted,
		invasions,
		quest_rewards,
		alternative_quest_rewards,
		showcase_focus,
		showcase_rankings,
		...rest
	} = p;
	return {
		...rest,
		deleted: deleted ? 1 : 0,
		incident: (invasions ?? []).map((i): Incident => ({ ...i })),
		quest_rewards: asJsonText(quest_rewards),
		alternative_quest_rewards: asJsonText(alternative_quest_rewards),
		showcase_focus: asJsonText(showcase_focus),
		showcase_rankings: asJsonText(showcase_rankings)
	} as MinMapObject<PokestopData>;
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm test src/lib/server/queryMapObjects/queryPokestopApi.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Type-check, lint, full tests**

Run: `pnpm run check && pnpm run lint && pnpm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/queryMapObjects/queryPokestopApi.ts src/lib/server/queryMapObjects/queryPokestopApi.test.ts
git commit -m "fix: hand prepare() json text for http fort api pokestop quest and showcase fields"
```

---

### Task 5: gRPC-first step in the three fort query classes

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryGymApi.ts:42-84`
- Modify: `src/lib/server/queryMapObjects/queryPokestopApi.ts` (the `query` method)
- Modify: `src/lib/server/queryMapObjects/queryStationApi.ts` (the `query` method)

**Interfaces:**
- Consumes: `isGrpcEnabled`, `grpcScanGyms`, `grpcScanPokestops`, `grpcScanStations` from Task 3; `describeGrpcError` from Task 2; `FortScanBody` type.
- Produces: no new exports. Behaviour: gRPC → HTTP → SQL.

No new unit test: the classes wrap MySQL-backed base classes and the transport functions are each tested in isolation. Verification is the type-check plus the existing test suite, then the manual run in Task 7.

- [ ] **Step 1: Gym**

In `queryGymApi.ts`, add imports:

```ts
import { grpcScanGyms, isGrpcEnabled } from "@/lib/server/api/golbatGrpc";
import { describeGrpcError } from "@/lib/server/api/golbatGrpcMapping";
import type { FortScanBody } from "@/lib/server/queryMapObjects/queries";
```

Replace the block from `const actualLimit = ...` through `if (!result) return super.query(...)` in `query()` with:

```ts
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const body: FortScanBody = {
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined
		};

		let result: GymScanResponse | undefined;
		if (isGrpcEnabled()) {
			try {
				result = await grpcScanGyms(body);
			} catch (err) {
				log.warning("gRPC gym scan failed (%s), falling back to HTTP", describeGrpcError(err));
			}
		}
		if (!result) {
			try {
				result = await scanGyms(body);
			} catch (err) {
				log.debug("Fort gym scan failed, falling back to SQL: %s", err);
			}
		}
		if (!result) return super.query(bounds, filter, polygon, since, limit);
```

- [ ] **Step 2: Pokestop**

In `queryPokestopApi.ts`, add imports:

```ts
import { grpcScanPokestops, isGrpcEnabled } from "@/lib/server/api/golbatGrpc";
import { describeGrpcError } from "@/lib/server/api/golbatGrpcMapping";
import type { FortScanBody } from "@/lib/server/queryMapObjects/queries";
```

Replace the equivalent block in `query()` with:

```ts
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const body: FortScanBody = {
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined,
			with_incidents: true
		};

		let result: PokestopScanResponse | undefined;
		if (isGrpcEnabled()) {
			try {
				result = await grpcScanPokestops(body);
			} catch (err) {
				log.warning("gRPC pokestop scan failed (%s), falling back to HTTP", describeGrpcError(err));
			}
		}
		if (!result) {
			try {
				result = await scanPokestops(body);
			} catch (err) {
				log.debug("Fort pokestop scan failed, falling back to SQL: %s", err);
			}
		}
		if (!result) return super.query(bounds, filter, polygon, since, limit);
```

- [ ] **Step 3: Station**

In `queryStationApi.ts`, add imports:

```ts
import { grpcScanStations, isGrpcEnabled } from "@/lib/server/api/golbatGrpc";
import { describeGrpcError } from "@/lib/server/api/golbatGrpcMapping";
import type { FortScanBody } from "@/lib/server/queryMapObjects/queries";
```

Replace the equivalent block in `query()` with:

```ts
		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const body: FortScanBody = {
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined
		};

		let result: StationScanResponse | undefined;
		if (isGrpcEnabled()) {
			try {
				result = await grpcScanStations(body);
			} catch (err) {
				log.warning("gRPC station scan failed (%s), falling back to HTTP", describeGrpcError(err));
			}
		}
		if (!result) {
			try {
				result = await scanStations(body);
			} catch (err) {
				log.debug("Fort station scan failed, falling back to SQL: %s", err);
			}
		}
		if (!result) return super.query(bounds, filter, polygon, since, limit);
```

- [ ] **Step 4: Type-check, lint, full tests**

Run: `pnpm run check && pnpm run lint && pnpm test`
Expected: all pass. The `queryPokestopApi.test.ts` mocks from Task 4 cover the new imports.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/queryMapObjects/queryGymApi.ts src/lib/server/queryMapObjects/queryPokestopApi.ts src/lib/server/queryMapObjects/queryStationApi.ts
git commit -m "feat: fort map scans via golbat grpc with http and sql fallback"
```

---

### Task 6: gRPC-first step in the pokemon query

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryPokemon.ts:27-46` (imports and the top of `query()`)

**Interfaces:**
- Consumes: `isGrpcEnabled`, `grpcScanPokemon` from Task 3; `describeGrpcError` from Task 2; `PokemonScanBody` from Task 2.
- Produces: no new exports. Behaviour: gRPC → HTTP → `error(500)`.

- [ ] **Step 1: Edit `queryPokemon.ts`**

Add imports:

```ts
import { grpcScanPokemon, isGrpcEnabled } from "@/lib/server/api/golbatGrpc";
import { describeGrpcError } from "@/lib/server/api/golbatGrpcMapping";
import { getLogger } from "@/lib/utils/logger";
```

Extend the existing `queries` type import to include `PokemonScanBody`:

```ts
import type {
	GolbatPokemonQuery,
	GolbatPokemonSpecies,
	PokemonScanBody
} from "@/lib/server/queryMapObjects/queries";
```

Add after the imports:

```ts
const log = getLogger("query:pokemon");
```

In `query()`, replace

```ts
		const body = {
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit,
			filters: golbatQueries
		};

		const result = await getMultiplePokemon(body);
```

with

```ts
		const body: PokemonScanBody = {
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit,
			filters: golbatQueries
		};

		let result: PokemonResponse | undefined;
		if (isGrpcEnabled()) {
			try {
				result = await grpcScanPokemon(body);
			} catch (err) {
				log.warning("gRPC pokemon scan failed (%s), falling back to HTTP", describeGrpcError(err));
			}
		}
		if (!result) result = await getMultiplePokemon(body);
```

and extend the `golbatApi` import to bring in the type:

```ts
import {
	getMultiplePokemon,
	getSinglePokemon,
	type PokemonResponse
} from "@/lib/server/api/golbatApi";
```

The rest of `query()` (`if (result) { ... } error(500);`) is unchanged.

- [ ] **Step 2: Type-check, lint, full tests**

Run: `pnpm run check && pnpm run lint && pnpm test`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/queryMapObjects/queryPokemon.ts
git commit -m "feat: pokemon map scans via golbat grpc with http fallback"
```

---

### Task 7: Documentation, config example, manual verification

**Files:**
- Modify: `config/config.example.toml:5-8`
- Modify: `docs/src/content/docs/reference/configuration.md` (the `server.golbat` section, lines ~26-41)
- Modify: `CLAUDE.md` (Commands list; Source Organization)

- [ ] **Step 1: Config example**

Change the `[server.golbat]` block in `config/config.example.toml` to:

```toml
[server.golbat]
url = "http://127.0.0.1:9001"
secret = ""
# Optional. Golbat's grpc_port target. When set, map scans use gRPC (same secret), falling back to HTTP.
# grpc = "127.0.0.1:50001"
```

Keep the `defaultNestName` line and comment that follow it unchanged.

- [ ] **Step 2: Configuration reference**

In `docs/src/content/docs/reference/configuration.md`, change the `server.golbat` code block and key list to:

````markdown
## `server.golbat`

```toml
[server.golbat]
url = "http://127.0.0.1:9001"
secret = ""
grpc = "127.0.0.1:50001"
defaultNestName = "Unknown Nest"
```

- `url`: Golbat base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Golbat secret
- `grpc`: Optional. Golbat's gRPC target (`host:port`, see below)
- `defaultNestName`: The default nest name, as configured in Fletchling
````

Then, after the existing "Golbat fort API (optional, recommended)" subsection, add:

````markdown
### Golbat gRPC API (optional)

When your Golbat serves the `GolbatApi` gRPC service (Golbat `feat/grpc-api` or later, with `grpc_port` set in Golbat's config), set `grpc` to that `host:port`. Diadem then runs gym, pokéstop, station and pokémon map scans over gRPC with protobuf encoding, which is markedly cheaper than the JSON HTTP API on large responses. The same `secret` is sent as the `x-golbat-secret` metadata, so no extra Golbat configuration is needed beyond `grpc_port`.

Gym, pokéstop and station scans still require the fort API detection above (`fort_in_memory = true`); gRPC only changes the transport. By-id lookups, search and availability stay on HTTP.

If a gRPC call fails for any reason (Golbat down, wrong secret, `fort_in_memory` off, timeout), Diadem logs a warning and falls back to the HTTP API for that request, and for forts to SQL after that, so the map keeps working. Unset `grpc` to compare against the HTTP path; per-request timings are logged at debug level on both transports.

The gRPC connection is plaintext. Keep it on a private network, as with Golbat's HTTP port.
````

- [ ] **Step 3: CLAUDE.md**

In the Commands list, after the `db:studio` line, add:

```markdown
- **Regenerate gRPC client:** `pnpm run grpc:generate` — after updating `proto/golbat_api.proto` from Golbat's `grpc/api.proto`; commit the regenerated `src/lib/server/api/grpc/golbat_api.ts`
```

In Source Organization, after the `src/lib/server/` line, add:

```markdown
- `src/lib/server/api/grpc/` — ts-proto generated Golbat gRPC client (never hand-edit); `golbatGrpc.ts` wraps it, `golbatGrpcMapping.ts` converts to/from the HTTP scan types
```

- [ ] **Step 4: Lint and commit**

Run: `pnpm run lint`
Expected: passes (markdown is prettier-ignored; the toml example is not linted).

```bash
git add config/config.example.toml docs/src/content/docs/reference/configuration.md CLAUDE.md
git commit -m "docs: document the golbat grpc option"
```

- [ ] **Step 5: Manual verification against Golbat**

Requires a Golbat built from `feat/grpc-api` (8f10ee9 or later) with `grpc_port` set and `fort_in_memory = true`.

1. Set `grpc = "<golbat-host>:<grpc_port>"` under `[server.golbat]` in `config/config.toml`. Set log level to `debug`.
2. `pnpm run dev`, open the map, pan over an area with gyms, pokéstops, stations and pokémon.
3. Confirm log lines like `[golbat:grpc] [ScanGyms] Request took 12.3ms` and no `falling back to HTTP` warnings. Confirm raids, quests, showcases, invasions, defenders and pokémon PVP render as before.
4. Set `secret` to a wrong value, reload: expect `UNAUTHENTICATED: ... (server.golbat.secret must match Golbat's api_secret)` warnings and the map still populated via HTTP. Restore the secret.
5. Comment out `grpc`, restart, pan the same area, compare the `[golbat] [/api/gym/scan] Request took` lines against the gRPC ones.
6. Record the two sets of timings in the PR description.

---

## Self-review

**Spec coverage:** §2 config → Task 1 step 7 and Task 7. §3 codegen, options, deps, jstype → Task 1. §4 client, deadline, metadata, timing log → Task 3. §5.1/§5.2 mapping incl. dropped fields and pvp keys → Task 2. §6 query classes and fallback chain → Tasks 5, 6. §7 HTTP pokestop fix → Task 4. §8 error rendering incl. auth hint → Task 2 (`describeGrpcError`), used in Tasks 5, 6. §9 tests: generated smoke (Task 1), mapping unit (Task 2), wire incl. metadata and error code (Task 3), HTTP fix (Task 4), manual (Task 7). §10 docs → Task 7.

**Type consistency:** `PokemonScanBody` defined in Task 2 step 1, used in Tasks 2, 3, 6. `FortScanBody` pre-exists in `queries.d.ts`. `GymScanResponse`/`PokestopScanResponse`/`StationScanResponse`/`PokemonResponse` pre-exist in `golbatApi.ts` and are the return types in Tasks 2 and 3. `describeGrpcError` lives in `golbatGrpcMapping.ts` (Task 2) and is imported from there in Tasks 4 (mock), 5, 6. Logger method is `warning` everywhere.
