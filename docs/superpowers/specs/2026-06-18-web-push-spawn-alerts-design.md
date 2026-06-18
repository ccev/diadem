# Web Push spawn-alert pipeline — design

**Date:** 2026-06-18
**Status:** Approved (pending spec review)

## Summary

Add server-driven Web Push so users receive **system notifications** for Pokémon
spawns matching their alert rules, even when the app is closed. Spawns arrive via
**Golbat webhooks** posted to a new guarded intake endpoint; the server matches each
spawn against per-user alert rules (respecting permissions), and dispatches Web Push
messages to the user's subscribed devices. The service worker shows the notification.

This builds on the existing in-app/native notification work in
`src/lib/features/notifications/` (which already routes native notifications through
the service worker so they work on Android). Web Push is the missing piece for
delivery when the page is not in the foreground.

### Why webhooks (not polling)

Golbat can POST a batched webhook for every relevant Pokémon change. This removes the
need for a polling loop, a watch bounding box, and `since`-timestamp bookkeeping.
Golbat pushes us every spawn; we react.

## Scope

In scope:

- VAPID key config + generation.
- Push subscription storage and subscribe/unsubscribe endpoints.
- Per-user alert rules (separate from map filters), stored server-side, edited on `/test`.
- Service worker `push` / `notificationclick` / `pushsubscriptionchange` handling.
- Guarded `POST /intake/golbat` webhook endpoint + matching + dispatch pipeline.
- All UI lives on the existing `/test` page. **No existing UI or map-filter code is touched.**

Out of scope (future):

- A dedicated notification settings menu (long term; for now everything is on `/test`).
- Alert types other than Pokémon (raids, quests, invasions). The intake endpoint
  ignores non-`pokemon` webhook types for now.

## Constraints / context

- SvelteKit + `adapter-node`, SSR disabled globally. `+server.ts` endpoints work regardless of SSR.
- Svelte 5 runes for any client state.
- Internal DB via Drizzle (MySQL); external Golbat DB via raw queries (not used here — spawns come via webhook).
- Config is TOML, parsed by `src/lib/services/config/config.server.ts`; client config via `getClientConfig()` / `/api/config`.
- Permissions are location-based (`FeaturePermissionContext.isAllowedAt(feature, lat, lon)`), derived from Discord roles, TTL-cached.
- Existing service worker: `src/lib/serviceWorker/` (`index.ts` → `offline.ts`). Registered automatically by SvelteKit.

## Architecture

### 1. Data model (internal DB, `pnpm run db:push`)

**New table `pushSubscription`** in `src/lib/server/db/internal/schema.ts`:

| column         | type                    | notes                                  |
| -------------- | ----------------------- | -------------------------------------- |
| `id`           | varchar(255) PK         | generated id                           |
| `userId`       | varchar(255) FK → user  | indexed                                |
| `endpoint`     | text                    | the push endpoint URL                  |
| `endpointHash` | varchar(255) unique     | hash of endpoint for the unique index (endpoints are too long to index directly) |
| `p256dh`       | text                    | subscription key                       |
| `auth`         | text                    | subscription key                       |
| `userAgent`    | text                    | for the user to identify the device    |
| `failureCount` | int (default 0)         | incremented on send failure; pruned on 404/410 |
| `createdAt`    | datetime                |                                        |
| `updatedAt`    | datetime                |                                        |

**New JSON column `pushAlerts` on the `user` table** — an array of alert rules,
stored **separately** from `userSettings.filters`. Each rule reuses the existing
`FiltersetPokemon` shape (`pokemon[]`, `iv`, `ivAtk`/`ivDef`/`ivSta`, `level`, `cp`,
`size`, `gender`, `pvpRank*`) plus `id`, `enabled`, and an optional `title`. Reusing
the shape lets the matcher call the existing `matchPokemonFilterset` verbatim.

Repository helpers in `src/lib/server/db/internal/repository.ts`:
`getPushSubscriptions(userId)`, `upsertPushSubscription(...)`, `deletePushSubscription(userId, endpointHash)`,
`deletePushSubscriptionByHash(endpointHash)` (for pruning), `getPushAlerts(userId)`,
`setPushAlerts(userId, rules)`, and `getAlertSubscribers()` (users with ≥1 enabled rule
AND ≥1 subscription — used to build the in-memory registry).

### 2. Config

Add `[server.push]` to `config.toml` and `config.example.toml`, and to the
`ServerConfig` type in `src/lib/services/config/configTypes.ts`:

```toml
[server.push]
enabled = true
vapidPublicKey = "..."
vapidPrivateKey = "..."
vapidSubject = "mailto:you@example.com"
maxPerUserPerHour = 30
intakeSecret = "long-random-string"
```

- **Public** VAPID key + `enabled` are surfaced to the client via `getClientConfig()`
  (so `/api/config` carries them). The **private key and intakeSecret are never sent
  to the client.**
- VAPID keys generated by a one-off script `scripts/generate-vapid-keys.ts`
  (run via a `push:keys` package script) using `web-push`'s `generateVAPIDKeys()`;
  it prints the keypair for the operator to paste into config.
- When `enabled` is false: intake + subscribe endpoints return 503, the registry is
  never built, and the `/test` push UI shows a disabled state.

**New dependency:** `web-push` (+ `@types/web-push`).

### 3. Subscription + rules management

Client module `src/lib/features/notifications/push.ts`:

- `getPushState()` — reactive Svelte 5 state: `supported`, `permission`, `subscribed`.
- `subscribeToPush()` — `await navigator.serviceWorker.ready`, then
  `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
  using the public key from client config; POST the subscription to `/api/notifications/subscribe`.
- `unsubscribeFromPush()` — unsubscribe locally + POST `/api/notifications/unsubscribe`.

Server endpoints under `src/routes/api/notifications/` (all require `locals.user`; all
return 503 when push disabled):

- `POST subscribe` — validate body (zod), upsert by `endpointHash`, store `userAgent`. Invalidate registry entry for the user.
- `POST unsubscribe` — delete by `endpointHash`. Invalidate registry entry.
- `GET alerts` / `PUT alerts` — read / replace the user's `pushAlerts` rules (zod-validated). PUT invalidates the registry entry.
- `POST test` — send a test push to the current user's subscriptions (end-to-end verification without needing a real spawn).

### 4. Service worker (extends `src/lib/serviceWorker/`)

Add a `push.ts` module wired from `index.ts`:

- `push` event → parse JSON payload `{ title, body, tag, icon, url }` →
  `event.waitUntil(self.registration.showNotification(title, { body, tag, icon, data: { url } }))`.
- `notificationclick` event → `event.notification.close()`, then focus an existing
  client matching the origin or `clients.openWindow(url)` (map centered on the spawn).
- `pushsubscriptionchange` event → re-subscribe with the stored public key and
  POST the new subscription to `/api/notifications/subscribe`.

The public key must be available inside the SW. It is embedded at build time from the
client config (or fetched once from `/api/config` inside the SW and cached).

### 5. Intake endpoint + matching pipeline

**`POST /intake/golbat`** (`src/routes/intake/golbat/+server.ts`):

1. Auth: read `Authorization: Bearer <secret>` header, constant-time compare against
   `config.server.push.intakeSecret`. 401 on mismatch. (Golbat sets this via its
   webhook `header_map`.) Return 503 if push disabled.
2. Parse body with a zod schema for the envelope: an array of `{ type: string, message: object }`.
3. Keep entries where `type === "pokemon"`. Map the snake_case webhook fields to an
   internal pokemon shape compatible with `matchPokemonFilterset`'s expected input
   (id/`pokemon_id`, `form`, `lat`/`lon`, `iv`/`atk_iv`/`def_iv`/`sta_iv`, `level`,
   `cp`, `size`, `gender`, `pvp`, `expire_timestamp`, `encounter_id`).
4. Ack `200` immediately; run matching inline (in-memory, fast).

Golbat operator config (documented in `/docs`):

```toml
[[webhooks]]
url = "https://yourmap.example/intake/golbat"
types = ["pokemon"]
[webhooks.header_map]
Authorization = "Bearer long-random-string"
```

**In-memory alert registry** (`src/lib/server/push/registry.ts`):

- `Map<userId, { rules, permContext, subscriptions, hourly: { count, windowStart } }>`.
- Built from `getAlertSubscribers()` for users with ≥1 enabled rule AND ≥1 subscription.
- Refreshed on a TTL (e.g. 60s) and invalidated per-user when that user's rules or
  subscriptions change (subscribe/unsubscribe/alerts endpoints call `invalidateUser(userId)`).
- Keeps per-webhook matching off the DB hot path (webhook volume is high).

**Matcher** (`src/lib/server/push/matcher.ts`):

For each incoming pokemon, for each registry user:

1. `permContext.isAllowedAt(Features.POKEMON, lat, lon)` — skip if not allowed.
   If any matching rule constrains on IV, also require `isAllowedAt(Features.POKEMON_IV, lat, lon)`.
2. `matchPokemonFilterset(pokemon, rule)` for each enabled rule → first match wins per rule.
3. **Dedupe per `(encounter_id, ruleId)`** via a bounded LRU keyed by `encounter_id:ruleId`,
   entries expiring at `disappear_time`. This makes the no-IV-spawn → IV-encounter
   re-fire push each relevant rule at most once.
4. Per-user **hourly rate limit** (`maxPerUserPerHour`) — drop beyond the cap.
5. Build the push payload (title e.g. "Charizard 100% L35", body with location/despawn,
   `url` deep-linking the map to the spawn) and dispatch.

**Sender** (`src/lib/server/push/sender.ts`):

- Wraps `web-push` (`setVapidDetails` from config, `sendNotification` per subscription).
- On `404`/`410` (gone), delete that subscription and invalidate the user's registry entry.
- On other errors, increment `failureCount`; log.

**Permission context for offline users** (`src/lib/server/push/permissions.ts`):

- Build a `FeaturePermissionContext` from the user's stored Discord access token
  (from the `account` table), refreshing via arctic when expired, TTL-cached in the
  registry entry.
- If no valid token can be obtained, fall back to the `everyone` + `loggedIn`
  baseline permissions only — **never** push something the user is not permitted to see.

**Startup:** `src/lib/server/init.ts` warms the registry once if `push.enabled`.
No background interval is required (webhook-driven), but the registry TTL refresh is
lazy on access.

### 6. `/test` page UI

Extend `src/routes/test/+page.svelte` (self-contained; no shared components changed):

- **Push toggle:** enable/disable Web Push (subscribe/unsubscribe), showing subscribed
  state and permission. Reuses the existing "Enable browser notifications" permission flow.
- **Rule editor:** minimal form to add/remove alert rules — pick `pokemon_id` (+ optional
  `form`) and an optional minimum IV — persisted via `PUT /api/notifications/alerts`.
  List current rules with delete buttons.
- **Send test push** button → `POST /api/notifications/test`.
- Status readouts (permission, subscribed, rule count, last action result).

## Data flow

```
Golbat ──webhook(batch of {type,message})──▶ POST /intake/golbat (secret-guarded)
   │ filter type==pokemon, map fields
   ▼
matcher ─per pokemon, per registry user─▶ isAllowedAt? ─▶ matchPokemonFilterset ─▶ dedupe ─▶ rate limit
   ▼
sender (web-push) ──▶ user's pushSubscription endpoints
   ▼
service worker `push` ──▶ showNotification ──(click)──▶ open/focus map at spawn
```

Subscription/rule management:

```
/test page ──▶ subscribeToPush() ──▶ POST /api/notifications/subscribe ──▶ pushSubscription table + registry invalidate
/test page ──▶ PUT /api/notifications/alerts ──▶ user.pushAlerts + registry invalidate
```

## Error handling

- Push disabled in config → intake/subscribe/test endpoints 503; no registry; `/test` UI disabled state.
- Bad/missing intake secret → 401.
- Malformed webhook/subscription/rule body → 400 (zod).
- Dead subscription (404/410 on send) → pruned, registry invalidated.
- Discord token refresh failure → baseline (`everyone`+`loggedIn`) perms only.
- Dedupe LRU and per-user hourly counters are bounded in memory.

## Security

- Private VAPID key and `intakeSecret` are server-only; never serialized to the client.
- Intake endpoint requires a constant-time-compared bearer secret.
- Subscribe/alerts/test endpoints require an authenticated session (`locals.user`).
- Per-spawn permission checks (`POKEMON`, and `POKEMON_IV` when a rule uses IV) ensure
  users never receive pushes for areas or data they cannot otherwise see.

## Testing / verification

- `pnpm run check` must pass (project has no unit test suite yet).
- `POST /api/notifications/test` verifies subscribe → service worker → showNotification
  end-to-end on a device without needing a live spawn.
- Intake verified by POSTing a sample Golbat pokemon webhook batch with the secret and
  observing a matched rule produce a push (and a non-matching one produce none).
- Manual Android verification: build + preview over HTTPS, subscribe on `/test`, add a
  rule, fire a test push and a sample intake, confirm the system notification appears
  with the app backgrounded/closed.

## Documentation

Update `/docs` (Astro Starlight): new config section for `[server.push]`, VAPID key
generation, and the Golbat webhook `header_map` setup for `/intake/golbat`.

## Open considerations (noted, not blocking)

- Matching cost is O(users × pokemon-per-batch). Fine for tens of alert users; if it
  grows, add an index from `pokemon_id` → interested users in the registry.
- Only Pokémon alerts for now; the intake envelope already carries other types, so
  raids/quests/invasions can be added later with new rule shapes.
