# Diadem Performance Plan

Date: 2026-09-11. Source baseline: `a1d5bf8c`.

This is an investigation and proposed implementation plan, not an implementation. Application code, configuration, dependencies, and database schema were not changed. No commits or pushes were made. Benchmark harnesses, response fixtures, and profiles are outside the repository under `/tmp/opencode/diadem-perf-*`.

**Recommendation**
Keep Node for now. Prioritize eliminating unnecessary work, preserving spatial index use, reducing initial downloads and large UI renders, and making required state work across instances. JSON requests are a sensible simplification, but small-request encoding is not the leading measured problem. Do not adopt protobuf, a new runtime, or general-purpose worker offloading before these improvements are measured.

## Evidence And Scope

- Built the current application with `pnpm run build`; the pre-existing production build was older than the source.
- Ran the production Node adapter on loopback against the configured real backends, not Vite's development server.
- Tested Node 24.18.0 / V8 13.6, Bun 1.3.13, and Deno 2.8.3. Deno came from the available nixpkgs package, not necessarily the latest Deno release.
- Machine: Intel i7-10750H, six physical cores / twelve logical CPUs, approximately 16 GiB RAM. Other desktop applications were running. This is not an isolated capacity-testing host.
- Used Chromium 150 for desktop and mobile-emulated navigation and interaction traces.
- HTTP tests used anonymous requests with the local configuration's unrestricted everyone permissions. They do not characterize authenticated sessions or polygon-restricted endpoint latency.
- Map bounds were latitude 53.548-53.558, longitude 9.99-10.01. Data changed during testing; large responses contained roughly 500 Pokemon and 265 forts.
- Exercised the configured Golbat HTTP path and some SQL paths. Did not benchmark an enabled Golbat gRPC connection.
- Used bounded request counts, at most four simultaneous client requests. No production saturation test, world-scale scan, database mutation, or index creation was performed.
- Ran `SELECT VERSION()`, `SHOW INDEX`, and `EXPLAIN EXTENDED` against the external database. Query-plan experiments did not execute the potentially expensive polygon-only data queries.
- `pnpm test` passed: 24 files, 201 tests.
- Test servers and their inspector listener were stopped after measurements.

Treat measured results, code-confirmed behavior, optimizer estimates, and proposed experiments as different levels of evidence. In particular, the small sample sizes below do not establish production p95/p99 or capacity.

## Measured Findings

### 1. Combined Fort Scans Fail Before Falling Back

The configured Golbat rejects `/api/fort/scan` with HTTP 422: unexpected properties `body.gyms.limit`, `body.pokestops.limit`, and `body.stations.limit`.

Diadem then issues the three per-type scans and returns HTTP 200 to its client. The benchmark checked nested type statuses as well as the outer HTTP status. This is real extra latency, upstream traffic, parsing, and logging hidden behind successful client responses.

The request groups are constructed at `src/lib/server/queryMapObjects/combinedForts.ts:94`; the combined request and fallback are at lines 117-135. Capability detection in `src/lib/server/api/golbat/fortAvailability.ts:25` recognizes fort availability, but that does not establish compatibility with this combined request shape.

**Plan:** resolve the deployed Golbat/Diadem contract mismatch first. Add contract coverage against the supported backend versions. Distinguish combined-scan support from individual fort support, and avoid repeatedly attempting a known-incompatible operation. Preserve result-limit and truncation guarantees; do not simply delete limit fields without checking backend semantics.

### 2. Polygon SQL Loses The Coordinate Index

`src/lib/server/api/spatialFilter.ts:9` emits only exact polygon containment when a permission polygon exists. It emits latitude/longitude bounds only when there is no polygon.

Actual MariaDB 11.1.2 optimizer plans for equivalent small rectangular areas:

| Table | Predicate | Access / Key | Estimated Access Rows |
| --- | --- | --- | ---: |
| gym | Bounds only | range / ix_coords | 682 |
| gym | Polygon only | ref / ix_gym_deleted | 859,656 |
| gym | Bounds AND polygon | range / ix_coords | 682 |
| spawnpoint | Bounds only | range / ix_coords | 210,970 |
| spawnpoint | Polygon only | ALL / no key | 26,946,173 |
| spawnpoint | Bounds AND polygon | range / ix_coords | 210,970 |

These are reduced-projection, code-shaped EXPLAIN queries, not measured rows scanned or speedup ratios. All 30 inspected indexes across gym, pokestop, spawnpoint, station, and route were BTREE; no SPATIAL index was reported. The existing coordinate index is `(lat, lon)`, not a two-dimensional spatial index, so the spawnpoint range estimate remains substantial.

**Plan:** retain an index-friendly bounding predicate AND exact permission containment. This can use existing indexes and does not initially require schema changes. Validate full projections, joined aliases, parameter ordering, delta predicates, holes, multipolygons, and permission boundaries. Then inspect the remaining high-candidate-count queries before proposing external schema changes.

### 3. Deltas Save Client Bytes, Not Most Backend Work

Pokemon and fort Golbat request bodies have no upstream `since`. On the tested HTTP path, Diadem receives and JSON-parses the full scan, then rejects unchanged objects before per-object application mapping. The gRPC path also performs transport-to-scan mapping before the query-layer delta check. SQL-backed queries already push their timestamp constraint down.

Sources: `src/lib/server/queryMapObjects/queryPokemon.ts:38`, `src/lib/server/queryMapObjects/queryGymApi.ts:30`, `src/lib/server/queryMapObjects/combinedForts.ts:117`, and `src/lib/server/queryMapObjects/MapObjectQuery.ts:161`.

In an initial browser observation, empty gym deltas were 18 bytes but took roughly 100-250 ms. In the later bounded HTTP run, full and delta latencies were also close despite dramatically different response sizes.

Profiled Node run, JSON request, concurrency one:

| Response | Samples Per Format | JSON Median / Observed Max | MessagePack Median / Observed Max |
| --- | ---: | ---: | ---: |
| config | 12 | 2.35 / 3.11 ms | 2.24 / 3.60 ms |
| pogodata | 12 | 9.47 / 10.10 ms | 17.94 / 21.54 ms |
| Pokemon full | 8 | 77.52 / 86.92 ms | 76.91 / 91.86 ms |
| Pokemon delta | 8 | 72.90 / 85.04 ms | 71.25 / 95.74 ms |
| Forts full | 8 | 125.66 / 144.69 ms | 127.47 / 150.52 ms |
| Forts delta | 8 | 118.33 / 125.51 ms | 119.09 / 127.87 ms |

Pokemon full responses contained 516-518 objects; these deltas contained five. Fort full responses contained 265 objects; these deltas contained five. The fixed delta watermark was recent at the start of the run, not refreshed on every request.

Across the profiled run, 208 recorded responses succeeded, including the request-codec matrix and concurrency-four batches. All recorded nested fort statuses succeeded. The concurrency-four batches were variable: observed maxima reached 637 ms for Pokemon and 676 ms for forts. They do not identify a sustainable throughput limit.

**Plan:** measure upstream objects and bytes per delivered change. Prefer actual upstream delta/cursor support if Golbat can expose it. In the meantime, evaluate type-specific polling intervals, hidden-tab behavior, jitter, request coalescing, and short-lived scan reuse with explicit freshness and permission semantics. Do not replace polling with WebSockets just to move the same full scans behind a persistent connection.

### 4. Species Selection Is A Measured Interaction Bottleneck

Workflow: Filters -> Add Pokemon filter -> Create new -> Species.

At a 390x844 mobile-emulated viewport, 4x CPU slowdown, and Fast 4G emulation, the longest interaction was **2,963 ms**:

- Input delay: 6 ms.
- Processing: 2,392 ms.
- Presentation: 565 ms.
- The grid had 753 children; the trace reported approximately 3,300 DOM elements and a 214 ms layout update.

The unvirtualized selector is in `src/components/menus/filters/filterset/multiselect/PokemonSelect.svelte:66`. Its sorting and linear membership checks add work at lines 27-32. Other large picker grids have the same rendering pattern, including `src/components/menus/filters/filterset/iconpicker/IconGrid.svelte:14`.

**Plan:** virtualize or incrementally reveal large grids, use indexed membership where appropriate, and avoid rebuilding/sorting unchanged datasets. Preserve keyboard navigation, focus, selection, and search across non-mounted items. Lazy images alone do not solve hundreds of mounted buttons and their components.

### 5. Icon Arrivals Trigger Repeated Full GeoJSON Publications

On a desktop reload at 1365x900, centered at 53.553 / 10.0, zoom 15.5, with Pokemon and all fort types enabled:

- 89 icon requests started within eight seconds.
- The main source received **70 `setData` calls within eight seconds**.
- First non-empty main-source publication was approximately 3.26 seconds after navigation.
- Desktop LCP was approximately 2.46 seconds. LCP did not mean the map icons were ready.

`src/lib/map/render/manageGeojson.ts:13` filters the complete feature collection for loaded images. Lines 44-50 repeat that scan and publication after every image completion, including the completion path after a caught failure.

The desktop capture used temporary in-browser counters and an early import of the already-used MapLibre chunk. These can perturb timings; the counts establish the repeated application work, not a pristine production loading benchmark. MapLibre also coalesces pending worker updates, so 70 application calls do not prove 70 completed worker rebuilds.

**Plan:** coalesce image completions, avoid no-op/failed-image publications, and move toward updating only newly renderable or changed features. Preserve progressive display and existing in-flight image deduplication. A single all-images `Promise.all` would create a new slow-image dependency. Frame batching alone may not remove much work when arrivals are spread out; measure feature scans and worker work as well as call count.

### 6. Startup Downloads And Dependencies Are Large

The desktop capture reported approximately **3.99 MB decoded JavaScript / 851 KB encoded** across 50 script resources, including the map worker resource. Five icon indexes added **1,023,610 bytes**, without response compression on the local origin. The master data MessagePack response added 446,805 bytes, locale 291,740 bytes, and other resources added further bytes.

A mobile-emulated warm-cache navigation had approximately 4.96-second LCP. Its first map requests started around 5.70 seconds. This was not a clean cold-mobile download test or a measurement on a physical phone.

Code-backed candidates:

- Global MapLibre import: `src/hooks.client.ts:2`.
- Statically imported filter editors: `src/routes/(main)/[[map=map]]/+page.svelte:21`.
- Entire dynamically indexed Lucide namespace: `src/components/utils/LucideIcon.svelte:2`.
- Eager emoji dataset: `src/components/menus/filters/filterset/iconpicker/iconPickerData.ts:20`.
- Every configured icon index loads before icon readiness: `src/lib/services/uicons.svelte.ts:29`.
- First map queries wait for map load and several presentation resources: `src/components/map/MapMain.svelte:70` and `src/lib/services/initialLoad.svelte.ts:53`.

**Plan:** add actual dynamic-import boundaries around editors, icon/emoji picking, and specialized tools; replace unrestricted runtime icon lookup with an appropriate bounded/lazy registry; load selected/default icon indexes first. Separate query readiness from presentation readiness, preserving permission and settings dependencies. Consider rendering a lightweight public shell earlier, but do not start with a full SSR conversion of the WebGL application.

Hidden modals are not necessarily mounted, but their static imports still affect the dependency graph. Exact package-level byte savings need a bundle analysis; a chunk name is not a package attribution.

### 7. Filter Knowledge Is Not Shared Across Instances

A real probe submitted a filter and its hash to the Node instance: HTTP 200 and `X-Filter-Cached: 1`. Hash-only replay to that instance succeeded. Hash-only replay to a second instance running the same build returned **409**.

This is expected from the process-local cache in `src/lib/server/api/filterCache.ts:4`. The existing client retries with the full filter, so this is generally extra work rather than a permanently failed request. It matters during cold replicas, eviction, rollout, and cache expiry; it is not necessarily a miss on every load-balanced request after all replicas are warm.

Native login has a more important correctness issue: `src/lib/server/auth/nativeHandoff.ts:13` explicitly assumes one process and stores single-use codes in a module-level Map. The browser callback and native exchange can land on different processes. This was established by code inspection, not by executing an OAuth flow.

## Serialization Decisions

### Use JSON Requests By Default

The current browser MessagePack path is `stringify -> parse -> encode` at `src/lib/utils/requests.ts:27`. The server path is `decode -> stringify -> parse` at `src/lib/server/api/requestBody.ts:18`. Native clients already send JSON requests.

Node microbenchmarks of the current expressions, including JSON UTF-8 size calculation on the client and decoder limits on the MessagePack server path:

| Synthetic Request | JSON / MP Bytes | JSON Both-Side Sum | Current MP Both-Side Sum | Difference |
| --- | ---: | ---: | ---: | ---: |
| Bounds, since, cached filter hash | 160 / 153 | 3.44 us | 10.07 us | 6.63 us |
| Initial filter, six filtersets and 92 selectors | 4,679 / 3,500 | 72.85 us | 251.54 us | 178.68 us |

These are sums of separately measured medians, not request round-trip times. One microsecond is 0.001 milliseconds. The bodies are structural examples, not a sampled user-filter distribution. Stream buffering, depth checks, hashing, networking, and application work are excluded.

Defaulting small requests to JSON is sensible, but the tiny request saves about **0.0066 ms**, not several milliseconds. Do not spend a sprint on size-threshold machinery or calculate both encodings merely to select one. Decouple request encoding from response negotiation. Preserve body/depth limits and normalization semantics when changing the path.

### Compare Compressed Responses, Not Just Raw Binary Size

Captured responses, exact bytes; each cell is JSON / MessagePack:

| Fixture | Raw | gzip Level 6 | Brotli Quality 4 |
| --- | ---: | ---: | ---: |
| 526 Pokemon | 256,961 / 198,540 | 31,534 / 34,995 | 30,542 / 33,976 |
| 265 forts | 515,956 / 424,657 | 70,452 / 71,728 | 64,799 / 64,577 |
| Master data | 663,432 / 446,805 | 44,949 / 45,336 | 47,356 / 45,676 |

MessagePack saved 18-33% before compression. JSON was smaller with gzip in all three fixtures. With Brotli, MessagePack was approximately 11% larger for Pokemon, effectively tied for forts, and approximately 4% smaller for master data.

Node response-codec medians, milliseconds per operation:

| Fixture | JSON Stringify | MP Encode | UTF-8 Decode + JSON Parse | MP Decode |
| --- | ---: | ---: | ---: | ---: |
| Pokemon | 1.21 | 2.87 | 1.45 | 4.06 |
| Forts | 2.72 | 5.73 | 3.63 | 6.55 |
| Master data | 4.74 | 8.77 | 6.13 | 12.52 |

JSON stringify returns a string; MP encode returns bytes. JSON encoding to UTF-8 adds work. These are Node measurements, not Chromium decoding measurements. The harness separately measured Response construction/consumption; near-tied combined encoding-plus-gzip costs do not support a strong CPU winner. Results are medians of three short round averages after warmup, not latency percentiles.

The local adapter returned no `Content-Encoding` for dynamic `/api/pogodata` even when curl offered gzip and Brotli. Static JS was precompressed. This does **not** establish production proxy/CDN behavior: verify it there before changing anything. Ensure binary MIME types are eligible if retaining MessagePack, and preserve both `Vary: Accept` and compression variation.

**Proposed policy:** JSON for small/control requests; pre-encoded, compressed, revisioned public catalogs/indexes at the cache/edge; compressed JSON as the bulk-response baseline. Retain existing negotiated MessagePack support until actual browser/native tests establish the desired default. Native transport currently requests identity encoding in `src/lib/native/nativeFetch.ts:81`; validate that separately.

### Do Not Migrate The Whole API To Protobuf Yet

Protobuf is a candidate for a narrow, high-volume, stable map-data contract only if payload reduction and compressed JSON still leave serialization or transfer dominant.

- Protobuf over ordinary HTTP is possible without gRPC. Browser gRPC-Web is a separate transport/proxy decision, not a requirement for a protobuf body.
- The existing Golbat gRPC integration is a different boundary. Test and improve that boundary independently instead of exposing scanner messages directly to browsers.
- Keep opaque IDs as strings and actual 64-bit numeric IDs lossless. Model absence, zero, false, unknown, and permission-redacted fields explicitly.
- Heterogeneous quest/configuration JSON either needs typed schemas, a dynamic value representation, or embedded JSON. Embedded JSON preserves some of the parsing cost.
- Include generated browser code size, mapping/allocation cost, compression, malformed-input limits, old/new client compatibility, unknown enums, and field-presence tests.
- Reserve deleted field tags and define schema evolution; stale web bundles and shipped native clients are real consumers.

No Diadem protobuf DTO was implemented or benchmarked. A claim that protobuf would outperform the current API is not justified by this investigation.

## Runtime And Threading

### Keep Node As The Baseline

Exploratory production-artifact smoke comparison, six samples per format, JSON requests, one at a time. Cells are JSON / MessagePack response medians in milliseconds:

| Route | Node 24.18.0 | Bun 1.3.13 | Deno 2.8.3 |
| --- | ---: | ---: | ---: |
| config | 2.80 / 2.78 | 3.30 / 3.59 | 3.17 / 2.66 |
| pogodata | 11.39 / 18.26 | 9.48 / 10.16 | 9.45 / 16.82 |
| Pokemon full | 73.54 / 75.25 | 126.92 / 163.27 | 138.23 / 165.43 |
| Forts full | 122.78 / 127.44 | 154.81 / 157.42 | 201.05 / 171.17 |

All 48 recorded quick requests per runtime succeeded, including nested fort statuses. Runs were not interleaved between runtimes and used a live remote backend; Pokemon counts differed. These are not a runtime ranking. Bun's codec microbenchmarks also varied by fixture: some encodes improved, while its MP decode medians were slower than Node's in all three response fixtures.

Deno initially returned HTTP 500 from Paraglide's dynamic bare `async_hooks` import. Adding the runtime flag `--unstable-bare-node-builtins` let the same artifact run without source changes. Both Bun and Deno completed startup SQL work and returned a Sharp-generated WebP image. Neither was validated for authenticated sessions, Golbat gRPC, disconnect/reconnect handling, complete image/font behavior, or long-running memory stability.

**Go/no-go for a future runtime trial:** same data snapshot, permissions, production artifact, compression, aggregate CPU/memory/DB budgets, interleaved repeated runs, real gRPC and OAuth/native compatibility, graceful shutdown, and a soak test. A Bun-native adapter is a second experiment, not a runtime-only substitution. Also benchmark a newer supported Node/V8 release as a lower-migration-cost alternative; do not assume newer V8 JSON optimizations exist in this Node 24 build.

### Offload CPU Only After Removing Repeated Work

The 19.26-second Node CPU profile had 84.3% idle sample weight in this bounded test. Among non-idle sample weights, MessagePack accounted for approximately 24.9%, Undici JSON parsing for 14.7%, and GC for 10.2%. These are sampling weights from a mixed workload, not OS CPU utilization or production saturation measurements.

For the sequential measured windows, server CPU averaged roughly 15 ms per Pokemon-full request and 28 ms per forts-full request across mixed codecs. Delta CPU remained substantial. Those estimates include profiler overhead and potentially background work; no per-stage production CPU budget can be inferred from them.

**Good candidates if profiles confirm them:** large geometry operations, heavy pure filtering/transformation pipelines, synchronous thumbnail rendering/encoding, and expensive response preparation at high concurrency.

**Poor default candidates:** asynchronous MySQL/HTTP/gRPC waiting, tiny request encoders, and wrapping Sharp in JS workers solely to make it threaded. Sharp already uses libuv/libvips threading. Synchronous Resvg work is different and should be measured separately.

Cloning the captured response objects locally cost approximately 1.99 ms for Pokemon, 3.41 ms for forts, and 13.91 ms for master data. This is not a worker round-trip measurement, but warns that copying decoded objects into a worker can consume much of the encoding saving. Transfer owned buffers where possible; this does not make the entire HTTP/worker pipeline zero-copy.

**Plan:** first pre-encode stable public data and reduce full scans/conversions. If dynamic CPU still harms latency, compare inline work against a small persistent bounded worker pool, including queue wait, input clone/transfer, computation, output transfer, GC, and cancellation. Consider moving a coherent decode/filter/encode pipeline rather than an isolated encoder surrounded by expensive object copies. Keep permission-sensitive data ownership explicit.

## Multi-Instance Scaling

Separate correctness-critical state from performance caches. Do not move every Map into Redis by default.

| State Or Resource | Current Behavior | Proposed Direction |
| --- | --- | --- |
| Native handoff codes | Process-local, single-use, approximately two-minute TTL | Shared expiring atomic consumption, preserving PKCE and replay behavior |
| Sessions/users | Shared internal SQL, repeated lookups in hooks | Preserve shared truth; reduce duplicate identity work and narrow projections before caching |
| Rate limits | Process-local `RateLimiterMemory` | Define global versus local protection; use shared enforcement where global quotas are intended |
| Filter hashes | Bounded per-process cache with 409 recovery | Measure cold/eviction misses; consider a shared content-addressed store or stateless small-filter submission |
| Permission snapshots | Per-process TTL and refresh locks | Explicit freshness/revocation/versioning; avoid divergent worker snapshots |
| Public catalogs/geometry/stats | Per-process copies and refresh timers | Versioned artifacts, single-flight refresh, jitter; shared refresh ownership when duplication matters |
| MySQL pools | Internal and external pool per process | Explicit aggregate connection budgets, bounded waiting, deadlines, pool-wait metrics |
| gRPC connections | One reusable client per process | Preserve reuse; bound upstream concurrency and align deadlines |
| Image transformations | Re-fetch/re-transform on origin misses | Verify CDN hit rate, then bounded transform caching/coalescing if necessary |

Sources: `src/hooks.server.ts:47` and `:102`, `src/lib/server/api/rateLimit.ts:35`, `src/lib/server/api/settingsRateLimit.ts:3`, `src/lib/server/db/external/internalQuery.ts:9`, and `src/lib/server/db/internal/index.ts:7`.

The installed mysql2 defaults are ten connections per pool and an unbounded waiting queue. With W application processes, the two pools permit roughly 10W connections to each database, across all hosts combined. Increasing workers changes backend concurrency as well as JavaScript CPU capacity; hold aggregate budgets constant when comparing.

Recommended deployment direction:

1. Serve static assets and cacheable public artifacts through the existing reverse proxy/CDN, with verified compression and cache variation.
2. Run a bounded number of application replicas with shared correctness-critical state and explicit upstream/DB budgets.
3. Keep ephemeral per-request data local. Add shared performance caches only where hit-rate and miss-cost measurements justify them.
4. Coordinate expensive refreshes and stagger cold starts. Preserve existing provider single-flight and last-good data.
5. Add isolated CPU-worker capacity only for remaining measured CPU work, within the same overall CPU/memory budget.

Sticky sessions can reduce some cache misses but are not a sufficient native-login correctness design, especially across browser and native requests. Increasing `DIADEM_WORKERS` to all visible CPUs is not a scaling plan: it multiplies pools, caches, refresh work, and possibly native thread contention.

## Additional Work To Include

**Incremental correctness and client memory.** Feature invalidation currently checks position, disappearance, and expiry but skips same-position content changes (`src/lib/map/featuresGen.svelte.ts:248`). Request timestamps advance before success (`src/lib/mapObjects/updateMapObject.ts:268`). Weather shares a `Promise.all` with the map batch and cleanup is not in a `finally` (`:399`). Empty deltas still copy/recount the global object dictionary (`src/lib/mapObjects/mapObjectsState.svelte.ts:22`). Fix cursor commitment, failure cleanup, dirty revisions, expiry/removals, and bounds-aware data-limit suppression before further incremental optimization. Define deletion/tombstone behavior. Preserve selected-object and route-popup retention.

**Duplicate modifier features.** A matched filterset emits badge and underlay features even when their helpers return no modifier; spreading the main props produces extra copies of the main icon (`src/lib/map/render/renderMapObjects.ts:178` and `:250`). Only emit actual modifiers. This is source-confirmed unnecessary feature generation, not a measured GPU speedup.

**GeoJSON differential updates.** Evaluate MapLibre `updateData` after explicit dirty tracking. Ensure unique per-feature-part IDs: nest icon/circle/polygon currently reuse IDs (`src/lib/map/render/renderMapObjects.ts:564`). Do not replace layout-driven selection sizing with paint-only feature-state assumptions.

**Settings growth.** `recentSearches.slice(0, 20)` discards its result (`src/components/ui/search/SearchItem.svelte:28`), so history is not capped. Position updates synchronously stringify/write full settings (`src/lib/services/userSettings.svelte.ts:230`), potentially including search geometry and large filters. Apply the cap to existing persisted histories, retain compact search descriptors, and separate or debounce position persistence. Preserve the existing debounced, single-flight server settings synchronization.

**Authenticated-request overhead.** Hooks load an auth session and then a separate full user row including settings (`src/hooks.server.ts:102`, `src/lib/server/auth/auth.ts:12`). Measure actual SQL count/bytes and narrow the needed identity projection. Do not cache away revocation or permission updates. This path was not exercised by the anonymous benchmark.

**Permission geometry.** Restricted requests repeatedly intersect/union allowed areas and perform point-in-polygon checks (`src/lib/services/user/checkPerm.ts:69`). Precompute area bounding boxes, reject unrelated areas cheaply, and reuse versioned normalized geometry. Preserve exact authorization checks. Profile this separately from SQL.

**Backend degradation.** gRPC can fall back to HTTP, forts can then fall back to SQL, and combined scans can fan out. Introduce an end-to-end deadline and bounded fallback/concurrency budget, with cancellation proven to propagate from the deployed adapter. A browser abort currently does not cancel this backend chain. Add failure-class-aware capability/circuit handling rather than retrying every failure identically (`src/lib/server/api/golbat/grpc.ts:116`, `src/lib/server/api/golbat/http.ts:47`).

**Readiness and refresh storms.** Initialization waits for all providers. Fetch retries have no explicit timeout, and the exception branch logs a one-minute retry without actually sleeping (`src/lib/server/provider/dataProvider.ts:46`). Specify essential versus optional readiness, timeouts, backoff/jitter, last-good data, and bounded refresh concurrency. Cluster restart backoff and drain deadlines also need review (`cluster.mjs:32`).

**Shutdown lifecycle.** During cleanup, SIGTERM closed all three test HTTP listeners, but their processes remained alive and needed forced termination. This is an observation of this setup, not an established root cause. Verify shutdown hooks close database pools, channels, refresh work, and other active handles; do not treat a closed listener as completed process shutdown.

**Bulk endpoints and specialized maps.** Fort search has no result limit; Wayfarer counts-only still selects full rows and computes cells after fetching (`src/routes/api/search/forts/+server.ts:28`, `src/routes/api/wayfarer/forts/+server.ts:86`). Bound geographic/complexity work and narrow counts-only projections. Reuse S2 geometry and avoid generating it twice (`src/components/map/MapWayfarer.svelte:86`). Fixed-level cell covering can exceed `maxCells` before the post-generation limit check. Consider dedicated compute workers or static/vector tiles only if these workflows remain costly after removing redundant work.

## Delivery Order

Effort is relative, not a delivery-time commitment: S = localized change, M = multi-path change, L = protocol/state-boundary change.

| Order | Work Package | Evidence / Expected Benefit | Effort |
| --- | --- | --- | --- |
| 0 | Reliable measurement boundaries and repeatable fixtures | Prevent optimizing the wrong phase or counting fallbacks as clean success | S-M |
| 1 | Combined fort contract and spatial bbox preservation | Observed repeated 422; very different actual SQL access plans | S-M |
| 1 | Species/grid rendering; real import boundaries | Measured multi-second interaction and substantial startup payload | M |
| 1 | Public catalog/index compression and encoded caching | Large measured uncompressed public data; avoid repeated encoding | S-M |
| 1 | Actual modifier features, recent-search cap, image publication control | Source-confirmed redundant work and observed publication count | S-M |
| 2 | Native handoff/shared-limit requirements and aggregate pool budgets | Required before expanding replicas safely | M |
| 2 | Cursor/dirty-object correctness, empty-delta no-ops, expiry | Foundation for efficient and correct incremental map updates | M |
| 2 | Request JSON policy, narrow payloads/auth projection, compiled filters | Lower conversion/allocation/DB cost without replacing the API | S-M |
| 3 | True upstream deltas, coalescing, deadlines, refresh coordination | Reduce steady-state backend work and failure amplification | M-L |
| 4 | Targeted worker-pool experiments | Only for remaining CPU-induced queueing or long tasks | M-L |
| 5 | Runtime or protobuf experiment | Proceed only if controlled whole-application gains justify migration | L |

Native login correctness should move immediately if multiple replicas already serve the browser callback and native exchange. Work packages with independent owners can run in parallel; this table is not a requirement to serialize all work.

## Validation And Rollout

1. Add low-overhead sampled timing for hooks/auth, pool wait, query/backend attempts, body consumption versus decoding, geometry/filtering/mapping, encoding, and total response completion. Existing `permcheck/query/serialize` timings are inconsistent between routes and exclude hooks. Asset timing currently stops before Sharp's `toBuffer()` completes (`src/routes/assets/[iconset]/[...path]/+server.ts:56`).
2. Add browser marks for query readiness, first query, data received, state application, feature generation, source publication, first rendered map data, and interaction completion. LCP alone is not a usable-map metric.
3. Capture sparse/dense, full/delta, simple/large-filter, global/area-permission, anonymous/authenticated, cold/warm, desktop/mobile, and native cases. Preserve permission stripping, filter precedence, limits, timestamp boundaries, and old-client behavior.
4. Run longer open-loop load tests on an isolated host against a representative replay/snapshot environment. Report successful per-type throughput, p50/p95/p99, errors, CPU/request, GC, RSS/external memory, event-loop delay, DB queue/rows examined, and upstream bytes/calls. Avoid coordinated omission and do not call six-sample maxima production p95.
5. Compare one/two/four replicas with equal total CPU, memory, DB connections, and upstream concurrency. Test cold-cache rollout, permission changes, node loss, native handoff across replicas, graceful drain, and backend degradation.
6. Set provisional budgets before each change. Suggested starting targets: no steady-state known-invalid combined scans; polygon queries retain the intended bounded access path; species interaction trends toward <200 ms with at least a substantial reduction from the 2.96-second lab result; no global source publication for a genuinely unchanged delta; public catalogs are cache hits after warmup; startup JS has an explicit compressed-byte budget.
7. Ship localized changes first with regression tests and a canary. Establish performance acceptance beyond run-to-run variance, then validate production traces before changing defaults globally. Require a meaningful whole-workload improvement and a rollback for runtime/protobuf changes, not a faster isolated encoder.

Do not cache mutable, permission-stripped map objects across users: query preparation mutates and removes fields. Shared caches must have safe ownership and permission/version keys. Do not remove exact spatial checks, change truncation semantics, or advance cursors past failed data to make benchmarks look faster.

## Reproduction Artifacts

Scratch files are local and may contain map data or operational URLs. They are not staged and should not be published without review/redaction.

- `/tmp/opencode/diadem-perf-codecs.mjs`: captured-response and synthetic-request codec/compression benchmark.
- `/tmp/opencode/diadem-perf-codecs-node-results.json` and `diadem-perf-codecs-bun-results.json`.
- `/tmp/opencode/diadem-perf-http.mjs`: bounded HTTP matrix and optional Node inspector profiling.
- `/tmp/opencode/diadem-perf-http-node-results.json`: profiled 208-request run.
- `/tmp/opencode/diadem-perf-http-{node,bun,deno}-quick.json`: exploratory runtime smoke runs.
- `/tmp/opencode/diadem-perf-node.cpuprofile`: mixed request CPU profile.
- `/tmp/opencode/diadem-perf-dense-trace.json.gz` and `diadem-perf-dense-browser.json`: desktop source-publication investigation.
- `/tmp/opencode/diadem-perf-mobile-trace.json.gz` and `diadem-perf-mobile-interaction.json.gz`.
- `/tmp/opencode/diadem-perf-sql-inspect.mjs`: read-only index/EXPLAIN harness.

The original Node benchmark server used port 3901 and inspector port 9231; Bun used 3902; Deno used 3903. Servers must be started separately before rerunning HTTP harnesses. Do not launch the Docker entrypoint for a read-only benchmark without reviewing its schema-initialization behavior.

## Primary References

- [SvelteKit performance](https://svelte.dev/docs/kit/performance): production testing, dependency waterfalls, selective loading.
- [SvelteKit observability](https://svelte.dev/docs/kit/observability): tracing support and instrumentation overhead.
- [SvelteKit Node adapter](https://svelte.dev/docs/kit/adapter-node): compression, precompressed assets, runtime environment, graceful shutdown.
- [Svelte state](https://svelte.dev/docs/svelte/$state): raw state and snapshots; not a reason to replace all existing reactive state indiscriminately.
- [MapLibre large-data guidance](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/): smaller properties, reduced work, source splitting/tiling options.
- [MapLibre GeoJSONSource](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/): differential updates and feature ID requirements.
- [Node worker threads](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html): CPU versus I/O, pooling, structured cloning, transferable buffers.
- [Sharp utility API](https://sharp.pixelplumbing.com/api-utility/) and [libuv thread pool](https://docs.libuv.org/en/v1.x/threadpool.html): native concurrency and shared process resources.
- [Bun Node compatibility](https://bun.com/docs/runtime/nodejs-compat) and [Deno Node compatibility](https://docs.deno.com/runtime/fundamentals/node/): test actual dependency behavior, not just successful imports. Compatibility changes by version.
- [V8 JSON stringify optimizations](https://v8.dev/blog/json-stringify): runtime-version and object-shape sensitivity, not a blanket binary-versus-JSON result.
- [MessagePack JavaScript implementation](https://github.com/msgpack/msgpack-javascript): semantics, extensions, encoding options.
- [Protobuf field presence](https://protobuf.dev/programming-guides/field_presence/) and [schema evolution](https://protobuf.dev/programming-guides/proto3/#updating): correct DTO design and compatibility.
- [ts-proto options](https://github.com/stephenh/ts-proto#supported-options): separate browser codecs, numeric representations, and service clients.
- [gRPC-Web protocol](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md): browser transport is not native gRPC framing.
