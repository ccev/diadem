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

Paid requests include an `Idempotency-Key` header. The key identifies a single request for the authenticated profile: repeat requests with the same key and body replay the original response, while a key used for a different request returns `409 Conflict`.

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
  "name": "Gym Or Sation Name",
  "latitude": 41.660911,
  "longitude": -0.896511,
  "pokemon_id": 150,
  "form": 0,
  "temp_evolution_id": 0,
  "alignment": 0,
  "bread_mode": 0,
  "gender": 1,
  "level": 5,
  "move_1": 234,
  "move_2": 87,
  "start_timestamp": 1782470400,
  "end_timestamp": 1782473100
}
```

Optional fields may be omitted when unknown or inapplicable

### Session

```json
{
	"session_id": "980d0a16-f0d2-4c9b-9fb7-b9ed9bd79bb2",
	"state": "invites_sent",
	"battle": {},
	"lobby": {
		"player_count": 10,
		"join_end_ms": 1782472000000
	},
	"invitees": {
		"123412341234": {
			"invited": true,
			"in_lobby": false
		}
	}
}
```

`battle` is a [Battle](#battle) object. `lobby` may be omitted or `null` when unavailable. `join_end_ms` is the Unix timestamp in milliseconds after which players can no longer join the lobby. `invitees` is keyed by requested friend code and reports whether that player was invited and is in the lobby. Failed sessions include an `error` string.

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

Returns active, hatched raid groups and active Max Battle groups.

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

## `POST /friends`

Sends a friend invitation.

Request:

```json
{
  "code": "123456789012"
}
```

`200 OK`:

```json
{
  "friend": {
    "friend_code": "123456789012",
    "name": "TrainerName",
    "already_friends": false,
    "invite_sent": true
  }
}
```

`already_friends` is true and `invite_sent` is false when the selected bot is already friends with that trainer. A successful invite has `already_friends: false` and `invite_sent: true`.

Possible errors: `400 Bad Request` for an invalid body or friend code, `404 Not Found` when a profile is not found, and `409 Conflict` when no worker is available.

## `POST /battle`

Starts a paid invite session for any active battle matching the supplied boss.

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

Starts a paid invite session for a specific gym raid. The gym ID determines the battle.

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

Starts a paid invite session for a specific Max Battle station. The station ID determines the battle.

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

Returns a [Session](#session) for the authenticated token, including the current per-player `invitees` status map.

`200 OK`: a [Session](#session) object.

`404 Not Found` when the session does not exist or does not belong to the authenticated token.

## Error responses

Unless stated otherwise, errors use this shape:

```json
{ "error": "description of the error" }
```

Paid requests can return `402 Payment Required` when the profile has insufficient credit:

```json
{ "error": "insufficient credit" }
```

`409 Conflict` is returned when an idempotency key is reused for another request or its original request is still running:

```json
{ "error": "idempotency key was used for a different request" }
```

```json
{ "error": "request is still in progress" }
```
