# Golbat gRPC API for map scans — design

**Date:** 2026-09-09 (revised same day after rebasing onto the author's updates)
**Status:** Approved
**Branch:** `feat/golbat-fort-api`, on top of `jfberry/feat/golbat-fort-api` at `239bfb5`
**Golbat counterpart:** UnownHash/Golbat `feat/grpc-api`, commit `8f10ee9`
(`grpc/api.proto`, service `golbat_api.GolbatApi`)

## 1. Context and goals

The HTTP fort API on this branch works but measured slower than the direct SQL route. The
suspected cost is JSON encoding in Golbat and decoding in Diadem on large scan responses, not
the spatial scan itself. Golbat now exposes the same scans over gRPC with protobuf
serialisation. A micro-benchmark on realistic scan responses (1500 gyms, 3000 pokestops, 3000
pokemon with PVP) measured Diadem-side decode at 5 to 8x faster than `JSON.parse` with ts-proto
generated decoders, and payloads 3 to 14x smaller on the wire.

### Goals

1. Gym, pokestop, station and pokemon map scans go over gRPC when configured, with the same
   filtering, permission handling and result shapes as today.
2. The HTTP path stays fully functional and is the fallback, so the two transports can be
   compared in production by flipping one config key.
3. Per-call timing logs use the same format on both transports so they compare directly.

### Non-goals

- By-id lookups (`api/gym/id`, `api/pokestop/id`, `api/station/id`, `api/pokemon/id`),
  fort availability, Golbat status and gym search. Golbat's gRPC service does not expose them;
  they stay on HTTP.
- The combined `ScanForts` RPC. Diadem issues one query per map object type and keeps doing so.
- TLS. Golbat's gRPC server is plaintext; the docs tell operators to keep it on a private network.
- Streaming, retries, or connection pooling beyond grpc-js defaults.

## 2. Configuration

One new optional key under `[server.golbat]`:

```toml
[server.golbat]
url = "http://127.0.0.1:9001"
secret = ""
grpc = "127.0.0.1:50001"   # optional; Golbat's grpc_port
```

- `ServerConfig.golbat.grpc?: string` in `src/lib/services/config/configTypes.d.ts`.
- When set, scans use gRPC (§5). When unset, behaviour is byte-for-byte today's.
- The gRPC calls send `server.golbat.secret` as `x-golbat-secret` metadata. Golbat checks it
  against the same `api_secret` the HTTP `X-Golbat-Secret` header uses. No new secret.
- The value is a bare `host:port` target as grpc-js expects, not a URL.

## 3. Code generation and dependencies

| Item | Location / value |
|---|---|
| Proto source | `proto/golbat_api.proto`, copied verbatim from Golbat, two-line provenance header |
| Generator config | `buf.gen.yaml` at repo root |
| Script | `pnpm run grpc:generate` → `buf generate` |
| Generated output | `src/lib/server/api/grpc/golbat_api.ts`, committed, listed in `.prettierignore` |
| Runtime deps | `@grpc/grpc-js`, `@bufbuild/protobuf` (ts-proto 2.x generates against its `wire` reader/writer) |
| Dev deps | `ts-proto`, `@bufbuild/buf` (ships the `buf` binary; no system `protoc`) |

The repo pins pnpm 11 (`packageManager` in `package.json`); build-script permissions live in
`pnpm-workspace.yaml` under `allowBuilds`.

ts-proto options, all required:

| Option | Why |
|---|---|
| `forceLong=number` | int64 fields decode to JS numbers. Every int64 Diadem uses is a timestamp or count well under 2^53. |
| `useOptionals=all` | Every field is `?: T \| undefined`; unset proto3 `optional` fields are absent, matching the JSON API's omitted fields. Non-optional scalars decode to their proto3 zero value, as in JSON. |
| `snakeToCamel=false` | Field names stay snake_case, matching the JSON API and every Diadem type and mapper. |
| `useJsTypeOverride=true` | Honours `[jstype = JS_STRING]` so 64-bit id fields decode as strings. |
| `outputServices=grpc-js` | Emits `GolbatApiClient`, `GolbatApiService` and `GolbatApiServer` used by the client and the wire test. |
| `esModuleInterop=true` | Matches `tsconfig.json`. |

**64-bit ids.** Encounter ids, spawn ids, S2 cell ids and battle seeds use the full 64 bits, so
decoding them as `Number` corrupts them. Golbat commit `8f10ee9` marks those fields
`[jstype = JS_STRING]`: `Pokemon.id`, `Pokemon.spawn_id`, `Pokemon.cell_id`,
`GetPokemonRequest.encounter_ids`, `Gym.cell_id`, `Pokestop.cell_id`, `Station.cell_id`,
`StationBattle.bread_battle_seed`. `jstype` is a code generation hint only; the wire encoding is
unchanged, and with `useJsTypeOverride=true` the generated decoder returns exact decimal strings.
Verified during design against a value near 2^64. `Pokemon.id` is the string Diadem already
uses. Diadem reads none of the others from scan results, so the mappers drop them (§5.2) rather
than widen the existing numeric types.

Regeneration is manual: when the Golbat proto changes, copy it in, run `pnpm run grpc:generate`,
commit both. Ordinary builds never run the generator.

## 4. gRPC client module

New `src/lib/server/api/golbatGrpc.ts`, sibling of `golbatApi.ts`.

- `isGrpcEnabled(): boolean` — true when `config.golbat.grpc` is set. Read per call, not cached.
- One `GolbatApiClient` created lazily on first call with `credentials.createInsecure()` and
  keepalive channel options (`grpc.keepalive_time_ms`, `grpc.keepalive_permit_without_calls`).
  grpc-js reconnects on its own; no reconnect logic in Diadem.
- Metadata built per call: `x-golbat-secret` set when `config.golbat.secret` is non-empty.
- Four exported scan functions, each taking the same request type the HTTP function takes and
  returning the same response type the HTTP function returns:

  | Function | RPC | Request type | Response type |
  |---|---|---|---|
  | `grpcScanGyms` | `ScanGyms` | `FortScanBody` | `GymScanResponse` |
  | `grpcScanPokestops` | `ScanPokestops` | `FortScanBody` | `PokestopScanResponse` |
  | `grpcScanStations` | `ScanStations` | `FortScanBody` | `StationScanResponse` |
  | `grpcScanPokemon` | `ScanPokemon` | `PokemonScanBody` | `PokemonResponse` |

- Each call: convert request (§5.1), invoke with a 30 second deadline, convert response (§5.2),
  log `"[ScanGyms] Request took %fms"` at debug in the same format as `callGolbat` so HTTP and
  gRPC timings compare in the same log stream. Errors are thrown as the grpc-js `ServiceError`
  (its `code` is the gRPC status code).
- One shared fallback helper, used by all four query classes so the transport choice exists in
  exactly one place:

  ```ts
  export async function scanViaGrpcOrHttp<Body, Res>(
  	name: string,
  	body: Body,
  	grpcScan: (body: Body) => Promise<Res>,
  	httpScan: (body: Body) => Promise<Res | undefined>
  ): Promise<Res | undefined>
  ```

  When gRPC is enabled it calls `grpcScan`; on any error it logs a warning with
  `describeGrpcError` and continues to `httpScan`. When gRPC is disabled it calls `httpScan`
  directly. It never catches HTTP errors; the query classes keep their existing HTTP error
  handling.
- Callback promisification is done by hand in this module. No nice-grpc.

## 5. Mapping

Mapping lives in `golbatGrpcMapping.ts`, a sibling of `golbatGrpc.ts`, as pure functions with
no config or channel dependency so they unit test in isolation. It must not import
`pokemonUtils` at runtime (that module pulls in Svelte-only state); League keys are written as
their literal strings. The query classes see one record shape regardless of transport.

### 5.1 Requests

**Forts.** `FortScanBody` → `FortScanRequest`:

- `min/max: { latitude, longitude }` → `LatLon { lat, lon }`.
- `limit` unchanged (the query classes already apply `getFortApiScanLimit`).
- `filters?: GolbatFortDnfFilter[]` → `filters: FortDnfFilter[]`. Field names already match one
  for one, including `contest_focus` and `contest_ranking_standard`. `{ min, max }` ranges become
  `IntRange`. Omitted `filters` becomes `[]`, which the proto defines as "every fort of the
  requested type", the same as the JSON omission.
- `with_incidents` unchanged, defaulting to `false`.

`fortDnf.ts` is not modified.

**Pokemon.** `PokemonScanBody` (new type: `{ min, max, limit, filters: GolbatPokemonQuery[] }`)
→ `PokemonScanRequest`:

- `pokemon[].id` → `pokemon_id`; `form` unchanged when present.
- The MinMax fields (`iv`, `atk_iv`, `def_iv`, `sta_iv`, `level`, `cp`, `size`, `pvp_little`,
  `pvp_great`, `pvp_ultra`) → `IntRange`. `gender` list unchanged.
- The existing "one clause with empty `pokemon` list matches every pokemon" convention in
  `buildGolbatQueries` carries over unchanged; the proto has the same semantics.

### 5.2 Responses

Every decoded object is spread through as-is, then the fields below are renamed or converted.
Unset optionals arrive as `undefined`, matching the JSON API's omitted fields. The target types
are the existing HTTP result types in `golbatApi.ts`, so the existing `mapGym`, `mapPokestop`
(`pokestopApiMapper.ts`) and `mapStation` run unchanged afterwards.

**Gym** (`Gym` → `GolbatGymResult`):

| Proto field | Mapped to | Note |
|---|---|---|
| `defenders_json` | `defenders` via `JSON.parse` | Same native shape the HTTP API sends; `mapGym` passes it through and `GymQuery.prepare()` normalises forms |
| `rsvps_json` | `rsvps` via `JSON.parse` | Same |
| `guarding_pokemon_display_json`, `cell_id` | dropped | Never read |
| `deleted` (bool) | passed through | `mapGym` converts to 0/1 |

**Pokestop** (`Pokestop` → `GolbatPokestopResult`):

| Proto field | Mapped to |
|---|---|
| `quest_rewards_json` | `quest_rewards` (JSON text; `blobToString` passes strings through) |
| `alternative_quest_rewards_json` | `alternative_quest_rewards` |
| `showcase_focus_json` | `showcase_focus` |
| `showcase_rankings_json` | `showcase_rankings` |
| `enabled` (bool) | `enabled` as 0/1 (`PokestopData.enabled` is numeric) |
| `quest_conditions_json`, `alternative_quest_conditions_json`, `cell_id` | dropped |
| `invasions` | passed through when non-empty; `mapPokestop` renames to `incident` |

`GolbatPokestopResult.quest_rewards` and `alternative_quest_rewards` widen from
`object[] | null` to `object[] | string | null`; the other two already accept strings.

**Station** (`Station` → `GolbatStationResult`):

| Proto field | Mapped to |
|---|---|
| `stationed_pokemon_json` | `stationed_pokemon` (string; the type already accepts it, `mapStation` runs `blobToString`) |
| `battles`, `cell_id` | dropped (`mapStation` would drop `battles` anyway) |
| `is_inactive`, `is_battle_available` (bool) | passed through; `mapStation` converts to 0/1 |

**Pokemon** (`Pokemon` → `MinMapObject<PokemonData>` as `getMultiplePokemon` returns it):

| Proto field | Mapped to |
|---|---|
| `id` (string per §3) | unchanged |
| `spawn_id`, `cell_id` (strings per §3) | dropped; `makePokemon` never copies them |
| `pvp { little, great, ultra }` | `pvp` keyed by `"little"` / `"great"` / `"ultra"` (the `League` enum's values); a league with no entries is omitted, and `pvp` is omitted when every league is empty |
| `capture_1..3`, `is_event`, `username` | passed through; `makePokemon` ignores them as today |

`PvpEntry` field names (`pokemon`, `form`, `cap`, `value`, `level`, `cp`, `percentage`, `rank`,
`capped`, `evolution`) already match `PvpStats`.

The scan response envelopes (`examined`, `skipped`, `total`, `limit_reached`) pass through, with
missing counts as 0 and missing `limit_reached` as false.

## 6. Query class changes

`ApiGymQuery`, `ApiPokestopQuery`, `ApiStationQuery` and `PokemonQuery` each replace their direct
HTTP call with `scanViaGrpcOrHttp`, passing the same body they build today, the gRPC function
and the HTTP function. Shape, using gyms:

```ts
let result: GymScanResponse | undefined;
try {
	result = await scanViaGrpcOrHttp("gym", body, grpcScanGyms, scanGyms);
} catch (err) {
	log.debug("Fort gym scan failed, falling back to SQL: %s", err);   // existing
}
if (!result || result.limit_reached) return super.query(...);          // existing
```

- Everything after the call (`limit_reached` → SQL, `since`, polygon, `deleted`) is unchanged.
- `PokemonQuery` has no SQL fallback: `result = await scanViaGrpcOrHttp("pokemon", body,
  grpcScanPokemon, getMultiplePokemon)`; an undefined result still hits `error(500)`.
- `describeGrpcError` renders the status name (`UNAUTHENTICATED`, `FAILED_PRECONDITION`,
  `DEADLINE_EXCEEDED`, `UNAVAILABLE`, …) and appends a hint about `server.golbat.secret` on
  `UNAUTHENTICATED`, so a wrong secret or `fort_in_memory = false` is obvious in the log.
- Fort API detection (`golbatFortApi.ts`, HTTP `api/status` + `api/fort/available`) is unchanged.
  gRPC fort scans only run when detection already selected the `Api*Query` classes. If Golbat's
  `fort_in_memory` is off the RPC returns `FailedPrecondition`, which falls through to HTTP and
  then SQL, the same chain as today.
- Query registry selection in `queryMapObjects.ts` is unchanged.

## 7. Errors and logging

| Condition | Behaviour |
|---|---|
| `grpc` unset | `isGrpcEnabled()` false; no client is created; no gRPC code runs |
| Golbat unreachable, deadline exceeded, connection reset | Warn once per call with the status name; fall back to HTTP |
| `UNAUTHENTICATED` | Warn with the secret hint; fall back to HTTP (which will also fail) |
| `FAILED_PRECONDITION` (forts, `fort_in_memory` off) | Warn; fall back to HTTP then SQL |
| Response mapping throws (e.g. malformed `_json`) | Propagates as a gRPC-path error; fall back to HTTP |

No caching, no circuit breaker: a Golbat outage already degrades HTTP the same way, and the
per-call fallback keeps the map working.

## 8. Testing

**Generated code smoke (`src/lib/server/api/grpc/generated.test.ts`):** encode/decode a `Gym`
and assert snake_case keys, numeric int64, absent optionals; encode/decode a pokemon with a
near-2^64 id and assert the exact string comes back.

**Mapping unit (`src/lib/server/api/golbatGrpcMapping.test.ts`):**

- Request mapping: `FortScanBody` → `FortScanRequest` with and without filters, `with_incidents`;
  `PokemonScanBody` → `PokemonScanRequest` covering `id` → `pokemon_id`, form present/absent,
  MinMax fields, gender list, and the empty-pokemon catch-all clause.
- Response mapping: populated `Gym`/`Pokestop`/`Station`/`Pokemon` messages and
  all-optionals-unset messages, asserting the renames and parses in §5.2, dropped fields absent,
  pvp keyed by league with empty leagues omitted, envelope defaults.
- `describeGrpcError`: status name + details, the auth hint, non-gRPC errors.

**Wire (`src/lib/server/api/golbatGrpc.test.ts`):** start an in-process grpc-js `Server` on
`127.0.0.1:0` with `GolbatApiService` and a stub `ScanGyms` handler that records incoming
metadata and returns one populated gym. Point the client at it via a mocked config, call
`grpcScanGyms`, assert `x-golbat-secret` arrived and the returned object matches §5.2. A second
case makes the handler return `UNAUTHENTICATED` and asserts the thrown error's `code`. Two more
cases cover `scanViaGrpcOrHttp`: gRPC failing → the HTTP function is called with the same body and
its result returned; gRPC disabled → the gRPC function is never called.

Tests follow the existing conventions (`golbatFortApi.test.ts` for `vi.hoisted` config/module
mocks, `fortAdapters.test.ts` for spying on `golbatApi` exports). The existing
`fortAdapters.test.ts` keeps exercising the HTTP path through the query classes, since its mocked
config has no `grpc` key.

**Manual:** run against Golbat `feat/grpc-api` with `grpc` set and unset, compare the
`Request took` debug lines for the same viewport on both transports.

**Gates:** `pnpm test` fully green. `pnpm run check` and `pnpm run lint` have pre-existing
failures on this branch in UI components from the upstream merge (15 type errors, 4 unformatted
Svelte files, none in files this work touches); the gate is no new failures in any file this work
creates or modifies.

## 9. Documentation

- `docs/src/content/docs/reference/configuration.md`, `server.golbat`: add `grpc` to the example
  and key list; a short "Golbat gRPC API" subsection after the existing "Golbat Fort API" one
  stating the prerequisite (Golbat with the gRPC API and `grpc_port` set), that the secret is
  shared, that the connection is plaintext and should stay on a private network, and that HTTP
  is the automatic fallback.
- `config/config.example.toml`: the commented `grpc` line.
- `CLAUDE.md`: `pnpm run grpc:generate` in the commands list with a note to regenerate and
  commit when `proto/golbat_api.proto` changes; `src/lib/server/api/grpc/` in the source layout.

## 10. Files

| File | Change |
|---|---|
| `proto/golbat_api.proto` | new, copied from Golbat |
| `buf.gen.yaml` | new |
| `package.json`, `pnpm-lock.yaml` | deps, `grpc:generate` script |
| `.prettierignore` | generated directory |
| `src/lib/server/api/grpc/golbat_api.ts` | generated |
| `src/lib/server/api/grpc/generated.test.ts` | smoke test |
| `src/lib/services/config/configTypes.d.ts` | `golbat.grpc?` |
| `src/lib/server/queryMapObjects/queries.d.ts` | `PokemonScanBody` |
| `src/lib/server/api/golbatApi.ts` | `getMultiplePokemon` typed; pokestop quest reward fields accept strings |
| `src/lib/server/api/golbatGrpcMapping.ts` | new: request/response mapping, `describeGrpcError` |
| `src/lib/server/api/golbatGrpcMapping.test.ts` | mapping unit tests |
| `src/lib/server/api/golbatGrpc.ts` | new: client, four calls, `scanViaGrpcOrHttp` |
| `src/lib/server/api/golbatGrpc.test.ts` | wire test |
| `src/lib/server/queryMapObjects/queryGymApi.ts`, `queryPokestopApi.ts`, `queryStationApi.ts`, `queryPokemon.ts` | call through `scanViaGrpcOrHttp` |
| `config/config.example.toml`, docs, `CLAUDE.md` | §9 |
