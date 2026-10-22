---
title: Biomes API
description: Interface for a biome backend to be compatible with Diadem
---

This page has been mostly AI-generated.

This reference defines the backend API used by Diadem's Biomes integration. Provide a compatible
backend and configure its base URL under [`server.biomes`](/reference/configuration/#serverbiomes) to enable.

## Authentication and requests

Return JSON with `Content-Type: application/json`. Diadem sends `Accept: application/json` and
uses `Content-Type: application/json` for POST requests. When `server.biomes.secret` is configured,
it includes:

```http
Authorization: Bearer <token>
```

Endpoint paths below are appended to the configured base URL. These routes take **no query
parameters**; the backend resolves weather automatically.

## Cell IDs and batches

Every `cell_id` must be a full, valid **level 16 S2 cell ID**, encoded as an unsigned decimal
**string**, for example `"5161524385613348864"`. 

Both POST endpoints accept the same object:

```json
{
  "cells": ["5161524385613348864"]
}
```

Both return `{"biomes": [...]}`. Return one entry for every requested cell, **preserving input
order and duplicates**. `{"cells": []}` returns `{"biomes": []}`. GET endpoints return the
individual object directly, without the `biomes` wrapper.

| Limit | Maximum |
| --- | --- |
| Geography profile batch | 50,000 cells |
| Pool result batch | 100 cells |

Diadem currently uses `POST /api/biomes` for map geography and
`GET /api/biomes/{cell_id}/pools` for popup distributions. The other two endpoints complete the
contract but are not currently called by Diadem.

Each geography lookup sends all uncached cell IDs in one POST request, without splitting them into
smaller batches. The backend's body-size limit must accommodate 50,000 full decimal cell IDs.

## Objects

### Geography profile

```json
{
  "cell_id": "5161524385613348864",
  "fields": {
    "landform": 4,
    "landcover": 3,
    "temperature": 2,
    "features": [4]
  },
  "geography_updated_at": 1792497600,
  "pools_updated_at": 1792497600
}
```

- `cell_id` and `fields` are required. Return `fields: null` for unknown, unavailable or
  conflicting geography, including valid undiscovered cells.
- Properties inside `fields` are optional. `landform`, `landcover` and `temperature` are integer
  enum codes; `features` is an array of integer codes. Preserve unknown enum values and feature
  order/repetition. An absent field means unknown; code `0` means explicitly unset.
- `geography_updated_at` is the latest geography observation, in Unix **seconds**; omit it if unknown.
- `pools_updated_at` is the latest applicable live pool evidence or model promotion, in Unix
  **seconds**; omit it if unknown.
- Timestamps indicate observation/update freshness, not necessarily a change in values.

Diadem currently labels the following enum codes. Unknown codes remain visible with their numeric ID.

| Field | Codes |
| --- | --- |
| `landform` | `1` mountains, `2` hills, `3` tablelands, `4` plains |
| `landcover` | `1` cropland, `2` shrubland, `3` forest, `4` grassland, `5` settlements, `6` sparse, `8` snow/ice |
| `temperature` | `1` boreal, `2` cool temperate, `3` warm temperate, `4` subtropical, `5` tropical, `6` polar |
| `features` | `1` city, `2` beach, `3` ocean, `4` river, `5` lake, `6` desert |

Names use temperature + landcover, with **Mountainous** or **Hilly** added for landform `1` or `2`.
Features replace the landcover in both names and colors, with priority **water → beach → desert → city → landcover**.
Two or more distinct water features use **Waters**; a single one uses **Ocean**, **River** or **Lake**.
For example, a cool hilly forest with a city feature is **Cool Hilly City**.
Missing or unsupported naming data uses the single **Biome** fallback.

### Pool result

```json
{
  "cell_id": "5161524385613348864",
  "components": [
    {
      "name": "background",
      "share": 0.931,
      "spawns": [{ "pokemon_id": 1, "form": 0, "weight": 0.25 }]
    },
    {
      "name": "regional",
      "share": 0.049,
      "spawns": []
    },
    {
      "name": null,
      "share": 0.02,
      "spawns": [{ "pokemon_id": 774, "form": 3380, "weight": 1 }]
    }
  ]
}
```

`cell_id` and the `components` **array** are required. Each component contains:

- `name`: a string for ordinary components, or `null` for a special pool. Multiple unnamed
  components and future string names are valid; do not merge components by name.
- `share`: a number between `0` and `1`, the component's fraction of ordinary spawns.
- Either `spawns`, an array of species/form weights, or `variants`, as described below.

Each spawn requires a positive integer `pokemon_id`, an integer `form`, and a `weight` between
`0` and `1`. The weight is the species/form probability **within that component**.

Background and regional components are always present, including when distribution data is
unavailable. Inactive optional components are omitted. An empty `spawns` array means
**unavailable distribution data**, not that zero species can spawn.

Diadem uses presets for `background`, `event` and `regional`. Unnamed and unknown named components
each appear as **Special Spawns**.

### Unresolved variants

A component may return `variants` **instead of** `spawns`:

```json
{
  "name": "regional",
  "share": 0.05,
  "variants": [
    { "spawns": [{ "pokemon_id": 122, "form": 0, "weight": 0.2 }] },
    { "spawns": [{ "pokemon_id": 122, "form": 0, "weight": 0.4 }] }
  ]
}
```

Variants are alternatives, not independent contributions. Preserve the per-pair minimum and
maximum across variants: this example contributes **1–2%**. Do not average or add variants
together. Contributions from other components are added to the corresponding range bounds.

## `GET /api/biomes/{cell_id}`

Returns one [geography profile](#geography-profile) directly.

For an undiscovered valid cell, return `200 OK` with:

```json
{ "cell_id": "5161524385613348864", "fields": null }
```

## `POST /api/biomes`

Accepts the [batch request](#cell-ids-and-batches), up to 50,000 cells. Returns `200 OK` with
ordered geography profiles:

```json
{
  "biomes": [
    {
      "cell_id": "5161524385613348864",
      "fields": { "landform": 4, "landcover": 3, "temperature": 2, "features": [4] }
    }
  ]
}
```

## `GET /api/biomes/{cell_id}/pools`

Returns one [pool result](#pool-result) directly with `200 OK`. Diadem fetches it only when a
popup needs it; no weather or location query parameters are sent.

## `POST /api/biomes/pools`

Accepts the [batch request](#cell-ids-and-batches), up to 100 cells. Returns `200 OK` with
`{"biomes": [...]}`, containing one [pool result](#pool-result) for each requested cell in order,
including duplicates.

## Errors and caching

- Invalid IDs, wrong S2 levels or malformed batches return **HTTP 400 for the whole request**
- Valid undiscovered cells return **HTTP 200** with nullable geography or unavailable distributions
- Pool storage failures return **HTTP 503**
- Authentication failures use an appropriate non-success HTTP status

Diadem caches valid profiles (including undiscovered cells) and popup pool results for one minute,
coalesces overlapping lookups, and caps concurrent upstream requests at four. Requests time out
after 15 seconds. Failed or malformed responses are not cached as missing data.
