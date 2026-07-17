---
title: Auto Battle API
description: API reference for Auto Battle backends compatible with Diadem
---

This reference defines the backend API used by Diadem's Auto Battle feature. Implementations must expose these endpoints under an API base URL and return JSON for every response.

## Authentication

All endpoints require a bearer token:

```http
Authorization: Bearer <token>
```

Reject missing or invalid tokens with `401 Unauthorized`:

```json
{ "error": "valid bearer token required" }
```

```json
{ "error": "invalid bearer token" }
```

Diadem sends an `Idempotency-Key` header with paid `POST` requests. Supporting it is optional. Backends may ignore the header.

## Objects

### Boss

```json
{
  "type": "raid",
  "pokemon_id": 150,
  "form": 0,
  "temp_evolution_id": 0,
  "alignment": 0,
  "bread_mode": 0,
  "gender": 1
}
```

`type` is `raid` or `max_battle`; `pokemon_id` is required. All other fields are optional filters. `bread_mode` applies only to Max Battles, and `temp_evolution_id` applies only to raids.

### Battle

```json
{
  "type": "raid",
  "id": "gym-or-station-id",
  "name": "Location name",
  "latitude": 41.660911,
  "longitude": -0.896511,
  "pokemon_id": 150,
  "form": 0,
  "temp_evolution_id": 0,
  "alignment": 0,
  "bread_mode": 0,
  "gender": 1,
  "level": 5,
  "start_timestamp": 1782470400,
  "end_timestamp": 1782473100
}
```

Optional fields may be omitted when unknown or inapplicable.

### Session

```json
{
  "session_id": "980d0a16-f0d2-4c9b-9fb7-b9ed9bd79bb2",
  "state": "invites_sent",
  "battle": {},
  "lobby": {
    "player_count": 10,
    "join_end_ms": 1782472000000
  }
}
```

`battle` is a [Battle](#battle) object. `lobby` may be omitted or `null` when unavailable. Failed sessions include an `error` string.

Valid session states are `queued`, `awaiting_friend_accept`, `friend_ready`, `scanning_battle`, `finding_lobby`, `inviting`, `invites_sent`, `completed`, and `failed`.

## `GET /health`

`200 OK`:

```json
{ "status": "ok" }
```

`503 Service Unavailable`:

```json
{ "status": "degraded" }
```

```json
{ "status": "down" }
```

## `GET /battle/available`

Returns active battle groups.

`200 OK`:

```json
{
  "bosses": [
    {
      "type": "raid",
      "pokemon_id": 150,
      "form": 0,
      "level": 5,
      "count": 4
    }
  ]
}
```

Each entry is a [Boss](#boss) plus `level` and `count`, the number of matching active battles.

## `POST /friends/profiles`

Looks up one to ten friend codes.

Request:

```json
{
  "codes": ["123456789012", "987654321098"]
}
```

`200 OK`:

```json
{
  "profiles": [
    {
      "friend_code": "123456789012",
      "team_id": 1,
      "name": "TrainerName",
      "level": 50,
      "already_friends": true
    }
  ]
}
```

`team_id` is `0` for unset, `1` for Mystic, `2` for Valor, and `3` for Instinct.

Possible errors: `400 Bad Request` for an invalid body or friend-code count, `404 Not Found` when a profile is not found, and `409 Conflict` when no worker is available.

## `POST /battle`

Starts an invite session for any active battle matching the supplied boss.

Request:

```json
{
  "friend_codes": ["123456789012", "987654321098"],
  "boss": {
    "type": "raid",
    "pokemon_id": 150,
    "form": 0
  }
}
```

`202 Accepted`:

```json
{
  "session_id": "980d0a16-f0d2-4c9b-9fb7-b9ed9bd79bb2",
  "battle": {},
  "lobby": {
    "player_count": 10,
    "join_end_ms": 1782472000000
  }
}
```

`battle` is a [Battle](#battle) object. `lobby` may be omitted or `null` when unavailable.

Possible errors: `400 Bad Request` for an invalid body or boss, `404 Not Found` when no matching battle is available, and `409 Conflict` when no worker is available.

## `POST /battle/gym/{id}`

Starts an invite session for a specific gym raid. The gym ID determines the battle.

Request:

```json
{
  "friend_codes": ["123456789012", "987654321098"],
  "lat": 41.660911,
  "lon": -0.896511
}
```

`202 Accepted`: the response shape from `POST /battle`.

Possible errors: `400 Bad Request`, `404 Not Found` when the gym has no active matching raid, and `409 Conflict` when no worker is available.

## `POST /battle/station/{id}`

Starts an invite session for a specific Max Battle station. The station ID determines the battle.

Request:

```json
{
  "friend_codes": ["123456789012", "987654321098"],
  "lat": 41.660911,
  "lon": -0.896511
}
```

`202 Accepted`: the response shape from `POST /battle`.

Possible errors: `400 Bad Request`, `404 Not Found` when the station has no active matching Max Battle, and `409 Conflict` when no worker is available.

## `GET /battle/status/{session_id}`

Returns a [Session](#session) for the authenticated token.

`200 OK`: a [Session](#session) object.

`404 Not Found` when the session does not exist or does not belong to the authenticated token.

## Error responses

Unless stated otherwise, errors use this shape:

```json
{ "error": "description of the error" }
```

Backends may return `402 Payment Required` when a request cannot be accepted because payment is required. A backend that implements idempotency may return `409 Conflict` when a key is reused for a different request or a matching request is still in progress.
