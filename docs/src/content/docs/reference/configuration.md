---
title: Configuration
description: Reference for Diadem's config
---

Diadem reads configuration from `src/lib/server/config.toml`, which should be linked from `config/config.toml`.

Each option is either for the server or the client. Note that all client options are publicly accessible.

```toml
[server]
[client]
```

## `server.log`

```toml
[server.log]
level = "info"
# file = "/var/log/diadem.log"
```

- `level`: log level (`crit`, `error`, `warning`, `info`, `debug`)
- `file`: optional rotating log output path

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
- `fortApi`: Optional, default `true`. Set to `false` to keep gyms, pokéstops and stations on SQL even when Golbat offers the fort API (this also bypasses gRPC for them). Useful for benchmarking the three paths.
- `defaultNestName`: The default nest name, as configured in Fletchling

### Golbat Fort API

It's recommended to enable in-memory forts in Golbat
(Golbat Config -> `fort_in_memory = true` + optional `preload = true`).
Diadem will then serve pokestops, gyms and stations from Golbat direclty, instead of having to go through the database.
Detection is automatic; set `fortApi = false` under `[server.golbat]` to opt out and stay on SQL regardless.

### Golbat gRPC API

When your Golbat supports gRPC, set `grpc` to that `host:port`. Diadem then runs gym, pokéstop, station and pokémon map scans over gRPC with protobuf encoding, which is markedly cheaper than the JSON HTTP API on large responses.

If a gRPC call fails for any reason, Diadem falls back to the HTTP API for that request, and for forts to SQL after that, so the map keeps working. Unset `grpc` to compare against the HTTP path.

The gRPC connection is plaintext. Keep it on a private network, as with Golbat's HTTP port.

## `server.dragonite`

```toml
[server.dragonite]
url = "http://127.0.0.1:7272"
secret = ""
```

Only used for scout.

- `url`: Dragonite base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Dragonite secret

## `server.koji`

```toml
[server.koji]
url = "http://127.0.0.1:8080"
secret = "secret"
projectName = "reactmap"
```

Koji is optional. It's used for area-based permissions, area search and in the coverage map.

- `url`: Koji base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Koji secret
- `projectName`: The project name used to fetch areas from

By default, Diadem shows a Globe icon for areas in the search menu. You can configure the displayed icon per area
by setting a `lucideIcon` property in Koji.
[You can find supported icons here.](https://lucide.dev/icons/) Make sure to convert the icon name from `kebab-case` to `PascalCase`.

## Reverse Geocoding

Diadem supports different geocoding providers for address search. 

Out of all options, Photon is the best fit and can be used across your mapping stack. [Find how to set it up here](/guides/photon).

### Geometry

When searching for a place, Diadem can show the resulting geometry on the map. These are not supported by all providers.
- Photon
    - Option 1: Run Photon with `-full-geometries` and set `hasGeometries` to true 
(requires ~600 GB for a planet import, [more details here](https://github.com/komoot/photon/pull/823))
    - Option 2: Configure Nominatim. When a user select a search result, geometries are fetched from Nominatim 
(jumping is instant, displaying the result may take a little)
- Pelias: Not supported
- Nominatim: Supported

### `server.photon`

```toml
[server.photon]
url = "https://photon.komoot.io/"
# basicAuth = "user:pass"
#hasGeometries = false
```

- `hasGeomtries`: If you run Photon with `-full-geometries`, set to true

### `server.pelias`

```toml
[server.pelias]
url = "https://api.geocode.earth/"
# apiKey = "..."
# basicAuth = "user:pass"
```

### `server.nominatim`

```toml
[server.nominatim]
url = "https://nominatim.openstreetmap.org/"
# basicAuth = "user:pass"
#userAgent = "Diadem / Contact: name@email.com"
```

- `userAgent`: Set this to something unique if you're using public nominatim

## `server.auth`

```toml
[server.auth]
enabled = true
optional = true
secret = ""
baseUrl = ""
```

- `enabled`: Enables authentication
- `optional`: If `true`, show a login prompt in the menu. If `false`, lock the app behind a login prompt.
- `secret`: Required when enabled. Random 32+ chars used to sign/encrypt auth cookies and OAuth tokens. Can also be set via the `BETTER_AUTH_SECRET` or `AUTH_SECRET` env var.
- `baseUrl`: Required when enabled. Public app URL (scheme + host only), e.g. `https://map.example.com`.

```toml
[server.auth.discord]
clientId = ""
clientSecret = ""
```

Get your client ID and secret by setting up an application in the [Discord Developer Portal](https://discord.com/developers/applications)
and enabling OAuth2. The callback URL is `<baseUrl>/api/auth/callback/discord` — register this exact URL in the Discord OAuth app's redirect list.

### Telegram OIDC and provider selection

```toml
[client.auth]
providers = ["discord", "telegram"]

[server.auth.telegram]
clientId = "123456789"
clientSecret = "..."
botToken = "..."
```

Omitting `client.auth.providers` preserves the Discord-only default. Use `["telegram"]`
for Telegram-only instances. One provider starts login directly; multiple providers open
an accessible picker at every built-in login entry point, including native. Unknown or
duplicate providers, empty lists, or enabled providers without credentials fail startup.
Only provider names belong in the public client auth section. Never put secrets there.

Use the **new Telegram OIDC code flow**, not the legacy login widget/HMAC protocol.
In BotFather → your bot → Login Widget, obtain the client ID/secret and register this
exact redirect URL: `<baseUrl>/api/auth/oauth2/callback/telegram`. Keep Telegram's default
RS256 signing algorithm (ES256 is also supported). The requested scopes are `openid profile`;
phone numbers and bot messaging permission are not requested. See
[Telegram's public login documentation](https://core.telegram.org/bots/telegram-login).

Better Auth 1.6.18 manages sessions, state, PKCE and account linking. Its generic OAuth
default ID-token decoder is **not** used: Diadem verifies the signature against Telegram's
JWKS, issuer, audience, expiry and required identity claims. Telegram has no UserInfo
endpoint. The signed numeric `id` profile claim (not the opaque OIDC `sub`, username or
display name) is stored as the Telegram provider account ID and used with the Bot API.
The internal `id@telegram.invalid` email required by Better Auth is unverified and cannot
implicitly link accounts. Discord's existing `id@discord.internal` migration matching is
unchanged.

### Account linking and migration

Back up the internal database and run `pnpm run db:migrate` before starting this version.
Migration `0002_telegram_accounts` only makes `user.discord_id` nullable; it preserves
existing user IDs, unique Discord IDs, settings, accounts and sessions. New Telegram-only
users have no Discord ID. Sessions and settings resolve by the stable local `user.id`.

To link providers, **sign in to your existing account on the web**, open Profile and choose
**Link Discord** or **Link Telegram**, then authorize that second identity. The authenticated
session plus the second provider's OAuth proof is required. Linking an identity owned by
another user is rejected, never merged; signing in separately with each provider before
linking creates separate accounts. Linking does not copy or combine settings. Display
names and emails are not used to merge Discord and Telegram accounts.
This also protects legacy Discord users who have not signed in since the Better Auth
migration: their `user.discord_id` binding cannot be claimed by another local account.

Linking UI is web-only; native users should use the same instance's web profile to link.
Once linked, either provider can log into the same account on **both web and native**.
Custom home components should call the shared `startLogin()` helper instead of hardcoding
`/login/discord`, so they participate in provider selection.

Authentication tests run with `pnpm test` (mocked providers, real Better Auth and JWT
verification). To also exercise the SQL upgrade on a disposable, socket-only MariaDB,
install `mariadb-install-db` and `mariadbd` and run `DIADEM_MIGRATION_TEST=1 pnpm test`.
This opt-in test ignores local database defaults and never connects to a running instance.
Before rollout, also smoke-test actual provider consent, chat membership, account linking
and browser-to-app return on your registered instance and physical devices.

## `client.discord`

```toml
[client.discord]
serverLink = "https://discord.com/invite/..."
serverId = "123..."
```

Client-facing Discord metadata used in UI. Server ID is used to check membership before prompting to join the server.

## `server.permissions`

Permission rules are an array of sets:

```toml
[[server.permissions]]
# everyone = true
# loggedIn = true
# guildId = "123..."
# roleId = "123..."
# telegramChatId = "-1001234567890"
# areas = ["London"]
features = ["gym*", "quest"]
```

Rules are additive. For every rule a user matches, they get access to all its areas and features. `config.example.toml` shows some examples.

Rule match fields:

- `everyone` (bool)
- `loggedIn` (bool)
- `guildId` (Discord guild id)
- `roleId` (Discord role id)
- `telegramChatId` (stable numeric Telegram group/channel ID **as a quoted string**, not an `@username`)

Each rule matches **everyone OR loggedIn OR (Discord guild AND optional role) OR Telegram
membership**. `everyone` and `loggedIn` keep their existing independent semantics; adding
`loggedIn = true` to a restricted rule makes it apply to every authenticated user. A role
without a guild is a configuration error. The existing feature/area mapper is shared by
both providers. Permissions consider the linked Discord and Telegram identities regardless
of which provider started the current session. A failed branch cannot cancel a valid grant
from the other branch, but grants nothing specific to the failed branch.

For Telegram rules, `server.auth.telegram.botToken` is required and the bot **must be an
administrator in every checked chat** for reliable `getChatMember` results. Members,
administrators and creators qualify; restricted users qualify only when `is_member` is
true. Left, kicked, unknown/malformed responses, mismatched user IDs and API errors do not.
Do not log Bot API request URLs: they contain the bot token.

Telegram membership requests have a 5-second timeout, a 60-second positive/negative cache
(10,000 entries per process), concurrent-request deduplication, a ceiling of 20 requests
per second / 20 in flight, and bounded `retry_after` backoff on rate limiting. No stale
positive is reused after expiry. The existing permission cache is five minutes, so allow
**up to six minutes** for membership revocation or newly linked grants to propagate.
Limits/caches are per process, not a distributed rate limiter; size deployments accordingly.

Grant fields:

- `areas`: Koji area names (optional)
- `features`: one or more feature keys

Feature keys are granular. The bare family keys are the **narrow** grant; the `*`-suffixed
key grants the whole family, and `*` grants everything. Umbrella wildcards group several
features together (e.g. `map_object*`, `tool*`). Data you are not permitted to see is never
sent by the server, and features you cannot access are hidden in the UI (including the search
index and the search box itself).

:::caution[Breaking change]
`pokemon`, `pokestop`, `gym`, and `station` previously granted the **entire** family. They
now grant only the narrow subset (basic pokemon / plain pokestop / plain gym / plain station).
Use the `*`-suffixed wildcard (`pokemon*`, `pokestop*`, `gym*`, `station*`) to restore the old
"whole family" behaviour. Configs using `*` are unaffected.
:::

Supported feature keys:

- `*` — everything
- **Pokemon:** `pokemon` (basic — no iv/pvp/cp/level), `pokemon_iv` (iv/cp/level), `pokemon_pvp` (full — iv + pvp), `pokemon*`
- **Pokestops:** `pokestop` (plain), `quest`, `invasion`, `lure`, `contest`, `kecleon`, `golden_pokestop`, `pokestop*`
- **Gyms:** `gym` (plain), `raid`, `gym*`
- **Stations:** `station` (plain), `max_battle`, `station*`
- **Other map objects:** `nest`, `tappable`, `s2cell`, `spawnpoint`, `route`
- **Tools:** `scout`, `coverage_map`, `wayfarer_map`
- **UI:** `search`, `weather`

Umbrella wildcards bundle several of the above:

- `map_object*` — every map object (`pokemon*`, `pokestop*`, `gym*`, `station*` and all minor map objects)
- `minor_map_object*` — map objects with no sub-features (`nest`, `tappable`, `s2cell`, `spawnpoint`, `route`)
- `tool*` — `scout`, `coverage_map`, `wayfarer_map`
- `ui*` — `search`, `weather`

## `server.limits`

Rate-limiting is pretty bare-bones, but should work.

Controls request limits and optional rate limiting.

```toml
[server.limits]
enableRateLimiting = false
nonDeltaMultiplier = 3
heavyFilterMultiplier = 2
heavyFilterRatio = 0.2
```

- `enableRateLimiting`: turn limiter on/off
- `nonDeltaMultiplier`: extra cost for full queries
- `heavyFilterMultiplier`: extra cost for highly filtered full queries
- `heavyFilterRatio`: threshold for what is considered a heavy filter query

Per-type overrides:

```toml
[server.limits.pokemon]
requestLimit = 10000
rateLimit = 2000000
rateLimitTime = 3600
```

Available keys:

- `pokemon`, `pokestop`, `gym`, `station`, `nest`, `spawnpoint`, `route`, `tappable`, `s2cell`

## `server.db` and `server.internalDb`

```toml
[server.db]
host = "127.0.0.1"
port = 3306
database = "golbat"
user = ""
password = ""

[server.internalDb]
host = "127.0.0.1"
port = 3306
database = "diadem"
user = ""
password = ""
```

- `server.db`: external Golbat DB used for data queries (user needs SELECT permissions)
- `server.internalDb`: internal Diadem DB used for users/sessions (user needs ALL permissions)

## `client.general`

```toml
[client.general]
mapName = "Diadem"
defaultLocale = "en"
customHome = false
defaultLat = 51.516855
defaultLon = -0.080500
defaultZoom = 15
# minZoom = 0
# maxZoom = 20
url = ""
image = ""
description = ""
allowCrawlers = false
disallowedPaths = []
msgpack = true
```

- branding and defaults for map and metadata
- `customHome`: When true, `/` renders custom home and map moves to `/map`
- `defaultLat`, `defaultLon`, `defaultZoom`: The default map position for first-time users
- `minZoom`, `maxZoom`: Locking users into a map zoom range
- `url`, `image`, `description`: SEO/OpenGraph metadata
- `allowCrawlers`, `disallowedPaths`: robots.txt config
- `msgpack`: Default `true`. The map client and API exchange MessagePack, which is about a fifth smaller than JSON but costs roughly three times the CPU to encode and decode on both ends. Set to `false` to use JSON instead, which is the better trade on a CPU-bound server or for clients on fast connections.

## `server.staticMap`

```toml
[server.staticMap]
enabled = false
url = "https://tiles.example.com"
diademUrl = "https://map.example.com"
# style = "positron"
```

Controls static map rendering for link previews. It's recommended to use [Rampardos](https://github.com/lenisko/rampardos)
or [SwiftTileserverCache](https://github.com/123FLO321/SwiftTileserverCache).

- `url`: Base Tileserver URL, as accessible from your Diadem server
- `diademUrl`: Public Diadem URL, used for image links
- `style`: Optional map style id override, otherwise uses the default light [Map Style ID](#clientmapstyles)

## `client.tools`

```toml
[client.tools]
showToolsMenu = true
coverageMap = true
scout = true
```

Enables/disables the different tools. `showToolsMenu` disables the Tools menu altogether.

## `client.mapPositions`

```toml
[client.mapPositions]
coverageMapLat = 51.516855
coverageMapLon = -0.080500
coverageMapZoom = 10

# Static UI
styleLat = 53.563
styleLon = 9.979
styleZoom = 12
coverageLat = 53.563
coverageLon = 9.979
coverageZoom = 5.5
scoutLat = 53.563
scoutLon = 9.979
scoutZoom = 10.5
```

There are a couple of maps used throughout Diadem that are independent of the main map.
Use this to control where they're positioned.

- `coverageMap...`: The initial position when opening the coverage map
- `style...`: Position for style previews in the profile menu
- `coverage...`, `scout...`: Background maps used in Tools menu links

## `client.mapStyles`

Array of map style definitions.

```toml
[[client.mapStyles]]
id = "positron"
name = "Positron"
url = "https://.../style.json"
# default = "light"
# theme = "light"
# attribution = '<a href="https://...">Map data attribution</a>'
```

Supported keys:

- `id`: unique id
- `name`: display name
- `url`: style URL
- `default`: optional `light` or `dark`
- `theme`: optional `light`, `dark`, or `satellite`
- `attribution`: optional attribution HTML. MapLibre automatically reads attribution from vector
  style sources and TileJSON metadata. Set this for direct raster tile templates when the provider
  does not supply attribution metadata.

Provider attribution and branding requirements vary. Ensure each configured style meets its
provider's current terms; hiding attribution only in an application menu may not be sufficient.

## `client.uiconSets`

Configure any UIcon repo.

```toml
[[client.uiconSets]]
id = "internalName"
name = "User-facing name"
url = "https://raw.githubusercontent.com/.../"
# base = { scale = 1 }
# pokemon = { default = true, scale = 0.5 }
```

- One set should use id `DEFAULT`, it's expected for that to be [wwm-uicons](https://github.com/watwowmap/wwm-uicons).
- `url` must be a valid link to a repo that follows the UIcon standard
- You should never change or remove an ID, as this may cause the site to break for your existing users

Modifiers can be used to adjust sizing and positioning for icons on the map.

- `base` is applied to all icons
- Supported modifier keys: `pokemon`, `pokestop`, `gym`, `station`, `tappable`, `quest`, `invasion`, `max_battle`, `raid_pokemon`, `raid_pokemon_6`, `raid_egg`, `raid_egg_6`
- Supported modifier fields:
  - `default` to make this the default set for this object
  - `scale` to modify the icon's size
  - `offsetX`/`offsetY` to modify the icon's position
  - `spacing` to control the space between icons, when they can be displayed as an array
