# Web Push Spawn-Alert Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Web Push system notifications for Pokémon spawns that match per-user alert rules, driven by Golbat webhooks posted to a guarded intake endpoint.

**Architecture:** Golbat POSTs batched pokemon webhooks to a secret-guarded `POST /intake/golbat`. The server maps each spawn to an internal shape, matches it against an in-memory registry of users' alert rules (respecting location-based permissions), dedupes, rate-limits, and dispatches Web Push via the `web-push` library. The service worker shows the notification. All UI lives on `/test`; the existing map/filter UI is untouched.

**Tech Stack:** SvelteKit (`adapter-node`, SSR disabled), Svelte 5 runes, Drizzle (MySQL internal DB), zod, `web-push`, existing service worker in `src/lib/serviceWorker/`.

**Spec:** `docs/superpowers/specs/2026-06-18-web-push-spawn-alerts-design.md`

---

## Verification approach (read first)

This project has **no test runner** (`package.json` has no `test` script; `CLAUDE.md` says tests are not implemented — ignore `pnpm test`). Per user instructions, this plan does **not** introduce a test framework. Instead, every task is verified by:

1. `pnpm run check` (svelte-check + tsc strict) — **must report 0 errors**.
2. Concrete runtime checks (curl, build+preview) where a task has observable behavior.

Indentation in this codebase is **tabs** (enforced by prettier). Run `pnpm run format` before committing if unsure.

---

## File structure

**Create:**
- `scripts/generate-vapid-keys.ts` — one-off VAPID keypair generator.
- `src/lib/features/notifications/pushTypes.ts` — **client-safe** shared types (`MinMax`, `PushAlertRule`). Lives outside `src/lib/server/` so the `/test` UI can import it (SvelteKit blocks client imports from `$lib/server`).
- `src/lib/server/push/types.ts` — server-only types (`StoredSubscription`, `MatchablePokemon`, `PushPayload`); re-exports the shared types.
- `src/lib/server/push/schemas.ts` — zod schemas (alert rules, subscription, golbat webhook envelope).
- `src/lib/server/push/matcher.ts` — pure rule matching + IV computation.
- `src/lib/server/push/mapWebhook.ts` — Golbat webhook → `MatchablePokemon`.
- `src/lib/server/push/sender.ts` — `web-push` wrapper + dead-subscription pruning.
- `src/lib/server/push/permissions.ts` — build a `FeaturePermissionContext` for an offline user.
- `src/lib/server/push/registry.ts` — in-memory subscriber registry + rate limit + dedupe.
- `src/lib/server/push/dispatch.ts` — orchestrates registry + matcher + sender.
- `src/lib/serviceWorker/push.ts` — SW `push`/`notificationclick`/`pushsubscriptionchange`.
- `src/lib/features/notifications/push.ts` — client subscribe/unsubscribe + reactive state.
- `src/routes/api/notifications/subscribe/+server.ts`
- `src/routes/api/notifications/unsubscribe/+server.ts`
- `src/routes/api/notifications/alerts/+server.ts`
- `src/routes/api/notifications/test/+server.ts`
- `src/routes/intake/golbat/+server.ts`

**Modify:**
- `src/lib/services/config/configTypes.d.ts` — add `push` to `ServerConfig` and `ClientConfig`.
- `src/lib/services/config/config.server.ts` — inject public push config into client config.
- `src/lib/server/config.toml` + `config/config.example.toml` — `[server.push]` section.
- `src/lib/server/db/internal/schema.ts` — `pushSubscription` table + `pushAlerts` column.
- `src/lib/server/db/internal/repository.ts` — push repo helpers.
- `src/lib/serviceWorker/index.ts` — wire push handlers.
- `src/lib/server/init.ts` — warm the registry.
- `src/routes/test/+page.svelte` — push + rule-editor UI.
- `package.json` — `web-push` dep + `push:keys` script.
- `docs/` — config + Golbat webhook setup docs.

---

## Task 1: Add `web-push` dependency and VAPID key generator

**Files:**
- Modify: `package.json`
- Create: `scripts/generate-vapid-keys.ts`

- [ ] **Step 1: Install web-push**

Run:
```bash
pnpm add web-push && pnpm add -D @types/web-push
```

- [ ] **Step 2: Create the key generator script**

Create `scripts/generate-vapid-keys.ts`:
```ts
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Add these to config.toml under [server.push]:\n");
console.log(`vapidPublicKey = "${keys.publicKey}"`);
console.log(`vapidPrivateKey = "${keys.privateKey}"`);
console.log(`\nAlso set vapidSubject = "mailto:you@example.com"`);
```

- [ ] **Step 3: Add the package script**

In `package.json` `"scripts"`, add:
```json
"push:keys": "node --experimental-strip-types scripts/generate-vapid-keys.ts"
```

- [ ] **Step 4: Verify the generator runs**

Run: `pnpm run push:keys`
Expected: prints `vapidPublicKey = "..."` and `vapidPrivateKey = "..."`. Keep this output for Task 2's local config.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/generate-vapid-keys.ts
git commit -m "feat(push): add web-push dependency and VAPID key generator"
```

---

## Task 2: Config types, config files, and client exposure

**Files:**
- Modify: `src/lib/services/config/configTypes.d.ts`
- Modify: `src/lib/services/config/config.server.ts`
- Modify: `src/lib/server/config.toml`
- Modify: `config/config.example.toml`

- [ ] **Step 1: Add `push` to `ServerConfig`**

In `src/lib/services/config/configTypes.d.ts`, inside `export type ServerConfig = { ... }`, add a new optional member (e.g. after `staticMap?`):
```ts
	push?: {
		enabled: boolean;
		vapidPublicKey: string;
		vapidPrivateKey: string;
		vapidSubject: string;
		maxPerUserPerHour: number;
		intakeSecret: string;
	};
```

- [ ] **Step 2: Add `push` to `ClientConfig`**

In the same file, inside `export type ClientConfig = { ... }`, add:
```ts
	push?: {
		enabled: boolean;
		vapidPublicKey: string;
	};
```

- [ ] **Step 3: Inject public push config into the client config**

Replace the body of `getClientConfig` in `src/lib/services/config/config.server.ts`:
```ts
export function getClientConfig() {
	const push = config.server.push;
	return {
		...config.client,
		push: push?.enabled
			? { enabled: true, vapidPublicKey: push.vapidPublicKey }
			: { enabled: false, vapidPublicKey: "" }
	} satisfies Config["client"];
}
```
(The private key and intake secret are never included.)

- [ ] **Step 4: Add the config section to both TOML files**

Append to `src/lib/server/config.toml` and `config/config.example.toml`:
```toml
[server.push]
enabled = true
vapidPublicKey = "PASTE_PUBLIC_KEY"
vapidPrivateKey = "PASTE_PRIVATE_KEY"
vapidSubject = "mailto:you@example.com"
maxPerUserPerHour = 30
intakeSecret = "CHANGE_ME_LONG_RANDOM_STRING"
```
In `src/lib/server/config.toml` (your live config), paste the real keys from Task 1 and a real random `intakeSecret` (e.g. `openssl rand -hex 32`). In `config.example.toml` leave the placeholders.

- [ ] **Step 5: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/config/configTypes.d.ts src/lib/services/config/config.server.ts config/config.example.toml
git commit -m "feat(push): add [server.push] config and expose public key to client"
```
(Note: `src/lib/server/config.toml` is gitignored/symlinked per setup.sh — do not commit real secrets.)

---

## Task 3: Database schema — subscriptions table and alerts column

**Files:**
- Modify: `src/lib/server/db/internal/schema.ts`

- [ ] **Step 1: Add `pushAlerts` column to the `user` table**

In `src/lib/server/db/internal/schema.ts`, inside the `user` table column object (after `userSettings: json("user_settings"),`), add:
```ts
		pushAlerts: json("push_alerts"),
```

- [ ] **Step 2: Add the `pushSubscription` table**

At the end of `src/lib/server/db/internal/schema.ts` (before the final type exports is fine), add:
```ts
export const pushSubscription = mysqlTable(
	"push_subscription",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id),
		endpoint: text("endpoint").notNull(),
		endpointHash: varchar("endpoint_hash", { length: 64 }).notNull(),
		p256dh: text("p256dh").notNull(),
		auth: text("auth").notNull(),
		userAgent: text("user_agent"),
		failureCount: int("failure_count").notNull().default(0),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		endpointHashUnique: uniqueIndex("push_subscription_endpoint_hash_unique").on(
			table.endpointHash
		),
		userIdIdx: index("push_subscription_user_id_idx").on(table.userId)
	})
);

export type PushSubscriptionRow = typeof pushSubscription.$inferSelect;
```

- [ ] **Step 3: Add the `int` import**

At the top of the file, add `int` to the `drizzle-orm/mysql-core` import list (it currently imports `boolean, datetime, index, json, mysqlTable, text, uniqueIndex, varchar`):
```ts
import {
	boolean,
	datetime,
	index,
	int,
	json,
	mysqlTable,
	text,
	uniqueIndex,
	varchar
} from "drizzle-orm/mysql-core";
```

- [ ] **Step 4: Push the schema to the DB**

Run: `pnpm run db:push`
Expected: drizzle-kit reports creating table `push_subscription` and adding column `push_alerts` to `user`. Confirm no destructive prompts beyond these additions.

- [ ] **Step 5: Verify types**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/db/internal/schema.ts
git commit -m "feat(push): add push_subscription table and user.push_alerts column"
```

---

## Task 4: Push types and zod schemas

**Files:**
- Create: `src/lib/features/notifications/pushTypes.ts`
- Create: `src/lib/server/push/types.ts`
- Create: `src/lib/server/push/schemas.ts`

- [ ] **Step 1a: Create the client-safe shared types**

Create `src/lib/features/notifications/pushTypes.ts` (importable from both client and server — must NOT live under `src/lib/server/`):
```ts
export type MinMax = { min: number; max: number };

/** A single alert rule. Lean, self-contained — NOT the map-filter Filterset. */
export type PushAlertRule = {
	id: string;
	enabled: boolean;
	name?: string;
	pokemon?: { pokemon_id: number; form?: number }[];
	iv?: MinMax;
	level?: MinMax;
	cp?: MinMax;
	size?: MinMax;
	gender?: number[];
};
```

- [ ] **Step 1b: Create the server-only types**

Create `src/lib/server/push/types.ts` (re-exports the shared types so server modules can keep importing from `./types`):
```ts
export type { MinMax, PushAlertRule } from "@/lib/features/notifications/pushTypes";

/** Pokémon fields the matcher needs, mapped from the Golbat webhook. */
export type MatchablePokemon = {
	encounterId: string;
	pokemonId: number;
	form: number;
	lat: number;
	lon: number;
	despawnMs: number; // expire_timestamp * 1000; 0 if unknown
	iv?: number; // 0..100 overall, computed from atk/def/sta
	atkIv?: number;
	defIv?: number;
	staIv?: number;
	level?: number;
	cp?: number;
	size?: number;
	gender?: number;
};

export type StoredSubscription = {
	id: string;
	endpoint: string;
	endpointHash: string;
	p256dh: string;
	auth: string;
};

export type PushPayload = {
	title: string;
	body: string;
	tag: string;
	url: string;
};
```

- [ ] **Step 2: Create the zod schemas**

Create `src/lib/server/push/schemas.ts`:
```ts
import { z } from "zod";

const minMax = z.object({ min: z.number(), max: z.number() });

export const alertRuleSchema = z.object({
	id: z.string().min(1).max(64),
	enabled: z.boolean(),
	name: z.string().max(120).optional(),
	pokemon: z
		.array(z.object({ pokemon_id: z.number().int(), form: z.number().int().optional() }))
		.optional(),
	iv: minMax.optional(),
	level: minMax.optional(),
	cp: minMax.optional(),
	size: minMax.optional(),
	gender: z.array(z.number().int()).optional()
});

export const alertRulesSchema = z.array(alertRuleSchema).max(50);

export const subscriptionSchema = z.object({
	endpoint: z.string().url(),
	keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) })
});

export const unsubscribeSchema = z.object({ endpoint: z.string().url() });

/** Golbat posts a batched array of { type, message }. */
export const golbatWebhookSchema = z.array(
	z.object({ type: z.string(), message: z.record(z.unknown()) })
);
```

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/notifications/pushTypes.ts src/lib/server/push/types.ts src/lib/server/push/schemas.ts
git commit -m "feat(push): add push types and zod schemas"
```

---

## Task 5: Pure rule matcher

**Files:**
- Create: `src/lib/server/push/matcher.ts`

> Note: we deliberately do NOT import `src/lib/features/filterLogic/pokemon.ts` or `pokemonUtils.ts` server-side — both transitively import `.svelte`/`.svelte.ts` client state (`userSettings.svelte`, `activeSearch.svelte`). This matcher reimplements the small comparison logic against `MatchablePokemon`.

- [ ] **Step 1: Create the matcher**

Create `src/lib/server/push/matcher.ts`:
```ts
import type { MatchablePokemon, MinMax, PushAlertRule } from "./types";

function inRange(value: number | undefined, range: MinMax): boolean {
	if (value == null) return false;
	return value >= range.min && value <= range.max;
}

/** True if the rule constrains on IV-derived data (gates POKEMON_IV permission). */
export function ruleUsesIv(rule: PushAlertRule): boolean {
	return Boolean(rule.iv || rule.cp || rule.level || rule.size);
}

/** Returns the first enabled rule that matches, or undefined. */
export function matchRules(
	pokemon: MatchablePokemon,
	rules: PushAlertRule[]
): PushAlertRule | undefined {
	for (const rule of rules) {
		if (!rule.enabled) continue;

		if (
			rule.pokemon &&
			!rule.pokemon.find(
				(p) => p.pokemon_id === pokemon.pokemonId && (p.form == null || p.form === pokemon.form)
			)
		) {
			continue;
		}

		if (rule.iv && !inRange(pokemon.iv, rule.iv)) continue;
		if (rule.cp && !inRange(pokemon.cp, rule.cp)) continue;
		if (rule.level && !inRange(pokemon.level, rule.level)) continue;
		if (rule.size && !inRange(pokemon.size, rule.size)) continue;
		if (rule.gender && pokemon.gender != null && !rule.gender.includes(pokemon.gender)) continue;

		return rule;
	}
	return undefined;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/push/matcher.ts
git commit -m "feat(push): add pure alert-rule matcher"
```

---

## Task 6: Golbat webhook field mapping

**Files:**
- Create: `src/lib/server/push/mapWebhook.ts`

- [ ] **Step 1: Create the mapper**

Create `src/lib/server/push/mapWebhook.ts`:
```ts
import { golbatWebhookSchema } from "./schemas";
import type { MatchablePokemon } from "./types";

function num(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Parse a Golbat webhook batch and return matchable pokemon.
 * Golbat pokemon message fields: encounter_id, pokemon_id, latitude, longitude,
 * disappear_time (unix seconds), individual_attack/defense/stamina, pokemon_level,
 * cp, form, size, gender. IV fields are null until the mon is encountered.
 */
export function mapGolbatPokemon(body: unknown): MatchablePokemon[] {
	const parsed = golbatWebhookSchema.safeParse(body);
	if (!parsed.success) return [];

	const result: MatchablePokemon[] = [];
	for (const entry of parsed.data) {
		if (entry.type !== "pokemon") continue;
		const m = entry.message as Record<string, unknown>;

		const pokemonId = num(m.pokemon_id);
		const lat = num(m.latitude);
		const lon = num(m.longitude);
		if (pokemonId == null || lat == null || lon == null) continue;

		const atkIv = num(m.individual_attack);
		const defIv = num(m.individual_defense);
		const staIv = num(m.individual_stamina);
		const iv =
			atkIv != null && defIv != null && staIv != null
				? ((atkIv + defIv + staIv) / 45) * 100
				: undefined;

		result.push({
			encounterId: typeof m.encounter_id === "string" ? m.encounter_id : String(m.encounter_id),
			pokemonId,
			form: num(m.form) ?? 0,
			lat,
			lon,
			despawnMs: (num(m.disappear_time) ?? 0) * 1000,
			iv,
			atkIv,
			defIv,
			staIv,
			level: num(m.pokemon_level),
			cp: num(m.cp),
			size: num(m.size),
			gender: num(m.gender)
		});
	}
	return result;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/push/mapWebhook.ts
git commit -m "feat(push): map Golbat pokemon webhook to matchable shape"
```

---

## Task 7: Repository helpers

**Files:**
- Modify: `src/lib/server/db/internal/repository.ts`

- [ ] **Step 1: Add imports and helpers**

Append to `src/lib/server/db/internal/repository.ts` (the file already imports `db`, `table`, `eq`). Add `and` to the drizzle import and `randomUUID`/`createHash` from node:
```ts
import { and, eq } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import type { PushAlertRule, StoredSubscription } from "@/lib/server/push/types";
```
(Adjust the existing `import { eq } from "drizzle-orm";` line to `import { and, eq } from "drizzle-orm";`.)

- [ ] **Step 2: Add subscription + alert helpers**

Append these functions:
```ts
export function hashEndpoint(endpoint: string): string {
	return createHash("sha256").update(endpoint).digest("hex");
}

export async function upsertPushSubscription(input: {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent: string | null;
}): Promise<void> {
	const endpointHash = hashEndpoint(input.endpoint);
	const now = new Date();
	const [existing] = await db
		.select({ id: table.pushSubscription.id })
		.from(table.pushSubscription)
		.where(eq(table.pushSubscription.endpointHash, endpointHash));

	if (existing) {
		await db
			.update(table.pushSubscription)
			.set({
				userId: input.userId,
				endpoint: input.endpoint,
				p256dh: input.p256dh,
				auth: input.auth,
				userAgent: input.userAgent,
				failureCount: 0,
				updatedAt: now
			})
			.where(eq(table.pushSubscription.id, existing.id));
		return;
	}

	await db.insert(table.pushSubscription).values({
		id: randomUUID(),
		userId: input.userId,
		endpoint: input.endpoint,
		endpointHash,
		p256dh: input.p256dh,
		auth: input.auth,
		userAgent: input.userAgent,
		failureCount: 0,
		createdAt: now,
		updatedAt: now
	});
}

export async function deletePushSubscriptionByEndpoint(
	userId: string,
	endpoint: string
): Promise<void> {
	await db
		.delete(table.pushSubscription)
		.where(
			and(
				eq(table.pushSubscription.userId, userId),
				eq(table.pushSubscription.endpointHash, hashEndpoint(endpoint))
			)
		);
}

export async function deletePushSubscriptionByHash(endpointHash: string): Promise<void> {
	await db
		.delete(table.pushSubscription)
		.where(eq(table.pushSubscription.endpointHash, endpointHash));
}

export async function getPushSubscriptions(userId: string): Promise<StoredSubscription[]> {
	const rows = await db
		.select()
		.from(table.pushSubscription)
		.where(eq(table.pushSubscription.userId, userId));
	return rows.map((r) => ({
		id: r.id,
		endpoint: r.endpoint,
		endpointHash: r.endpointHash,
		p256dh: r.p256dh,
		auth: r.auth
	}));
}

export async function getPushAlerts(userId: string): Promise<PushAlertRule[]> {
	const [row] = await db
		.select({ pushAlerts: table.user.pushAlerts })
		.from(table.user)
		.where(eq(table.user.id, userId));
	return (row?.pushAlerts as PushAlertRule[] | null) ?? [];
}

export async function setPushAlerts(userId: string, rules: PushAlertRule[]): Promise<void> {
	await db.update(table.user).set({ pushAlerts: rules }).where(eq(table.user.id, userId));
}

/** Returns userIds that have at least one push subscription. The caller
 *  filters further by enabled rules when building registry entries. */
export async function getSubscribedUserIds(): Promise<string[]> {
	const rows = await db
		.selectDistinct({ userId: table.pushSubscription.userId })
		.from(table.pushSubscription);
	return rows.map((r) => r.userId);
}

/** Stored Discord access token for a user (may be expired). "" if none. */
export async function getDiscordAccessTokenForUser(userId: string): Promise<string> {
	const [row] = await db
		.select({ accessToken: table.account.accessToken })
		.from(table.account)
		.where(and(eq(table.account.userId, userId), eq(table.account.providerId, "discord")));
	return row?.accessToken ?? "";
}
```

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/db/internal/repository.ts
git commit -m "feat(push): repository helpers for subscriptions and alert rules"
```

---

## Task 8: Web Push sender

**Files:**
- Create: `src/lib/server/push/sender.ts`

- [ ] **Step 1: Create the sender**

Create `src/lib/server/push/sender.ts`:
```ts
import webpush from "web-push";
import { getServerConfig } from "@/lib/services/config/config.server";
import { deletePushSubscriptionByHash } from "@/lib/server/db/internal/repository";
import { getLogger } from "@/lib/utils/logger";
import type { PushPayload, StoredSubscription } from "./types";

const log = getLogger("push");
let configured = false;

function ensureConfigured(): boolean {
	const push = getServerConfig().push;
	if (!push?.enabled) return false;
	if (!configured) {
		webpush.setVapidDetails(push.vapidSubject, push.vapidPublicKey, push.vapidPrivateKey);
		configured = true;
	}
	return true;
}

/** Send a payload to one subscription. Returns true if the subscription is
 *  now gone (404/410) and was pruned. */
export async function sendToSubscription(
	sub: StoredSubscription,
	payload: PushPayload
): Promise<{ pruned: boolean }> {
	if (!ensureConfigured()) return { pruned: false };

	try {
		await webpush.sendNotification(
			{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
			JSON.stringify(payload)
		);
		return { pruned: false };
	} catch (err) {
		const statusCode = (err as { statusCode?: number }).statusCode;
		if (statusCode === 404 || statusCode === 410) {
			await deletePushSubscriptionByHash(sub.endpointHash);
			log.info(`Pruned gone push subscription ${sub.endpointHash}`);
			return { pruned: true };
		}
		log.warning(`Push send failed (${statusCode}): ${err}`);
		return { pruned: false };
	}
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors. (If `webpush` default import errors under the bundler, change to `import * as webpush from "web-push";` — verify with the check.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/push/sender.ts
git commit -m "feat(push): web-push sender with dead-subscription pruning"
```

---

## Task 9: Offline permission context builder

**Files:**
- Create: `src/lib/server/push/permissions.ts`

- [ ] **Step 1: Create the builder**

Create `src/lib/server/push/permissions.ts`:
```ts
import { updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import { getDiscordAccessTokenForUser } from "@/lib/server/db/internal/repository";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";

const WATCHED_FEATURES = [Features.POKEMON, Features.POKEMON_IV];

/**
 * Build a permission context for a user with no live request. Uses the stored
 * Discord access token; if it is missing/expired, updatePermissions() skips
 * guild rules (canCheckGuildRules === false) and the user falls back to the
 * everyone + loggedIn baseline — the safe default.
 */
export async function buildContextForUser(user: User): Promise<FeaturePermissionContext> {
	const accessToken = await getDiscordAccessTokenForUser(user.id);
	const perms = await updatePermissions(user, accessToken, fetch);
	return new FeaturePermissionContext(perms, WATCHED_FEATURES);
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors. (Confirm `Features.POKEMON` and `Features.POKEMON_IV` exist in `src/lib/utils/features.ts`; they are referenced in `queryPokemon.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/push/permissions.ts
git commit -m "feat(push): build permission context for offline users"
```

---

## Task 10: In-memory registry (subscribers, perms, rate limit, dedupe)

**Files:**
- Create: `src/lib/server/push/registry.ts`

- [ ] **Step 1: Create the registry**

Create `src/lib/server/push/registry.ts`:
```ts
import { getUserById } from "@/lib/server/auth/auth";
import {
	getPushAlerts,
	getPushSubscriptions,
	getSubscribedUserIds
} from "@/lib/server/db/internal/repository";
import { getServerConfig } from "@/lib/services/config/config.server";
import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { getLogger } from "@/lib/utils/logger";
import { buildContextForUser } from "./permissions";
import type { PushAlertRule, StoredSubscription } from "./types";

const log = getLogger("push");

const ENTRY_TTL_MS = 60_000;
const DEDUPE_MAX = 50_000;

type Entry = {
	userId: string;
	rules: PushAlertRule[];
	subscriptions: StoredSubscription[];
	context: FeaturePermissionContext;
	expiresAt: number;
};

const entries = new Map<string, Entry>();
const rateState = new Map<string, { windowStart: number; count: number }>();
const dedupe = new Map<string, number>(); // `${encounterId}:${ruleId}` -> despawnMs

let subscriberIds: string[] = [];
let subscriberIdsExpiresAt = 0;

export function invalidateUser(userId: string): void {
	entries.delete(userId);
	subscriberIdsExpiresAt = 0; // force subscriber list refresh
}

async function buildEntry(userId: string): Promise<Entry | null> {
	const [rules, subscriptions, user] = await Promise.all([
		getPushAlerts(userId),
		getPushSubscriptions(userId),
		getUserById(userId)
	]);
	const enabledRules = rules.filter((r) => r.enabled);
	if (!user || enabledRules.length === 0 || subscriptions.length === 0) return null;

	const context = await buildContextForUser(user);
	return { userId, rules: enabledRules, subscriptions, context, expiresAt: Date.now() + ENTRY_TTL_MS };
}

async function getEntry(userId: string): Promise<Entry | null> {
	const cached = entries.get(userId);
	if (cached && cached.expiresAt > Date.now()) return cached;
	const fresh = await buildEntry(userId);
	if (fresh) entries.set(userId, fresh);
	else entries.delete(userId);
	return fresh;
}

/** All currently-eligible subscriber entries (rules + subs + perms). */
export async function getActiveEntries(): Promise<Entry[]> {
	if (subscriberIdsExpiresAt <= Date.now()) {
		try {
			subscriberIds = await getSubscribedUserIds();
			subscriberIdsExpiresAt = Date.now() + ENTRY_TTL_MS;
		} catch (err) {
			log.warning(`Failed to refresh subscriber ids: ${err}`);
		}
	}
	const result: Entry[] = [];
	for (const id of subscriberIds) {
		const entry = await getEntry(id);
		if (entry) result.push(entry);
	}
	return result;
}

/** Returns true if this (encounter, rule) was already alerted. Records it otherwise. */
export function alreadyAlerted(encounterId: string, ruleId: string, despawnMs: number): boolean {
	const key = `${encounterId}:${ruleId}`;
	const now = Date.now();
	const existing = dedupe.get(key);
	if (existing && existing > now) return true;

	if (dedupe.size > DEDUPE_MAX) {
		for (const [k, expiry] of dedupe) if (expiry <= now) dedupe.delete(k);
	}
	dedupe.set(key, despawnMs > now ? despawnMs : now + 60_000);
	return false;
}

/** Per-user hourly rate limit using config.maxPerUserPerHour. */
export function underRateLimit(userId: string): boolean {
	const limit = getServerConfig().push?.maxPerUserPerHour ?? 30;
	const now = Date.now();
	const state = rateState.get(userId);
	if (!state || now - state.windowStart >= 3_600_000) {
		rateState.set(userId, { windowStart: now, count: 1 });
		return true;
	}
	if (state.count >= limit) return false;
	state.count += 1;
	return true;
}

export type { Entry };
```

- [ ] **Step 2: Confirm `getUserById` exists (or add it)**

Run: `grep -n "export.*getUserById\|export.*getUserByDiscordId" src/lib/server/auth/auth.ts`
- If `getUserById` exists, proceed.
- If only `getUserByDiscordId` exists, add this to `src/lib/server/auth/auth.ts`:
```ts
export async function getUserById(id: string) {
	const [row] = await db.select().from(table.user).where(eq(table.user.id, id));
	return row ?? null;
}
```
(Match the file's existing import names for `db`, `table`/schema, and `eq`. Inspect the top of `auth.ts` first and reuse them.)

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/push/registry.ts src/lib/server/auth/auth.ts
git commit -m "feat(push): in-memory subscriber registry with rate limit and dedupe"
```

---

## Task 11: Dispatch orchestrator

**Files:**
- Create: `src/lib/server/push/dispatch.ts`

- [ ] **Step 1: Create the orchestrator**

Create `src/lib/server/push/dispatch.ts`:
```ts
import { getClientConfig } from "@/lib/services/config/config.server";
import { Features } from "@/lib/utils/features";
import { getLogger } from "@/lib/utils/logger";
import { matchRules, ruleUsesIv } from "./matcher";
import {
	alreadyAlerted,
	getActiveEntries,
	invalidateUser,
	underRateLimit,
	type Entry
} from "./registry";
import { sendToSubscription } from "./sender";
import type { MatchablePokemon, PushAlertRule, PushPayload } from "./types";

const log = getLogger("push");

function buildPayload(pokemon: MatchablePokemon, rule: PushAlertRule): PushPayload {
	const ivText = pokemon.iv != null ? ` ${Math.round(pokemon.iv)}%` : "";
	const lvlText = pokemon.level != null ? ` L${pokemon.level}` : "";
	const title = rule.name || `Pokémon #${pokemon.pokemonId}`;
	return {
		title,
		body: `#${pokemon.pokemonId}${ivText}${lvlText}`,
		tag: `pokemon:${pokemon.encounterId}`,
		url: `${getClientConfig().general.url ?? ""}/@/${pokemon.lat}/${pokemon.lon}/18`
	};
}

/** Strip IV-derived fields when the user is not permitted to see IV here. */
function viewFor(entry: Entry, pokemon: MatchablePokemon): MatchablePokemon {
	if (entry.context.isAllowedAt(Features.POKEMON_IV, pokemon.lat, pokemon.lon)) return pokemon;
	return {
		...pokemon,
		iv: undefined,
		atkIv: undefined,
		defIv: undefined,
		staIv: undefined,
		level: undefined,
		cp: undefined,
		size: undefined
	};
}

export async function dispatchPokemon(pokemon: MatchablePokemon[]): Promise<void> {
	if (pokemon.length === 0) return;
	const entries = await getActiveEntries();
	if (entries.length === 0) return;

	for (const p of pokemon) {
		for (const entry of entries) {
			if (!entry.context.isAllowedAt(Features.POKEMON, p.lat, p.lon)) continue;

			const view = viewFor(entry, p);
			const rule = matchRules(view, entry.rules);
			if (!rule) continue;
			if (ruleUsesIv(rule) && view.iv == null && view.cp == null) continue;

			if (alreadyAlerted(p.encounterId, rule.id, p.despawnMs)) continue;
			if (!underRateLimit(entry.userId)) continue;

			const payload = buildPayload(view, rule);
			for (const sub of entry.subscriptions) {
				const { pruned } = await sendToSubscription(sub, payload);
				if (pruned) invalidateUser(entry.userId);
			}
		}
	}
}

/** Used by the test endpoint: push directly to a user's subscriptions. */
export async function dispatchTest(userId: string): Promise<number> {
	const { getPushSubscriptions } = await import("@/lib/server/db/internal/repository");
	const subs = await getPushSubscriptions(userId);
	const payload: PushPayload = {
		title: "Test push",
		body: "Web Push is working on this device.",
		tag: "test",
		url: getClientConfig().general.url ?? "/"
	};
	let sent = 0;
	for (const sub of subs) {
		const { pruned } = await sendToSubscription(sub, payload);
		if (!pruned) sent += 1;
	}
	return sent;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/push/dispatch.ts
git commit -m "feat(push): dispatch orchestrator tying registry, matcher, and sender"
```

---

## Task 12: Subscribe / unsubscribe endpoints

**Files:**
- Create: `src/routes/api/notifications/subscribe/+server.ts`
- Create: `src/routes/api/notifications/unsubscribe/+server.ts`

- [ ] **Step 1: Subscribe endpoint**

Create `src/routes/api/notifications/subscribe/+server.ts`:
```ts
import { upsertPushSubscription } from "@/lib/server/db/internal/repository";
import { invalidateUser } from "@/lib/server/push/registry";
import { subscriptionSchema } from "@/lib/server/push/schemas";
import { getServerConfig } from "@/lib/services/config/config.server";
import { json } from "@sveltejs/kit";

export async function POST({ locals, request }) {
	if (!getServerConfig().push?.enabled) return json({ error: "Push disabled" }, { status: 503 });
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const parsed = subscriptionSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: "Invalid subscription" }, { status: 400 });

	await upsertPushSubscription({
		userId: locals.user.id,
		endpoint: parsed.data.endpoint,
		p256dh: parsed.data.keys.p256dh,
		auth: parsed.data.keys.auth,
		userAgent: request.headers.get("user-agent")
	});
	invalidateUser(locals.user.id);
	return json({ error: null });
}
```

- [ ] **Step 2: Unsubscribe endpoint**

Create `src/routes/api/notifications/unsubscribe/+server.ts`:
```ts
import { deletePushSubscriptionByEndpoint } from "@/lib/server/db/internal/repository";
import { invalidateUser } from "@/lib/server/push/registry";
import { unsubscribeSchema } from "@/lib/server/push/schemas";
import { json } from "@sveltejs/kit";

export async function POST({ locals, request }) {
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const parsed = unsubscribeSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });

	await deletePushSubscriptionByEndpoint(locals.user.id, parsed.data.endpoint);
	invalidateUser(locals.user.id);
	return json({ error: null });
}
```

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/notifications/subscribe/+server.ts src/routes/api/notifications/unsubscribe/+server.ts
git commit -m "feat(push): subscribe and unsubscribe endpoints"
```

---

## Task 13: Alert rules endpoint

**Files:**
- Create: `src/routes/api/notifications/alerts/+server.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/routes/api/notifications/alerts/+server.ts`:
```ts
import { getPushAlerts, setPushAlerts } from "@/lib/server/db/internal/repository";
import { invalidateUser } from "@/lib/server/push/registry";
import { alertRulesSchema } from "@/lib/server/push/schemas";
import { json } from "@sveltejs/kit";

export async function GET({ locals }) {
	if (!locals.user) return json({ error: "Not logged in", result: [] }, { status: 401 });
	return json({ error: null, result: await getPushAlerts(locals.user.id) });
}

export async function PUT({ locals, request }) {
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const parsed = alertRulesSchema.safeParse(await request.json());
	if (!parsed.success) return json({ error: "Invalid rules" }, { status: 400 });

	await setPushAlerts(locals.user.id, parsed.data);
	invalidateUser(locals.user.id);
	return json({ error: null });
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/notifications/alerts/+server.ts
git commit -m "feat(push): alert rules get/put endpoint"
```

---

## Task 14: Test push endpoint

**Files:**
- Create: `src/routes/api/notifications/test/+server.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/routes/api/notifications/test/+server.ts`:
```ts
import { dispatchTest } from "@/lib/server/push/dispatch";
import { getServerConfig } from "@/lib/services/config/config.server";
import { json } from "@sveltejs/kit";

export async function POST({ locals }) {
	if (!getServerConfig().push?.enabled) return json({ error: "Push disabled" }, { status: 503 });
	if (!locals.user) return json({ error: "Not logged in" }, { status: 401 });

	const sent = await dispatchTest(locals.user.id);
	return json({ error: null, sent });
}
```

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/notifications/test/+server.ts
git commit -m "feat(push): test push endpoint"
```

---

## Task 15: Golbat intake endpoint

**Files:**
- Create: `src/routes/intake/golbat/+server.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/routes/intake/golbat/+server.ts`:
```ts
import { dispatchPokemon } from "@/lib/server/push/dispatch";
import { mapGolbatPokemon } from "@/lib/server/push/mapWebhook";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { json } from "@sveltejs/kit";
import { timingSafeEqual } from "node:crypto";

const log = getLogger("push");

function secretMatches(provided: string, expected: string): boolean {
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export async function POST({ request }) {
	const push = getServerConfig().push;
	if (!push?.enabled) return json({ error: "Push disabled" }, { status: 503 });

	const header = request.headers.get("authorization") ?? "";
	const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
	if (!provided || !secretMatches(provided, push.intakeSecret)) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON" }, { status: 400 });
	}

	const pokemon = mapGolbatPokemon(body);
	// Ack immediately; matching is fast (in-memory) so we await it here.
	try {
		await dispatchPokemon(pokemon);
	} catch (err) {
		log.error(`intake dispatch failed: ${err}`);
	}
	return json({ ok: true, received: pokemon.length });
}
```

- [ ] **Step 2: Verify type check**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Runtime verify (auth + parsing)**

Start dev: `pnpm run dev` (separate shell). Then:
```bash
# wrong secret -> 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5173/intake/golbat \
  -H "Authorization: Bearer wrong" -H "Content-Type: application/json" -d '[]'
# correct secret -> 200 with received:0  (use your config intakeSecret)
curl -s -X POST http://localhost:5173/intake/golbat \
  -H "Authorization: Bearer CHANGE_ME_LONG_RANDOM_STRING" -H "Content-Type: application/json" \
  -d '[{"type":"pokemon","message":{"encounter_id":"abc","pokemon_id":25,"latitude":0,"longitude":0,"disappear_time":9999999999,"individual_attack":15,"individual_defense":15,"individual_stamina":15,"pokemon_level":30}}]'
```
Expected: first prints `401`; second prints `{"ok":true,"received":1}`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/intake/golbat/+server.ts
git commit -m "feat(push): secret-guarded Golbat webhook intake endpoint"
```

---

## Task 16: Service worker push handling

**Files:**
- Create: `src/lib/serviceWorker/push.ts`
- Modify: `src/lib/serviceWorker/index.ts`

- [ ] **Step 1: Create the SW push module**

Create `src/lib/serviceWorker/push.ts`:
```ts
import { self } from "./self";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
	return output;
}

export function setupPushHandlers(): void {
	self.addEventListener("push", (event) => {
		let data: { title?: string; body?: string; tag?: string; url?: string } = {};
		try {
			data = event.data?.json() ?? {};
		} catch {
			data = { title: "Notification", body: event.data?.text() ?? "" };
		}
		event.waitUntil(
			self.registration.showNotification(data.title ?? "Notification", {
				body: data.body,
				tag: data.tag,
				data: { url: data.url }
			})
		);
	});

	self.addEventListener("notificationclick", (event) => {
		event.notification.close();
		const url: string = event.notification.data?.url || "/";
		event.waitUntil(
			(async () => {
				const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
				for (const client of all) {
					if ("focus" in client) {
						await client.focus();
						if ("navigate" in client && url) await (client as WindowClient).navigate(url);
						return;
					}
				}
				await self.clients.openWindow(url);
			})()
		);
	});

	self.addEventListener("pushsubscriptionchange", (event) => {
		event.waitUntil(
			(async () => {
				const res = await fetch("/api/config");
				const config = await res.json();
				const key: string | undefined = config?.push?.vapidPublicKey;
				if (!key) return;
				const subscription = await self.registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(key)
				});
				await fetch("/api/notifications/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(subscription.toJSON())
				});
			})()
		);
	});
}
```

- [ ] **Step 2: Wire it into the service worker entry**

Edit `src/lib/serviceWorker/index.ts` to:
```ts
import { makeOfflineAvailable } from "./offline";
import { setupPushHandlers } from "./push";

makeOfflineAvailable();
setupPushHandlers();
```

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors. (If `WindowClient`/`self.clients` types are unresolved, confirm `offline.ts`'s `webworker` lib reference covers it; the `self` cast in `self.ts` already types it as `ServiceWorkerGlobalScope`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/serviceWorker/push.ts src/lib/serviceWorker/index.ts
git commit -m "feat(push): service worker push, click, and resubscribe handlers"
```

---

## Task 17: Client push module

**Files:**
- Create: `src/lib/features/notifications/push.ts`

- [ ] **Step 1: Create the client module**

Create `src/lib/features/notifications/push.ts`:
```ts
import { browser } from "$app/environment";
import { getConfig } from "@/lib/services/config/config";

type PushState = {
	supported: boolean;
	subscribed: boolean;
	busy: boolean;
};

const state: PushState = $state({
	supported: browser && "serviceWorker" in navigator && "PushManager" in window,
	subscribed: false,
	busy: false
});

export function getPushState() {
	return state;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
	return output;
}

export async function refreshPushState() {
	if (!state.supported) return;
	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	state.subscribed = !!sub;
}

export async function subscribeToPush() {
	if (!state.supported || state.busy) return;
	state.busy = true;
	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return;

		const key = getConfig()?.push?.vapidPublicKey;
		if (!key) throw new Error("Push not configured on server");

		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(key)
		});
		await fetch("/api/notifications/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sub.toJSON())
		});
		state.subscribed = true;
	} finally {
		state.busy = false;
	}
}

export async function unsubscribeFromPush() {
	if (!state.supported || state.busy) return;
	state.busy = true;
	try {
		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.getSubscription();
		if (sub) {
			await fetch("/api/notifications/unsubscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ endpoint: sub.endpoint })
			});
			await sub.unsubscribe();
		}
		state.subscribed = false;
	} finally {
		state.busy = false;
	}
}
```

- [ ] **Step 2: Confirm the client config accessor**

Run: `grep -n "export function getConfig\|export function setConfig" src/lib/services/config/config.ts`
- If `getConfig()` returns the `ClientConfig`, proceed.
- If the accessor has a different name, update the import/usage in Step 1 to match (it is the same object `setConfig(getClientConfig())` stores in `hooks.server.ts:115`). The shape now includes `push`.

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/features/notifications/push.ts
git commit -m "feat(push): client subscribe/unsubscribe module with reactive state"
```

---

## Task 18: `/test` page UI

**Files:**
- Modify: `src/routes/test/+page.svelte`

- [ ] **Step 1: Add push + rule-editor UI**

Replace `src/routes/test/+page.svelte` with the version below (it keeps the existing in-app/system notification test buttons and adds the Web Push section). Use the Svelte MCP `svelte-autofixer` on this component before committing.

```svelte
<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import {
		getNotificationPermission,
		getNotifications,
		requestNotificationPermission,
		sendNotification
	} from "@/lib/features/notifications/notifications.svelte";
	import {
		getPushState,
		refreshPushState,
		subscribeToPush,
		unsubscribeFromPush
	} from "@/lib/features/notifications/push";
	import type { PushAlertRule } from "@/lib/features/notifications/pushTypes";

	let sentCount = $state(0);
	let pushStatus = $state("");
	const push = getPushState();

	let rules = $state<PushAlertRule[]>([]);
	let newPokemonId = $state(0);
	let newMinIv = $state(0);

	$effect(() => {
		refreshPushState();
		loadRules();
	});

	async function loadRules() {
		const res = await fetch("/api/notifications/alerts");
		const data = await res.json();
		if (!data.error) rules = data.result;
	}

	async function saveRules() {
		await fetch("/api/notifications/alerts", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rules)
		});
	}

	function addRule() {
		if (!newPokemonId) return;
		const rule: PushAlertRule = {
			id: crypto.randomUUID(),
			enabled: true,
			name: `#${newPokemonId}`,
			pokemon: [{ pokemon_id: newPokemonId }]
		};
		if (newMinIv > 0) rule.iv = { min: newMinIv, max: 100 };
		rules = [...rules, rule];
		newPokemonId = 0;
		newMinIv = 0;
		saveRules();
	}

	function removeRule(id: string) {
		rules = rules.filter((r) => r.id !== id);
		saveRules();
	}

	function sendTestNotification() {
		sentCount += 1;
		sendNotification({
			title: "Test notification",
			body: `This is notification #${sentCount}.`,
			target: { type: "pokemon", label: "Pokemon spawn" },
			native: getNotificationPermission() === "granted"
		});
	}

	async function togglePush() {
		if (push.subscribed) await unsubscribeFromPush();
		else await subscribeToPush();
	}

	async function sendTestPush() {
		const res = await fetch("/api/notifications/test", { method: "POST" });
		const data = await res.json();
		pushStatus = data.error ? `Error: ${data.error}` : `Sent to ${data.sent} device(s).`;
	}
</script>

<svelte:head>
	<title>Notification Test</title>
</svelte:head>

<main class="bg-background text-foreground min-h-screen p-6">
	<section class="mx-auto flex max-w-xl flex-col gap-6 rounded-xl border p-6 shadow-sm">
		<div>
			<p class="text-muted-foreground text-sm uppercase tracking-wide">Test page</p>
			<h1 class="mt-2 text-3xl font-semibold">Notifications</h1>
		</div>

		<div class="flex flex-wrap gap-3">
			<Button onclick={sendTestNotification}>Send in-app notification</Button>
			<Button variant="outline" onclick={() => requestNotificationPermission()}>
				Enable browser notifications
			</Button>
		</div>

		<div class="border-t pt-4">
			<h2 class="text-xl font-semibold">Web Push</h2>
			<div class="mt-3 flex flex-wrap gap-3">
				<Button onclick={togglePush} disabled={!push.supported || push.busy}>
					{push.subscribed ? "Disable push" : "Enable push"}
				</Button>
				<Button variant="secondary" onclick={sendTestPush} disabled={!push.subscribed}>
					Send test push
				</Button>
			</div>
			<p class="text-muted-foreground mt-2 text-sm">
				Supported: {push.supported} · Subscribed: {push.subscribed} · {pushStatus}
			</p>
		</div>

		<div class="border-t pt-4">
			<h2 class="text-xl font-semibold">Alert rules</h2>
			<div class="mt-3 flex flex-wrap items-end gap-3">
				<label class="text-sm">
					Pokémon ID
					<input
						type="number"
						bind:value={newPokemonId}
						class="bg-background ml-2 w-24 rounded border px-2 py-1"
					/>
				</label>
				<label class="text-sm">
					Min IV %
					<input
						type="number"
						bind:value={newMinIv}
						class="bg-background ml-2 w-20 rounded border px-2 py-1"
					/>
				</label>
				<Button onclick={addRule}>Add rule</Button>
			</div>

			<ul class="mt-4 flex flex-col gap-2">
				{#each rules as rule (rule.id)}
					<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
						<span>{rule.name} {rule.iv ? `(IV ≥ ${rule.iv.min}%)` : ""}</span>
						<Button variant="ghost" size="" onclick={() => removeRule(rule.id)}>Remove</Button>
					</li>
				{/each}
			</ul>
		</div>

		<p class="text-muted-foreground text-sm">Visible in-app notifications: {getNotifications().length}</p>
	</section>
</main>
```

- [ ] **Step 2: Run the Svelte autofixer**

Use the Svelte MCP `svelte-autofixer` tool on the file content; apply fixes until it returns no issues. (Common nits: `$effect` with async — wrap calls, do not `await` the effect itself, as written.)

- [ ] **Step 3: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/test/+page.svelte
git commit -m "feat(push): /test page push toggle and alert-rule editor"
```

---

## Task 19: Warm the registry at startup

**Files:**
- Modify: `src/lib/server/init.ts`

- [ ] **Step 1: Warm the registry when push is enabled**

Edit `src/lib/server/init.ts` to add, after the existing `Promise.all([...])` block:
```ts
	if (getServerConfig().push?.enabled) {
		const { getActiveEntries } = await import("@/lib/server/push/registry");
		await getActiveEntries().catch((err) => log.warning(`push registry warm failed: ${err}`));
	}
```
Add the import at the top:
```ts
import { getServerConfig } from "@/lib/services/config/config.server";
```
(The `log` variable already exists in `initDiadem`.)

- [ ] **Step 2: Verify**

Run: `pnpm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/init.ts
git commit -m "feat(push): warm subscriber registry on startup"
```

---

## Task 20: End-to-end verification + documentation

**Files:**
- Modify: docs under `docs/` (Astro Starlight config reference)

- [ ] **Step 1: Build and preview**

Run:
```bash
pnpm run build && pnpm run preview --host
```
Expected: build succeeds, preview serves the app (service worker is active in preview/production, not dev).

- [ ] **Step 2: Manual device verification (Android, over HTTPS)**

On an Android phone (HTTPS or tunnel to the preview):
1. Open `/test`, tap **Enable push**, accept the permission prompt. "Subscribed: true".
2. Tap **Send test push** → a system notification appears (background the browser to confirm it shows when not focused).
3. Add an alert rule (a `pokemon_id` you can trigger, optional min IV).
4. POST a sample Golbat webhook to `/intake/golbat` with the secret and that `pokemon_id` at a permitted lat/lon → confirm a push arrives.
5. POST a non-matching `pokemon_id` → confirm no push.

- [ ] **Step 3: Document config + Golbat setup**

Add a docs page/section (follow existing `docs/` structure) covering:
- `[server.push]` config keys and generating VAPID keys with `pnpm run push:keys`.
- The Golbat webhook config the operator must add:
```toml
[[webhooks]]
url = "https://yourmap.example/intake/golbat"
types = ["pokemon"]
[webhooks.header_map]
Authorization = "Bearer <intakeSecret>"
```
- Note: notifications require HTTPS; the service worker only runs in production/preview builds; installing the PWA improves Android delivery.

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(push): document web push config and Golbat webhook setup"
```

---

## Self-review notes (addressed)

- **Spec coverage:** data model (T3), config + key gen (T1–T2), subscription/rules endpoints (T12–T13), service worker (T16), intake + matching + dispatch (T5–T11, T14–T15), `/test` UI (T18), permissions for offline users (T9), docs (T20). All spec sections map to tasks.
- **Deviations from spec (intentional):** (a) Alert rules use a lean `PushAlertRule` type instead of the heavy `FiltersetPokemon`, and the matcher is reimplemented server-side, because the existing filter logic transitively imports client-only `.svelte` state. (b) Offline permissions use the stored Discord token with `updatePermissions`' built-in baseline fallback rather than an explicit arctic refresh — simpler and already safe. (c) v1 rule fields: pokemon/iv/level/cp/size/gender (PVP rank matching deferred). These are noted here so the executor doesn't treat them as gaps.
- **Type consistency:** `MatchablePokemon`, `PushAlertRule`, `StoredSubscription`, `PushPayload` are defined once in `types.ts` and used consistently; `invalidateUser`, `getActiveEntries`, `alreadyAlerted`, `underRateLimit` names match across registry/dispatch.
</content>
</invoke>
