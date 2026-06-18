---
title: Web Push Spawn Alerts
description: Set up server-driven Pokémon spawn notifications via Web Push
---

Diadem can send system-level push notifications when Pokémon matching a user's alert rules appear on the map, even when the browser tab is closed. Spawns are received from Golbat via an authenticated webhook.

## Requirements

- **HTTPS** (or `localhost`). Browsers only allow service workers and push subscriptions on secure origins.
- **Production/preview build.** The service worker is not active during `pnpm run dev`. Build with `pnpm run build` and run the built output to test notifications end-to-end.
- **PWA install (recommended on Android).** Installing the app to the home screen improves notification delivery reliability.

## 1. Generate VAPID keys

VAPID keys identify your server to push services. Generate them once:

```bash
pnpm run push:keys
```

The command prints a `vapidPublicKey` and `vapidPrivateKey`. Copy both — you will need them in the next step.

Generate a random `intakeSecret` to authenticate Golbat's webhook requests:

```bash
openssl rand -hex 32
```

## 2. Configure `[server.push]`

Add the following section to `config/config.toml`:

```toml
[server.push]
enabled = true
vapidPublicKey = "..."         # printed by pnpm run push:keys
vapidPrivateKey = "..."        # printed by pnpm run push:keys — keep secret
vapidSubject = "mailto:you@example.com"
maxPerUserPerHour = 30         # per-user hourly alert cap
intakeSecret = "..."           # generated with openssl rand -hex 32
```

Set `vapidSubject` to a `mailto:` address you control. See the [configuration reference](/reference/configuration/#serverpush) for full option descriptions.

## 3. Push the database schema

After enabling push, create the required table:

```bash
pnpm run db:push
```

If prompted, choose **create table** for `push_subscription`.

## 4. Configure Golbat webhooks

Diadem receives Pokémon spawn events at `POST /intake/golbat`, authenticated via an `Authorization` header. In your Golbat config, add:

```toml
[[webhooks]]
url = "https://yourmap.example/intake/golbat"
types = ["pokemon"]

[webhooks.header_map]
Authorization = "Bearer <intakeSecret>"
```

Replace `<intakeSecret>` with the same value you set in `[server.push]`. Diadem rejects requests with a missing or wrong secret with HTTP 401.

## 5. Usage

For now the push UI lives on the `/test` page. From there you can:

- Enable push notifications for your browser
- Create alert rules (Pokémon ID + optional minimum IV)
- Send a test push to verify everything is wired up

A dedicated menu integrated into the main UI is planned for a future release.

## Known limitations

- Push evaluates only `everyone` and `loggedIn` area permissions. Areas gated by `guildId` or `roleId` are **not** evaluated for push yet — affected users simply receive no alert in those areas rather than receiving alerts they shouldn't. Instances that grant pokemon features to `everyone` are not affected by this limitation.
- Only Pokémon alerts are supported. Raids, quests, and invasions are not yet supported.
