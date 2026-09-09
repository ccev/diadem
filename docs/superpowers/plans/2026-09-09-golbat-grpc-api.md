# Golbat gRPC Map Scans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve gym, pokestop, station and pokemon map scans from Golbat's `GolbatApi` gRPC service when `server.golbat.grpc` is configured, falling back to the existing HTTP path (and SQL for forts) on any error.

**Architecture:** A ts-proto generated grpc-js client (`src/lib/server/api/grpc/golbat_api.ts`) is wrapped by `golbatGrpc.ts`, which exposes four promise-returning scan functions that accept and return exactly the types the HTTP functions in `golbatApi.ts` use, plus one `scanViaGrpcOrHttp` helper that owns the gRPC-then-HTTP choice. Pure request/response mapping lives in `golbatGrpcMapping.ts`. Each query class swaps its direct HTTP call for the helper.

**Tech Stack:** SvelteKit server code (TypeScript 6 strict), `@grpc/grpc-js`, `@bufbuild/protobuf` (wire reader used by generated code), `ts-proto` + `@bufbuild/buf` for codegen, vitest 5, pnpm 11, Node 24.

**Spec:** `docs/superpowers/specs/2026-09-09-golbat-grpc-api-design.md`. Read it before starting.

## Global Constraints

- Package manager is pnpm 11.25.0 via `packageManager`. If `pnpm` is not on PATH, run it as `corepack pnpm` (a shim script named `pnpm` containing `exec corepack pnpm "$@"` on PATH also works and stops pnpm's own deps check from failing with ENOENT).
- Node 24. Tests: `pnpm test` (vitest 5, node environment, `@` alias to `src`). Run a single file with `pnpm test <path>`.
- **Gates for every task:** `pnpm test` fully green. `pnpm run check` and `pnpm run lint` each have pre-existing failures on this branch (15 type errors and 4 unformatted files, all in UI components under `src/components` and `src/lib/drawer`, `src/lib/ui`, plus `src/lib/utils/numberFormat.ts`; none in files this work touches). The gate is therefore: `pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'` prints nothing, and `pnpm exec prettier --check <every file you created or modified>` passes. Do not fix the pre-existing failures.
- If `pnpm run check` complains about missing paraglide messages (`Property '...' does not exist on type 'typeof import(".../paraglide/messages")'`), regenerate them first: `pnpm exec paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` (generated, git-ignored).
- Formatting: tabs, double quotes, prettier config in repo. Run `pnpm exec prettier --write <files>` on files you touch before committing.
- ts-proto options are fixed by the spec: `forceLong=number`, `useOptionals=all`, `snakeToCamel=false`, `useJsTypeOverride=true`, `outputServices=grpc-js`, `esModuleInterop=true`.
- The generated file `src/lib/server/api/grpc/golbat_api.ts` is never hand-edited.
- Logger API is `getLogger(name)` returning `{ debug, info, warning, error }`. There is no `warn`.
- `golbatGrpcMapping.ts` must not import `@/lib/utils/pokemonUtils` at runtime (it drags in Svelte-only state and breaks vitest). Use `import type` only.
- Commit messages: conventional prefix (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), end with the attribution trailer given in the session.
- Do not touch files unrelated to the task. In particular do not modify `fortDnf.ts`, `pokestopApiMapper.ts`, `golbatFortApi.ts` or any existing test.

---

## File map

| File | Responsibility |
|---|---|
| `proto/golbat_api.proto` | Verbatim copy of Golbat `grpc/api.proto` at commit `8f10ee9`, plus a two-line provenance header |
| `buf.gen.yaml` | ts-proto generation config |
| `package.json`, `pnpm-lock.yaml` | new deps and the `grpc:generate` script |
| `.prettierignore` | excludes the generated directory |
| `src/lib/server/api/grpc/golbat_api.ts` | generated client, service definition, message codecs |
| `src/lib/server/api/grpc/generated.test.ts` | smoke test that the generated codecs behave as the spec assumes |
| `src/lib/services/config/configTypes.d.ts` | `golbat.grpc?: string` |
| `src/lib/server/queryMapObjects/queries.d.ts` | `PokemonScanBody` type |
| `src/lib/server/api/golbatApi.ts` | `getMultiplePokemon` typed; pokestop quest reward fields accept strings |
| `src/lib/server/api/golbatGrpcMapping.ts` | pure request/response mapping + `describeGrpcError` |
| `src/lib/server/api/golbatGrpcMapping.test.ts` | mapping unit tests |
| `src/lib/server/api/golbatGrpc.ts` | channel, metadata, deadline, timing log, four scan functions, `scanViaGrpcOrHttp` |
| `src/lib/server/api/golbatGrpc.test.ts` | in-process grpc-js server wire test |
| `src/lib/server/queryMapObjects/queryGymApi.ts`, `queryPokestopApi.ts`, `queryStationApi.ts` | call through `scanViaGrpcOrHttp` |
| `src/lib/server/queryMapObjects/queryPokemon.ts` | call through `scanViaGrpcOrHttp` |
| `config/config.example.toml`, `docs/src/content/docs/reference/configuration.md`, `CLAUDE.md` | documentation |

---

### Task 1: Codegen toolchain, generated client, config type

**Files:**
- Create: `proto/golbat_api.proto`
- Create: `buf.gen.yaml`
- Modify: `package.json` (dependencies, devDependencies, scripts), `pnpm-lock.yaml`
- Modify: `.prettierignore`
- Create (generated): `src/lib/server/api/grpc/golbat_api.ts`
- Create: `src/lib/server/api/grpc/generated.test.ts`
- Modify: `src/lib/services/config/configTypes.d.ts:140-145`

**Interfaces:**
- Produces: module `@/lib/server/api/grpc/golbat_api` exporting `GolbatApiClient` (class: `new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>)`, unary methods `scanGyms(request, metadata, options, callback)` etc.), `GolbatApiService` (service definition for `server.addService`), `GolbatApiServer` (server implementation interface), and message interfaces + codecs `LatLon`, `IntRange`, `DnfId`, `FortDnfFilter`, `FortScanRequest`, `PokemonDnfFilter`, `PokemonScanRequest`, `PokemonScanResponse`, `Pokemon`, `PvpRankings`, `PvpEntry`, `Gym`, `GymScanResponse`, `Pokestop`, `PokestopScanResponse`, `Incident`, `Station`, `StationScanResponse`. Every message field is `?: T | undefined`, snake_case, int64 as `number`, and the eight `jstype` fields as `string`.
- Produces: `ServerConfig.golbat.grpc?: string`.

- [ ] **Step 1: Copy the proto from Golbat 8f10ee9 with a provenance header**

```bash
mkdir -p proto
curl -fsSL https://raw.githubusercontent.com/UnownHash/Golbat/8f10ee9/grpc/api.proto -o proto/golbat_api.proto
```

Prepend these two lines above `syntax = "proto3";`:

```proto
// Copied verbatim from UnownHash/Golbat grpc/api.proto at commit 8f10ee9 (branch feat/grpc-api).
// Do not edit. Re-copy when Golbat changes it, then run `pnpm run grpc:generate` and commit both.
```

Verify:

```bash
grep -c "jstype = JS_STRING" proto/golbat_api.proto
```

Expected: `8`.

- [ ] **Step 2: Add dependencies and the generate script**

```bash
pnpm add @grpc/grpc-js@^1.14.4 @bufbuild/protobuf@^2.14.1
pnpm add -D ts-proto@^2.12.3 @bufbuild/buf@^1.72.0
```

If pnpm reports ignored build scripts for `@bufbuild/buf`, add `"@bufbuild/buf": true` under `allowBuilds` in `pnpm-workspace.yaml` and run `pnpm install` again.

Add to `"scripts"` in `package.json`, after the `"db:studio"` line:

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

Append to `.prettierignore` under `# Generated`, after `project.inlang/cache`:

```
src/lib/server/api/grpc
```

Sanity-check the generated file:

```bash
grep -n "^import\|^} from" src/lib/server/api/grpc/golbat_api.ts | head
grep -c "  spawn_id?: string" src/lib/server/api/grpc/golbat_api.ts
grep -n "export const GolbatApiClient" src/lib/server/api/grpc/golbat_api.ts
```

Expected: imports from `@bufbuild/protobuf/wire` and `@grpc/grpc-js`; count `1`; `GolbatApiClient` exported.

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

- [ ] **Step 8: Gates**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'; pnpm exec prettier --check buf.gen.yaml package.json .prettierignore src/lib/services/config/configTypes.d.ts src/lib/server/api/grpc/generated.test.ts`
Expected: tests green, the grep prints nothing, prettier passes. If `check` reports errors inside `golbat_api.ts`, report them as a concern with the exact message (do not edit the generated file).

- [ ] **Step 9: Commit**

```bash
git add proto/golbat_api.proto buf.gen.yaml package.json pnpm-lock.yaml pnpm-workspace.yaml .prettierignore src/lib/server/api/grpc/ src/lib/services/config/configTypes.d.ts
git commit -m "chore: generate golbat grpc client with ts-proto"
```

(`pnpm-workspace.yaml` only if Step 2 changed it.)

---

### Task 2: Types and pure mapping module

**Files:**
- Modify: `src/lib/server/queryMapObjects/queries.d.ts` (append)
- Modify: `src/lib/server/api/golbatApi.ts` (`GolbatPokestopResult` quest reward fields; `getMultiplePokemon` signature; import)
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
- Produces in `golbatApi.ts`: `GolbatPokestopResult.quest_rewards?: object[] | string | null` and `alternative_quest_rewards?: object[] | string | null`; `getMultiplePokemon(body: PokemonScanBody)`.
- Produces in `golbatGrpcMapping.ts`:
  ```ts
  export function toFortScanRequest(body: FortScanBody): pb.FortScanRequest
  export function toPokemonScanRequest(body: PokemonScanBody): pb.PokemonScanRequest
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

- [ ] **Step 2: Widen the pokestop quest reward fields and type `getMultiplePokemon`**

In `golbatApi.ts`, change the two lines in `GolbatPokestopResult`

```ts
	quest_rewards?: object[] | null;
	alternative_quest_rewards?: object[] | null;
```

to

```ts
	quest_rewards?: object[] | string | null;
	alternative_quest_rewards?: object[] | string | null;
```

Change the `queries` type import to include `PokemonScanBody`:

```ts
import type {
	FortAvailability,
	FortScanBody,
	GolbatStatus,
	PokemonScanBody
} from "@/lib/server/queryMapObjects/queries";
```

and change `getMultiplePokemon` to:

```ts
export function getMultiplePokemon(body: PokemonScanBody) {
	return callGolbat<PokemonResponse>("api/pokemon/v3/scan", "POST", JSON.stringify(body));
}
```

- [ ] **Step 3: Type-check the change**

Run: `pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'`
Expected: nothing. (`queryPokemon.ts` already builds a body literal matching `PokemonScanBody`; `pokestopApiMapper.ts` already accepts strings via `blobToString`.)

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
		const great = { pokemon: 26, form: 0, cap: 50, value: 1, level: 20, cp: 1490, percentage: 0.9, rank: 3 };
		const ultra = { pokemon: 26, form: 0, cap: 51, value: 2, level: 40, cp: 2490, percentage: 0.8, rank: 7 };
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

describe("describeGrpcError", () => {
	it("renders the status name and details", () => {
		const err = Object.assign(new Error("boom"), { code: status.UNAVAILABLE, details: "connect failed" });
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
	GolbatPokestopResult,
	GolbatStationResult,
	GymScanResponse,
	PokemonResponse,
	PokestopScanResponse,
	StationScanResponse
} from "@/lib/server/api/golbatApi";
import type { FortScanBody, PokemonScanBody } from "@/lib/server/queryMapObjects/queries";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { Incident } from "@/lib/types/mapObjectData/pokestop";
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
	// Same native shape the HTTP API sends; mapGym/prepare() take it from there.
	if (defenders_json !== undefined) gym.defenders = JSON.parse(defenders_json);
	if (rsvps_json !== undefined) gym.rsvps = JSON.parse(rsvps_json);
	return gym;
}

export function fromGymScanResponse(res: pb.GymScanResponse): GymScanResponse {
	return {
		gyms: (res.gyms ?? []).map(fromGym),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false
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
	// JSON text, exactly what SQL delivers; mapPokestop's blobToString passes strings through.
	if (quest_rewards_json !== undefined) stop.quest_rewards = quest_rewards_json;
	if (alternative_quest_rewards_json !== undefined)
		stop.alternative_quest_rewards = alternative_quest_rewards_json;
	if (showcase_focus_json !== undefined) stop.showcase_focus = showcase_focus_json;
	if (showcase_rankings_json !== undefined) stop.showcase_rankings = showcase_rankings_json;
	if (invasions?.length) stop.invasions = invasions as Incident[];
	return stop;
}

export function fromPokestopScanResponse(res: pb.PokestopScanResponse): PokestopScanResponse {
	return {
		pokestops: (res.pokestops ?? []).map(fromPokestop),
		examined: res.examined ?? 0,
		skipped: res.skipped ?? 0,
		total: res.total ?? 0,
		limit_reached: res.limit_reached ?? false
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
		limit_reached: res.limit_reached ?? false
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
		limit_reached: res.limit_reached ?? false
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
- `rest as GolbatGymResult` (and the pokestop/station/pokemon casts) are plain assertions. If the type-check reports TS2352 ("neither type sufficiently overlaps") on one of them, the error names the offending property; destructure it out like `enabled` is for pokestops and convert explicitly. Do not switch to `as unknown as`.
- `rankings.little` relies on `PokemonData["pvp"]` having keys `"little" | "great" | "ultra"` (the `League` enum's string values). If TS rejects the property name, write `rankings["little" as League.LITTLE]` with `import type { League } from "@/lib/utils/pokemonUtils"` (type-only import is fine).

- [ ] **Step 7: Run the tests**

Run: `pnpm test src/lib/server/api/golbatGrpcMapping.test.ts`
Expected: 14 passed.

- [ ] **Step 8: Gates**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'; pnpm exec prettier --check src/lib/server/queryMapObjects/queries.d.ts src/lib/server/api/golbatApi.ts src/lib/server/api/golbatGrpcMapping.ts src/lib/server/api/golbatGrpcMapping.test.ts`
Expected: tests green, grep prints nothing, prettier passes.

- [ ] **Step 9: Commit**

```bash
git add src/lib/server/queryMapObjects/queries.d.ts src/lib/server/api/golbatApi.ts src/lib/server/api/golbatGrpcMapping.ts src/lib/server/api/golbatGrpcMapping.test.ts
git commit -m "feat: map golbat grpc messages to the http scan types"
```

---

### Task 3: gRPC client module, fallback helper, wire test

**Files:**
- Create: `src/lib/server/api/golbatGrpc.ts`
- Create: `src/lib/server/api/golbatGrpc.test.ts`

**Interfaces:**
- Consumes: Task 1 generated client; Task 2 mapping functions and `PokemonScanBody`; `getServerConfig().golbat.grpc` / `.secret`.
- Produces:
  ```ts
  export function isGrpcEnabled(): boolean
  export function grpcScanGyms(body: FortScanBody): Promise<GymScanResponse>
  export function grpcScanPokestops(body: FortScanBody): Promise<PokestopScanResponse>
  export function grpcScanStations(body: FortScanBody): Promise<StationScanResponse>
  export function grpcScanPokemon(body: PokemonScanBody): Promise<PokemonResponse>
  export function scanViaGrpcOrHttp<Body, Res>(
  	name: string,
  	body: Body,
  	grpcScan: (body: Body) => Promise<Res>,
  	httpScan: (body: Body) => Promise<Res | undefined>
  ): Promise<Res | undefined>
  ```
  The four scan functions reject with the grpc-js `ServiceError` (has `.code`) on failure. `scanViaGrpcOrHttp` never throws for gRPC errors (it logs and falls through); it does not catch `httpScan` errors.

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

// golbatGrpc.ts reads the config object once at import and its fields per call, so mutating
// this hoisted object after the server binds is enough to point the client at it.
const golbatConfig = vi.hoisted(() => ({
	url: "http://127.0.0.1:1",
	secret: "topsecret",
	grpc: "" as string | undefined
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ golbat: golbatConfig })
}));

import { grpcScanGyms, isGrpcEnabled, scanViaGrpcOrHttp } from "./golbatGrpc";

let server: Server;
let received: { metadata: Metadata; request: FortScanRequest } | undefined;
let respondWith: "ok" | "unauthenticated" = "ok";

const unimplemented = (_call: unknown, callback: (err: { code: status }) => void) =>
	callback({ code: status.UNIMPLEMENTED });

const fortBody = {
	min: { latitude: 51.5, longitude: -0.2 },
	max: { latitude: 51.6, longitude: -0.1 },
	limit: 11,
	filters: [{ raid_level: [5] }]
};

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
		const res = await grpcScanGyms(fortBody);

		expect(received?.metadata.get("x-golbat-secret")).toEqual(["topsecret"]);
		expect(received?.request.min).toEqual({ lat: 51.5, lon: -0.2 });
		expect(received?.request.max).toEqual({ lat: 51.6, lon: -0.1 });
		expect(received?.request.limit).toBe(11);
		expect(received?.request.with_incidents).toBe(false);
		expect(received?.request.filters).toHaveLength(1);
		expect(received?.request.filters?.[0].raid_level).toEqual([5]);
		expect(received?.request.filters?.[0].team_id).toEqual([]);

		expect(res.examined).toBe(1);
		expect(res.limit_reached).toBe(false);
		expect(res.gyms).toHaveLength(1);
		expect(res.gyms[0].id).toBe("g1");
		expect(res.gyms[0].available_slots).toBe(4);
		expect(res.gyms[0].defenders).toEqual([{ pokemon_id: 25, form: 0 }]);
		expect(res.gyms[0].rsvps).toEqual([]);
		expect(res.gyms[0]).not.toHaveProperty("cell_id");
	});

	it("rejects with the grpc status code on error", async () => {
		respondWith = "unauthenticated";
		await expect(grpcScanGyms(fortBody)).rejects.toMatchObject({ code: status.UNAUTHENTICATED });
	});
});

describe("scanViaGrpcOrHttp", () => {
	it("returns the grpc result without touching http when grpc succeeds", async () => {
		const http = vi.fn();
		const res = await scanViaGrpcOrHttp("gym", fortBody, grpcScanGyms, http);
		expect(res?.gyms[0].id).toBe("g1");
		expect(http).not.toHaveBeenCalled();
	});

	it("falls back to http with the same body when grpc fails", async () => {
		respondWith = "unauthenticated";
		const http = vi.fn().mockResolvedValue({ gyms: [], examined: 0, skipped: 0, total: 0, limit_reached: false });
		const res = await scanViaGrpcOrHttp("gym", fortBody, grpcScanGyms, http);
		expect(http).toHaveBeenCalledWith(fortBody);
		expect(res).toEqual({ gyms: [], examined: 0, skipped: 0, total: 0, limit_reached: false });
	});

	it("goes straight to http when grpc is not configured", async () => {
		const saved = golbatConfig.grpc;
		golbatConfig.grpc = undefined;
		try {
			const grpc = vi.fn();
			const http = vi.fn().mockResolvedValue(undefined);
			expect(isGrpcEnabled()).toBe(false);
			const res = await scanViaGrpcOrHttp("gym", fortBody, grpc, http);
			expect(grpc).not.toHaveBeenCalled();
			expect(http).toHaveBeenCalledWith(fortBody);
			expect(res).toBeUndefined();
		} finally {
			golbatConfig.grpc = saved;
		}
	});
});
```

Note on `received.request.filters[0].team_id` being `[]`: the server decodes the wire bytes with the generated `FortDnfFilter.decode`, whose base object initialises every `repeated` field to `[]`. If that assertion alone fails, check `createBaseFortDnfFilter` in `golbat_api.ts` and adjust; `raid_level`, the bounds and the limit are the substantive assertions.

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
	describeGrpcError,
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

/**
 * The one place that chooses the transport: gRPC when configured, falling through to HTTP on
 * any gRPC error. HTTP errors are the caller's (they already fall back to SQL or 500).
 */
export async function scanViaGrpcOrHttp<Body, Res>(
	name: string,
	body: Body,
	grpcScan: (body: Body) => Promise<Res>,
	httpScan: (body: Body) => Promise<Res | undefined>
): Promise<Res | undefined> {
	if (isGrpcEnabled()) {
		try {
			return await grpcScan(body);
		} catch (err) {
			log.warning("[%s] gRPC scan failed (%s), falling back to HTTP", name, describeGrpcError(err));
		}
	}
	return httpScan(body);
}
```

- [ ] **Step 4: Run the wire test**

Run: `pnpm test src/lib/server/api/golbatGrpc.test.ts`
Expected: 6 passed, no stray warnings in the output (grpc-js logs nothing at default verbosity).

- [ ] **Step 5: Gates**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'; pnpm exec prettier --check src/lib/server/api/golbatGrpc.ts src/lib/server/api/golbatGrpc.test.ts`
Expected: tests green, grep prints nothing, prettier passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/api/golbatGrpc.ts src/lib/server/api/golbatGrpc.test.ts
git commit -m "feat: golbat grpc client for fort and pokemon scans"
```

---

### Task 4: Route the three fort query classes through the helper

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryGymApi.ts` (imports; `query()` lines 41-50)
- Modify: `src/lib/server/queryMapObjects/queryPokestopApi.ts` (imports; `query()` lines 34-45)
- Modify: `src/lib/server/queryMapObjects/queryStationApi.ts` (imports; `query()` lines 51-60)

**Interfaces:**
- Consumes: `scanViaGrpcOrHttp`, `grpcScanGyms`, `grpcScanPokestops`, `grpcScanStations` from Task 3.
- Produces: no new exports. Behaviour with `grpc` unset is unchanged; the existing `fortAdapters.test.ts` (which spies on the `golbatApi` scan functions) must keep passing untouched.

No new test: the transport choice is tested in Task 3 and the classes' HTTP behaviour in the existing `fortAdapters.test.ts`. The diff is one call replaced per class.

- [ ] **Step 1: Gym**

In `queryGymApi.ts`, add the import:

```ts
import { grpcScanGyms, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
```

Replace, inside `query()`,

```ts
		try {
			result = await scanGyms({
				min: { latitude: bounds.minLat, longitude: bounds.minLon },
				max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
				limit: getFortApiScanLimit(actualLimit + 1),
				filters: buildGymDnfFilters(filter)
			});
		} catch (err) {
```

with

```ts
		try {
			result = await scanViaGrpcOrHttp(
				"gym",
				{
					min: { latitude: bounds.minLat, longitude: bounds.minLon },
					max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
					limit: getFortApiScanLimit(actualLimit + 1),
					filters: buildGymDnfFilters(filter)
				},
				grpcScanGyms,
				scanGyms
			);
		} catch (err) {
```

Everything else in the file stays as it is (`scanGyms` remains imported and used).

- [ ] **Step 2: Pokestop**

In `queryPokestopApi.ts`, add the import:

```ts
import { grpcScanPokestops, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
```

Replace, inside `query()`,

```ts
		try {
			result = await scanPokestops({
				min: { latitude: bounds.minLat, longitude: bounds.minLon },
				max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
				limit: getFortApiScanLimit(actualLimit + 1),
				filters: dnf,
				with_incidents: true
			});
		} catch (err) {
```

with

```ts
		try {
			result = await scanViaGrpcOrHttp(
				"pokestop",
				{
					min: { latitude: bounds.minLat, longitude: bounds.minLon },
					max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
					limit: getFortApiScanLimit(actualLimit + 1),
					filters: dnf,
					with_incidents: true
				},
				grpcScanPokestops,
				scanPokestops
			);
		} catch (err) {
```

- [ ] **Step 3: Station**

In `queryStationApi.ts`, add the import:

```ts
import { grpcScanStations, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
```

Replace, inside `query()`,

```ts
		try {
			result = await scanStations({
				min: { latitude: bounds.minLat, longitude: bounds.minLon },
				max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
				limit: getFortApiScanLimit(actualLimit + 1),
				filters: buildStationDnfFilters(filter)
			});
		} catch (err) {
```

with

```ts
		try {
			result = await scanViaGrpcOrHttp(
				"station",
				{
					min: { latitude: bounds.minLat, longitude: bounds.minLon },
					max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
					limit: getFortApiScanLimit(actualLimit + 1),
					filters: buildStationDnfFilters(filter)
				},
				grpcScanStations,
				scanStations
			);
		} catch (err) {
```

- [ ] **Step 4: Gates**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'; pnpm exec prettier --check src/lib/server/queryMapObjects/queryGymApi.ts src/lib/server/queryMapObjects/queryPokestopApi.ts src/lib/server/queryMapObjects/queryStationApi.ts`
Expected: tests green including `fortAdapters.test.ts`, grep prints nothing, prettier passes. If a type error names the body literal, the literal no longer matches `FortScanBody`; compare against `queries.d.ts` rather than loosening types.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/queryMapObjects/queryGymApi.ts src/lib/server/queryMapObjects/queryPokestopApi.ts src/lib/server/queryMapObjects/queryStationApi.ts
git commit -m "feat: fort map scans via golbat grpc with http and sql fallback"
```

---

### Task 5: Route the pokemon query through the helper

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryPokemon.ts` (imports; `query()` lines 40-47)

**Interfaces:**
- Consumes: `scanViaGrpcOrHttp`, `grpcScanPokemon` from Task 3; `PokemonScanBody` from Task 2.
- Produces: no new exports. Behaviour: gRPC → HTTP → `error(500)`.

- [ ] **Step 1: Edit `queryPokemon.ts`**

Add the import:

```ts
import { grpcScanPokemon, scanViaGrpcOrHttp } from "@/lib/server/api/golbatGrpc";
```

Extend the `queries` type import:

```ts
import type {
	GolbatPokemonQuery,
	GolbatPokemonSpecies,
	PokemonScanBody
} from "@/lib/server/queryMapObjects/queries";
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

		const result = await scanViaGrpcOrHttp("pokemon", body, grpcScanPokemon, getMultiplePokemon);
```

The rest of `query()` (`if (result) { ... } error(500);`) is unchanged.

- [ ] **Step 2: Gates**

Run: `pnpm test && pnpm run check 2>&1 | grep -E '"(src/lib/server|src/lib/services/config|proto)/'; pnpm exec prettier --check src/lib/server/queryMapObjects/queryPokemon.ts`
Expected: tests green, grep prints nothing, prettier passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/queryMapObjects/queryPokemon.ts
git commit -m "feat: pokemon map scans via golbat grpc with http fallback"
```

---

### Task 6: Documentation, config example, manual verification

**Files:**
- Modify: `config/config.example.toml:5-10`
- Modify: `docs/src/content/docs/reference/configuration.md:26-43`
- Modify: `CLAUDE.md` (Commands list after line 17; Source Organization after line 52)

- [ ] **Step 1: Config example**

Change the `[server.golbat]` block in `config/config.example.toml` to:

```toml
[server.golbat]
url = "http://127.0.0.1:9001"
secret = ""
# Optional. Golbat's grpc_port target. When set, map scans use gRPC (same secret), falling back to HTTP.
# grpc = "127.0.0.1:50001"

# This can be configured in Fletchling. Match the string to its config
defaultNestName = "Unknown Nest"
```

- [ ] **Step 2: Configuration reference**

In `docs/src/content/docs/reference/configuration.md`, replace the `server.golbat` section (from `## \`server.golbat\`` up to, not including, `## \`server.dragonite\``) with:

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
- `grpc`: Optional. Golbat's gRPC target (`host:port`), see below
- `defaultNestName`: The default nest name, as configured in Fletchling

### Golbat Fort API

It's recommended to enable in-memory forts in Golbat
(Golbat Config -> `fort_in_memory = true` + optional `preload = true`).
Diadem will then serve pokestops, gyms and stations from Golbat direclty, instead of having to go through the database.

### Golbat gRPC API

When your Golbat serves the `GolbatApi` gRPC service (Golbat `feat/grpc-api` or later, with `grpc_port` set in Golbat's config), set `grpc` to that `host:port`. Diadem then runs gym, pokéstop, station and pokémon map scans over gRPC with protobuf encoding, which is markedly cheaper than the JSON HTTP API on large responses. The same `secret` is sent as the `x-golbat-secret` metadata, so no extra Golbat configuration is needed beyond `grpc_port`.

Gym, pokéstop and station scans still require in-memory forts as above; gRPC only changes the transport. By-id lookups, search and availability stay on HTTP.

If a gRPC call fails for any reason (Golbat down, wrong secret, `fort_in_memory` off, timeout), Diadem logs a warning and falls back to the HTTP API for that request, and for forts to SQL after that, so the map keeps working. Unset `grpc` to compare against the HTTP path; per-request timings are logged at debug level on both transports.

The gRPC connection is plaintext. Keep it on a private network, as with Golbat's HTTP port.

````

- [ ] **Step 3: CLAUDE.md**

In the Commands list, after the `- **DB studio:** \`pnpm run db:studio\`` line, add:

```markdown
- **Regenerate gRPC client:** `pnpm run grpc:generate` — after updating `proto/golbat_api.proto` from Golbat's `grpc/api.proto`; commit the regenerated `src/lib/server/api/grpc/golbat_api.ts`
```

In Source Organization, after the `src/lib/server/` line, add:

```markdown
- `src/lib/server/api/grpc/` — ts-proto generated Golbat gRPC client (never hand-edit); `golbatGrpc.ts` wraps it, `golbatGrpcMapping.ts` converts to/from the HTTP scan types
```

- [ ] **Step 4: Gates and commit**

Run: `pnpm test && pnpm exec prettier --check config/config.example.toml`
Expected: green (markdown is prettier-ignored).

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

**Spec coverage:** §2 config → Task 1 step 7, Task 6. §3 codegen, options, deps, jstype → Task 1. §4 client, deadline, metadata, timing log, `scanViaGrpcOrHttp` → Task 3. §5.1/§5.2 mapping incl. gym JSON.parse, pokestop strings, dropped fields, pvp keys, envelope defaults → Task 2. §6 query classes → Tasks 4, 5. §7 error rendering incl. auth hint → Task 2 (`describeGrpcError`), used by Task 3's helper. §8 tests: generated smoke (Task 1), mapping unit (Task 2), wire incl. metadata, error code and helper fallback (Task 3), manual (Task 6). §9 docs → Task 6.

**Type consistency:** `PokemonScanBody` defined in Task 2 step 1, used in Tasks 2, 3, 5. `FortScanBody` pre-exists. `GymScanResponse` etc. pre-exist in `golbatApi.ts` with required `limit_reached: boolean`, which the Task 2 mappers default to `false`. `scanViaGrpcOrHttp` signature identical in Task 3 code, Task 3 interfaces, Tasks 4 and 5 call sites. Logger method is `warning`. `describeGrpcError` lives in `golbatGrpcMapping.ts` and is only imported by `golbatGrpc.ts`.
