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
defaultNestName = "Unknown Nest"
```

- `url`: Golbat base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Golbat secret
- `defaultNestName`: The default nest name, as configured in Fletchling

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

Diadem supports different geocoding providers for address search. It's recommended to use Photon.

### `server.photon`

```toml
[server.photon]
url = "https://photon.komoot.io/"
# basicAuth = "user:pass"
```

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
url = "http://127.0.0.1:5000/"
# basicAuth = "user:pass"
```

## `server.auth`

```toml
[server.auth]
enabled = true
optional = true
```

- `enabled`: Enables authentication
- `optional`: If `true`, show a login prompt in the menu. If `false`, lock the app behind a login prompt.

```toml
[server.auth.discord]
clientId = ""
clientSecret = ""
redirectUri = "https://map.example.com/login/discord/callback"
```

Currently, only Discord auth is supported.

Get your client ID and secret by setting up an application in the [Discord Developer Portal](https://discord.com/developers/applications)
and enabling OAuth2. Make sure to set up a redirect that matches the value in `redirectUri` and points to your domain.

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
# areas = ["London"]
features = ["gym", "pokestop"]
```

Rules are additive. For every rule a user matches, they get access to all its areas and features. `config.example.toml` shows some examples.

Rule match fields:

- `everyone` (bool)
- `loggedIn` (bool)
- `guildId` (Discord guild id)
- `roleId` (Discord role id)

Grant fields:

- `areas`: Koji area names (optional)
- `features`: one or more feature keys

Supported feature keys include:

- `*` for everything
- `pokemon`, `pokestop`, `gym`, `station`, `nest`, `spawnpoint`, `route`, `tappable`, `s2cell`, `weather`, `scout`

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

- `server.db`: external Golbat DB used for data queries
- `server.internalDb`: internal Diadem DB used for users/sessions

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
```

- branding and defaults for map and metadata
- `customHome`: When true, `/` renders custom home and map moves to `/map`
- `defaultLat`, `defaultLon`, `defaultZoom`: The default map position for first-time users
- `minZoom`, `maxZoom`: Locking users into a map zoom range
- `url`, `image`, `description`: SEO/OpenGraph metadata
- `allowCrawlers`, `disallowedPaths`: robots.txt config

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
```

Supported keys:

- `id`: unique id
- `name`: display name
- `url`: style URL
- `default`: optional `light` or `dark`

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
