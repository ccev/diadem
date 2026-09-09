# Combined fort request and tightened station DNF — design

**Date:** 2026-09-09
**Status:** Draft for review
**Branch:** `feat/golbat-fort-api` (after `3f3415d`)
**Golbat counterpart:** UnownHash/Golbat `feat/grpc-api` at `b24956a`, which adds per-type
`limit` on `FortTypeScanGroup`, per-type `examined`/`limit_reached` stats on the combined scan
response, the `battle_available` DNF field, and redefines `station_active` as
`!is_inactive && start_time < now < end_time`.

## 1. Context and goals

Live measurements on a single-host deployment (Golbat and Diadem on localhost) showed every
Diadem-to-Golbat call carries a fixed cost of roughly 4 ms regardless of transport, and each map
pan issues one call per fort type. Two further findings: the station scan returns roughly a
hundred stations per viewport that Diadem then filters to zero, because the DNF language could
not express "battle available"; and JSON versus protobuf encoding is not a factor at typical
viewport sizes. This design cuts the number of calls per pan and the wasted station payload.

### Goals

1. One Golbat call per pan for gyms, pokéstops and stations together, on both gRPC and HTTP.
2. Per-type behaviour preserved exactly: permission checks, rate-limit budgets and charges,
   `limit_reached` → SQL fallback, data-limit ("zoom in") state, `since` deltas, filter-hash
   caching.
3. Station scans return only stations Diadem will display in max-battle mode.
4. Pokémon scans and every other type are untouched. Active-search mode is untouched.

### Non-goals

- Changing rate-limit economics. Each type is charged as today from its own `examined`.
- Folding pokémon into the combined call (different endpoint, different limits).
- Any change to the per-type `/api/<type>` routes' behaviour; they stay for single-type
  refreshes and as the 409 retry path.

## 2. Proto and types

- `proto/golbat_api.proto` re-copied verbatim from Golbat `b24956a`; regenerate.
- `GolbatFortDnfFilter` gains `battle_available?: boolean`.
- New HTTP types in `queries.d.ts`:

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

  and in `golbatApi.ts`:

  ```ts
  export type FortCombinedScanResponse = {
  	gyms: GolbatGymResult[];
  	pokestops: GolbatPokestopResult[];
  	stations: GolbatStationResult[];
  	examined: number; skipped: number; total: number; limit_reached: boolean;
  	gyms_stats: FortTypeScanStats;
  	pokestops_stats: FortTypeScanStats;
  	stations_stats: FortTypeScanStats;
  };
  export function scanForts(body: FortCombinedScanBody)   // POST api/fort/scan
  ```

- `golbatGrpcMapping.ts`: `toFortCombinedScanRequest(body)` and
  `fromFortScanResponse(res)` reusing the existing per-message converters.
  `golbatGrpc.ts`: `grpcScanForts(body): Promise<FortCombinedScanResponse>`.

## 3. Station DNF

`buildStationDnfFilters` adds `battle_available: true` to every clause it emits, including
the no-filterset fallback. With Golbat's new `station_active` semantics, the fallback clause
`{ station_active: true, battle_available: true }` equals the SQL predicate
`is_inactive = 0 AND is_battle_available = 1 AND start_time < now AND end_time > now`.

One caveat, decided before implementation: Diadem's `shouldDisplayStation` requires
`!is_inactive && is_battle_available && end_time > now` but **not** `start_time < now`
(only the `isActive` filterset adds that). `station_active` now requires `start_time < now`,
so a station with its flag set before its window opens would be excluded by the DNF but shown
by SQL. Whether such rows exist is a data question:

```sql
SELECT COUNT(*) AS flag_set_before_start
FROM station
WHERE is_battle_available = 1 AND is_inactive = 0
  AND end_time > UNIX_TIMESTAMP() AND start_time > UNIX_TIMESTAMP();
```

- Zero (expected: the flag is set by the game when the window opens): use
  `station_active: true, battle_available: true` on every clause. Tight, exact.
- Non-zero: use `battle_available: true` alone on the base, `hasGmax` and `bosses` clauses,
  and add `station_active: true` only on `isActive`. Looser (stale flags on ended stations
  come back and are trimmed locally) but never drops a displayable station.

Tests in `fortDnf.test.ts` updated for the chosen shape.

## 4. Server: combined fort route

New route `src/routes/api/forts/+server.ts`, `POST`, body:

```ts
type FortsRequestData = Bounds & {
	types: Partial<Record<FortType, { filter?: AnyFilter; filterHash?: string; since?: number }>>;
};
type FortType = MapObjectType.GYM | MapObjectType.POKESTOP | MapObjectType.STATION;
```

Response:

```ts
type FortsResponse = Partial<Record<FortType, {
	status: 200 | 401 | 409 | 429;
	filterCached?: "0" | "1";       // same meaning as the X-Filter-Cached header
	result?: MapObjectResponse<MapData>;   // present iff status 200
}>>;
```

The per-type route's pipeline is extracted into `src/lib/server/api/mapObjectRequest.ts` so
both routes share it, in three steps that the single-type route calls in sequence and the
combined route calls per type around one shared scan:

1. `admitTypeRequest(type, locals, rateLimitKey, data)` → permission check (`401`), rate-limit
   consume (`429`), body/bounds validation (`400` refunds), `checkFeaturesInBounds` (`401`),
   filter-hash resolution (`409`, `filterCached`). Returns either `{ status }` or
   `{ filter, permitted, context, requestLimit, filterCached, since }`.
2. the query (route-specific, below).
3. `settleTypeRequest(type, admitted, result)` → charge from `result.examined` capped at the
   hard limit, reward or extra charge, returns the remaining points for the log line.

Refunds on denial (`DENIED_CHARGE`) behave per type exactly as today. A combined request where
every type is denied still returns 200 with per-type statuses; the client already treats
non-200 per type as "no data".

**Scan.** `queryFortsCombined(entries, options)` in `queryMapObjects.ts`:

- If `isFortApiEnabled()`: build one `FortCombinedScanBody`. Bounds are the union bbox of the
  admitted types' `permitted.bounds` (each type's polygon is still applied per object). Each
  present type gets a group with its DNF clauses from the existing builders and
  `limit: getFortApiScanLimit(requestLimits[type] + 1)`; top-level `limit` is the sum of the
  group limits; `with_incidents` when pokéstops are present. A pokéstop filter that yields
  `null` clauses (match nothing) omits the group and answers `{ data: [], examined: 0 }`.
  Call `scanViaGrpcOrHttp("forts", body, grpcScanForts, scanForts)`. On an HTTP failure (throws
  or `undefined`), fall back to running the three SQL queries in parallel.
- For each type: if that type's stats say `limit_reached`, run the SQL class for that type
  (same as today's per-type fallback). Otherwise hand the slice to the type's `Api*Query`
  post-processing.
- If the fort API is not enabled: `Promise.all` of `queryMapObjects` per type. Same result
  shape, three SQL round trips in parallel.

**Query class split.** Each `Api*Query.query()` becomes `scan request → scanViaGrpcOrHttp →
processScan(result, bounds, filter, polygon, since)`, with `processScan` public so the
combined path can call it with a slice and a synthetic `{ examined, limit_reached }` from the
per-type stats. `MapObjectQuery.getMultiple()` splits into `query()` plus a public
`finish(result, filter, polygon, context)` (prepare, filter, `makeMapObject`) so the combined
path runs the identical permission stripping and local filtering. No behaviour change for the
single-type routes.

**Logging.** One `[forts]` info line per request with the per-type counts and charges, plus
the same `permcheck + query + serialize` timing spans as the per-type route.

## 5. Client

`updateMapObject` is split into two exported halves with the current function composed of
them:

- `planMapObjectRequest(type, removeOld, filterOverwrite, onlyChanged)` → performs the early
  exits and side effects exactly as today (permission, disabled filter clears, data-limit
  skip, `lastQueryTimestamps` bookkeeping) and returns `undefined` (skip) or
  `{ filter, since, isDelta, limitInfo, removeOld }`.
- `applyMapObjectResponse(type, plan, response, signal)` → the existing limit handling,
  replace/add, `updateFeatures` and returns the type to clear a limit for, as today.

`fetchMapObjects` keeps its per-type filter-hash bookkeeping; a new `fetchForts(plans, signal)`
posts `/api/forts` with each planned type's filter (sent only when its hash is unknown, as
today), hash and `since`, applies the `X-Filter-Cached` equivalents from the response, and for
any type answered `409` retries that type alone through `fetchMapObjects`. It resolves to a
per-type map of `MapObjectResponse | undefined`.

`updateAllMapObjects`, non-search branch: plan all types; the fort types with a plan go to
`fetchForts` when there are at least two of them, otherwise through the per-type path. All
other types run exactly as today, in the same `Promise.all` with `updateWeather`. Abort
handling and limit clearing unchanged.

The `MapObjectRequestData` type and the per-type route stay as the contract for single-type
refreshes (S2 cells, search mode, 409 retries).

## 6. Error handling

| Condition | Behaviour |
|---|---|
| Combined scan fails (gRPC then HTTP) | Three SQL queries in parallel; per-type results unaffected |
| One type `limit_reached` | That type falls back to SQL; the others use the scan |
| One type 401/429/409 | Reported per type; the client skips (401/429) or retries alone (409) |
| Body invalid | 400 for the whole request; every admitted type refunded |
| Fort API disabled | Three SQL queries in parallel; still one browser request |

## 7. Testing

- `fortDnf.test.ts`: station clauses carry `battle_available` (and `station_active` per §3).
- `golbatGrpcMapping.test.ts`: combined request mapping (groups, per-type limits, union
  bounds, `with_incidents`) and response mapping (slices, per-type stats).
- `golbatGrpc.test.ts`: wire round trip for `ScanForts` through the in-process server.
- `fortAdapters.test.ts` (extend): `queryFortsCombined` with `scanForts` spied: slices reach the
  right classes, per-type `limit_reached` triggers SQL for that type only, per-type polygons
  applied, `since` applied, pokéstop `null` DNF short-circuits.
- New `mapObjectRequest.test.ts`: `admitTypeRequest` statuses (401, 429, 400 refund, 409) and
  `settleTypeRequest` charge maths, with the rate limiter and filter cache mocked.
- Client: `planMapObjectRequest` and the fort partition in `updateAllMapObjects` covered by a
  vitest with the Svelte state modules mocked, following `fortAdapters.test.ts` conventions.
- Manual: the same timing pans as before; expect one `[forts]` line per pan instead of three
  fort lines, and the station slice to be a handful of objects.

## 8. Files

| File | Change |
|---|---|
| `proto/golbat_api.proto`, `src/lib/server/api/grpc/golbat_api.ts` | bump to `b24956a` |
| `queries.d.ts`, `golbatApi.ts` | combined body/response types, `scanForts` |
| `golbatGrpcMapping.ts`, `golbatGrpc.ts` | combined request/response mapping, `grpcScanForts` |
| `fortDnf.ts` | `battle_available` on station clauses |
| `MapObjectQuery.ts` | `finish()` split out of `getMultiple()` |
| `queryGymApi.ts`, `queryPokestopApi.ts`, `queryStationApi.ts` | `processScan()` split out of `query()` |
| `queryMapObjects.ts` | `queryFortsCombined()` |
| `src/lib/server/api/mapObjectRequest.ts` | admit/settle pipeline shared by both routes |
| `src/routes/api/[queryMapObject=mapObject]/+server.ts` | call the shared pipeline |
| `src/routes/api/forts/+server.ts` | new |
| `src/lib/mapObjects/updateMapObject.ts` | plan/apply split, `fetchForts`, partition |
| tests as §7; `CLAUDE.md` data-flow note |
