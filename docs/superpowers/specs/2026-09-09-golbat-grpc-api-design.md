# Golbat gRPC API for map scans — design

**Date:** 2026-09-09
**Status:** Approved in discussion; spec pending review
**Branch:** `feat/golbat-fort-api` (builds on the HTTP fort API work already on the branch)
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
4. Fix the latent HTTP pokestop bug found during design (§7) since HTTP remains the fallback.

### Non-goals

- By-id lookups (`api/gym/id`, `api/pokestop/id`, `api/station/id`, `api/pokemon/id`),
  fort availability (`api/fort/available`) and gym search. Golbat's gRPC service does not expose
  them; they stay on HTTP.
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
| Proto source | `proto/golbat_api.proto`, copied verbatim from Golbat, header comment recording the Golbat commit |
| Generator config | `buf.gen.yaml` at repo root |
| Script | `pnpm run grpc:generate` → `buf generate` |
| Generated output | `src/lib/server/api/grpc/golbat_api.ts`, committed, listed in `.prettierignore` |
| Runtime deps | `@grpc/grpc-js`, `@bufbuild/protobuf` (ts-proto 2.x generates against its `wire` reader/writer) |
| Dev deps | `ts-proto`, `@bufbuild/buf` (ships the `buf` binary; no system `protoc`) |

ts-proto options, all required:

| Option | Why |
|---|---|
| `forceLong=number` | int64 fields decode to JS numbers. Every int64 Diadem uses is a timestamp or count well under 2^53. |
| `useOptionals=all` | Unset optional fields are `undefined`, matching the JSON API's omitted fields and Diadem's types. |
| `snakeToCamel=false` | Field names stay snake_case, matching the JSON API and every Diadem type and mapper. |
| `useJsTypeOverride=true` | Honours `[jstype = JS_TYPE_STRING]` so a uint64 field can decode as a string. |
| `outputServices=grpc-js` | Emits the `GolbatApiClient` class and `GolbatApiService` definition used by the client and the wire test. |
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

- `isGrpcEnabled(): boolean` — true when `config.golbat.grpc` is set.
- One `GolbatApiClient` created lazily on first call with `credentials.createInsecure()` and
  keepalive channel options (`grpc.keepalive_time_ms`, `grpc.keepalive_permit_without_calls`).
  grpc-js reconnects on its own; no reconnect logic in Diadem.
- Metadata built once: `x-golbat-secret` set when `config.golbat.secret` is non-empty.
- Four exported functions, each taking the same request type the HTTP function takes and
  returning the same response type the HTTP function returns:

  | Function | RPC | Request type | Response type |
  |---|---|---|---|
  | `grpcScanGyms` | `ScanGyms` | `FortScanBody` | `GymScanResponse` |
  | `grpcScanPokestops` | `ScanPokestops` | `FortScanBody` | `PokestopScanResponse` |
  | `grpcScanStations` | `ScanStations` | `FortScanBody` | `StationScanResponse` |
  | `grpcScanPokemon` | `ScanPokemon` | `{ min, max, limit, filters: GolbatPokemonQuery[] }` | `PokemonResponse` |

- Each call: convert request (§5.1), invoke with a 30 second deadline, convert response (§5.2),
  log `"[ScanGyms] Request took %fms"` at debug in the same format as `callGolbat` so HTTP and
  gRPC timings compare in the same log stream. Errors are thrown as the grpc-js `ServiceError`
  (its `code` is the gRPC status code); callers decide the fallback.
- Callback promisification is done by hand in this module. No nice-grpc.

## 5. Mapping

Mapping lives in `golbatGrpcMapping.ts`, a sibling of `golbatGrpc.ts`, as pure functions with
no config or channel dependency so they unit test in isolation. It must not import
`pokemonUtils` at runtime (that module pulls in Svelte-only state); League keys are written as
their literal strings. The query classes see one record shape regardless of transport.

### 5.1 Requests

**Forts.** `FortScanBody` → `FortScanRequest`:

- `min/max: { latitude, longitude }` → `LatLon { lat, lon }`.
- `limit` unchanged.
- `filters?: GolbatFortDnfFilter[]` → `filters: FortDnfFilter[]`. Field names already match one
  for one. `{ min, max }` ranges become `IntRange { min, max }`. Omitted `filters` becomes `[]`,
  which the proto defines as "every fort of the requested type", the same as the JSON omission.
- `with_incidents` unchanged.

`fortDnf.ts` is not modified. Its `AMOUNT_MAX` upper bound is unnecessary on gRPC but harmless.

**Pokemon.** `GolbatPokemonQuery[]` → `PokemonDnfFilter[]`:

- `pokemon[].id` → `pokemon_id`; `form` unchanged when present.
- The MinMax fields (`iv`, `atk_iv`, `def_iv`, `sta_iv`, `level`, `cp`, `size`, `pvp_little`,
  `pvp_great`, `pvp_ultra`) → `IntRange`. `gender` list unchanged.
- The existing "one clause with empty `pokemon` list matches every pokemon" convention in
  `buildGolbatQueries` carries over unchanged; the proto has the same semantics.

### 5.2 Responses

Every decoded object is spread through as-is, then the fields below are renamed or converted.
Unset optionals arrive as `undefined`, matching the JSON API's omitted fields.

**Gym** (`Gym` → `GolbatGymResult`):

| Proto field | Mapped to | Note |
|---|---|---|
| `defenders_json` | `defenders_raw` | The inherited SQL `prepare()` parses and form-normalises it |
| `rsvps_json` | `raw_rsvps` | Same |
| `guarding_pokemon_display_json` | dropped | SQL path never selects it |
| `cell_id` (string) | dropped | Never read; `GymData.cell_id` is typed bigint |
| `deleted` (bool) | passed through | `mapGym` already converts to 0/1 |

`GolbatGymResult` gains optional `defenders_raw?: string` and `raw_rsvps?: string`. The existing
`mapGym` keeps handling native `defenders`/`rsvps` from HTTP and leaves the raw strings alone for
`prepare()`.

**Pokestop** (`Pokestop` → `GolbatPokestopResult`):

| Proto field | Mapped to |
|---|---|
| `quest_rewards_json` | `quest_rewards` |
| `alternative_quest_rewards_json` | `alternative_quest_rewards` |
| `showcase_focus_json` | `showcase_focus` |
| `showcase_rankings_json` | `showcase_rankings` |
| `quest_conditions_json`, `alternative_quest_conditions_json`, `cell_id` | dropped |
| `invasions` | passed through; `mapPokestop` already renames to `incident` |

These are exactly the SQL column names and the string form `PokestopQuery.prepare()` expects.

**Station** (`Station` → `GolbatStationResult`):

| Proto field | Mapped to |
|---|---|
| `stationed_pokemon_json` | `stationed_pokemon` (string, as the HTTP API already sends it; `mapStation` renames to `raw_stationed_pokemon`) |
| `battles`, `cell_id` | dropped |
| `is_inactive`, `is_battle_available` (bool) | passed through; `mapStation` converts to 0/1 |

**Pokemon** (`Pokemon` → `MinMapObject<PokemonData>` as `getMultiplePokemon` returns it):

| Proto field | Mapped to |
|---|---|
| `id` (string per §3) | unchanged |
| `spawn_id`, `cell_id` (strings per §3) | dropped; `makePokemon` never copies them |
| `pvp { little, great, ultra }` | `pvp` keyed by `League.LITTLE` / `GREAT` / `ULTRA`, whose values are the strings `"little"`, `"great"`, `"ultra"`; a league with no entries is omitted |
| `capture_1..3`, `is_event`, `username` | passed through; `makePokemon` ignores them as today |

`PvpEntry` field names (`pokemon`, `form`, `cap`, `value`, `level`, `cp`, `percentage`, `rank`,
`capped`, `evolution`) already match `PvpStats`.

The scan response envelopes (`examined`, `skipped`, `total`, `limit_reached`) pass through.

## 6. Query class changes

`ApiGymQuery`, `ApiPokestopQuery`, `ApiStationQuery` and `PokemonQuery` each gain one step in
front of the existing HTTP call. Shape, using gyms:

```ts
let result: GymScanResponse | undefined;
if (isGrpcEnabled()) {
	try {
		result = await grpcScanGyms(body);
	} catch (err) {
		log.warn("gRPC gym scan failed (%s), falling back to HTTP", describeGrpcError(err));
	}
}
if (!result) {
	try { result = await scanGyms(body); } catch (err) { log.debug(...) }   // existing
}
if (!result) return super.query(...);                                      // existing SQL fallback
```

- The request body is built once and passed to whichever transport runs.
- The `limit + 1` overflow detection, `since`, polygon and `deleted` handling after the call are
  unchanged.
- `PokemonQuery` has no SQL fallback: gRPC error → HTTP; HTTP failure → `error(500)` as today.
- `describeGrpcError` renders the status name (`UNAUTHENTICATED`, `FAILED_PRECONDITION`,
  `DEADLINE_EXCEEDED`, `UNAVAILABLE`, …) so a wrong secret or `fort_in_memory = false` is
  obvious in the log. It is the one helper shared by the four call sites.
- Fort API detection (`golbatFortApi.ts`) is unchanged and stays on HTTP. gRPC fort scans only
  run when `isFortApiEnabled()` already selected the `Api*Query` classes. If Golbat's
  `fort_in_memory` is off the RPC returns `FailedPrecondition`, which falls through to HTTP
  (503) and then SQL, the same chain as today.
- Query registry selection in `queryMapObjects.ts` is unchanged.

## 7. HTTP pokestop fix

Golbat's HTTP fort API emits `quest_rewards`, `alternative_quest_rewards`, `showcase_focus` and
`showcase_rankings` as native JSON, but `PokestopQuery.prepare()` (inherited by
`ApiPokestopQuery`) calls `JSON.parse` on them via `parseQuestReward` and directly, expecting
the SQL string form. A pokestop with a quest or a live showcase throws.

Fix in `mapPokestop` (`queryPokestopApi.ts`): when any of those four fields is a non-string
value, replace it with `JSON.stringify(value)` so `prepare()` receives the string it expects.
This mirrors how `mapGym` already handles native `defenders`/`rsvps`, keeps `prepare()` and
`parseQuestReward` untouched, and costs nothing on the gRPC path where the fields are already
strings. `GolbatPokestopResult` declares those four fields as `string | unknown[] | object`
accordingly.

## 8. Errors and logging

| Condition | Behaviour |
|---|---|
| `grpc` unset | `isGrpcEnabled()` false; no client is created; no gRPC code runs |
| Golbat unreachable, deadline exceeded, connection reset | Warn once per call with the status name; fall back to HTTP |
| `UNAUTHENTICATED` | Warn with a hint that `server.golbat.secret` must match Golbat's `api_secret`; fall back to HTTP (which will also fail) |
| `FAILED_PRECONDITION` (forts, `fort_in_memory` off) | Warn; fall back to HTTP then SQL |
| Response mapping throws | Propagates as a gRPC-path error; fall back to HTTP |

No caching, no circuit breaker: a Golbat outage already degrades HTTP the same way, and the
per-call fallback keeps the map working.

## 9. Testing

**Unit (vitest, `src/lib/server/api/golbatGrpc.test.ts` or a mapping sibling):**

- Request mapping: `FortScanBody` → `FortScanRequest` with and without filters, `with_incidents`;
  `GolbatPokemonQuery` → `PokemonDnfFilter` covering `id` → `pokemon_id`, form present/absent,
  every MinMax field, gender list, and the empty-pokemon catch-all clause.
- Response mapping: fully populated `Gym`/`Pokestop`/`Station`/`Pokemon` messages and
  all-optionals-unset messages, asserting the renames in §5.2, dropped fields absent, bools
  untouched, pvp keyed by League with empty leagues omitted, envelope fields passed through.
- HTTP pokestop fix: `mapPokestop` with native-JSON quest/showcase fields yields strings that
  `parseQuestReward` and `JSON.parse` accept; string inputs pass through unchanged.

**Wire (vitest, same file or `golbatGrpc.wire.test.ts`):** start an in-process grpc-js `Server`
on `127.0.0.1:0` with `GolbatApiService` and a stub `ScanGyms` handler that records incoming
metadata and returns one populated gym. Point the client at it via config, call `grpcScanGyms`,
assert `x-golbat-secret` arrived and the returned object matches the §5.2 mapping. This exercises
the generated encoder/decoder, the deadline and the metadata for real. A second case makes the
handler return `UNAUTHENTICATED` and asserts the thrown error's `code`.

Tests follow the existing `fortDnf.test.ts` conventions, including its mocks for the Svelte-only
modules pulled in by `pokestopUtils`. Config is mocked per test via `vi.mock` of
`config.server`.

**Manual:** run against Golbat `feat/grpc-api` with `grpc` set and unset, compare the
`Request took` debug lines for the same viewport on both transports.

`pnpm test`, `pnpm run check` and `pnpm run lint` must pass.

## 10. Documentation

- `docs/src/content/docs/reference/configuration.md`, `server.golbat`: add `grpc` to the example
  and key list; a short subsection stating the prerequisite (Golbat with the gRPC API and
  `grpc_port` set), that the secret is shared, that the connection is plaintext and should stay
  on a private network, and that HTTP is the automatic fallback.
- `config/config.example.toml`: the commented `grpc` line.
- `CLAUDE.md`: `pnpm run grpc:generate` in the commands list with a note to regenerate and
  commit when `proto/golbat_api.proto` changes; `src/lib/server/api/grpc/` in the source layout.

## 11. Files

| File | Change |
|---|---|
| `proto/golbat_api.proto` | new, copied from Golbat |
| `buf.gen.yaml` | new |
| `package.json` | deps, `grpc:generate` script |
| `.prettierignore` | generated file |
| `src/lib/server/api/grpc/golbat_api.ts` | generated |
| `src/lib/services/config/configTypes.d.ts` | `golbat.grpc?` |
| `src/lib/server/api/golbatGrpc.ts` | new: client, four calls |
| `src/lib/server/api/golbatGrpcMapping.ts` | new: request/response mapping, `describeGrpcError` |
| `src/lib/server/api/golbatApi.ts` | result types gain raw-string fields (§5.2, §7) |
| `src/lib/server/queryMapObjects/queryGymApi.ts` | gRPC-first step |
| `src/lib/server/queryMapObjects/queryPokestopApi.ts` | gRPC-first step, §7 fix |
| `src/lib/server/queryMapObjects/queryStationApi.ts` | gRPC-first step |
| `src/lib/server/queryMapObjects/queryPokemon.ts` | gRPC-first step |
| `src/lib/server/api/grpc/generated.test.ts` | smoke test of the generated encoder/decoder |
| `src/lib/server/api/golbatGrpcMapping.test.ts` | mapping unit tests |
| `src/lib/server/api/golbatGrpc.test.ts` | wire test |
| `src/lib/server/queryMapObjects/queryPokestopApi.test.ts` | §7 fix |
| `config/config.example.toml`, docs, `CLAUDE.md` | §10 |
