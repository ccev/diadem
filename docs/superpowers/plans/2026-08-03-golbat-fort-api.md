# Golbat Fort API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve gym/pokestop/station map data from Golbat's fort HTTP API (UnownHash/Golbat#385) instead of raw SQL, and source filter pick lists from `GET api/fort/available`, with automatic detection and SQL fallback.

**Architecture:** Three new API-backed query classes subclass the existing SQL query classes and override only `query()`/`querySingle()`, reusing all `filter()`/`prepare()` logic (the same pattern `PokemonQuery` established for `api/pokemon/v3/scan`). A detection module polls `GET api/fort/available` every 60s: success enables the API registry entries and caches the availability payload; failure (503/404) falls back to SQL. Filter pick lists merge availability data into the existing `MasterStats` shape at `/api/stats` request time, so no component changes.

**Tech Stack:** SvelteKit (SSR disabled), TypeScript strict, vitest, mysql2 (fallback path), Golbat HTTP API.

**Authoritative context:** https://github.com/ccev/diadem/issues/174 (the agreed proposal — read it first). Golbat PRs: #385 (merged fort API), #392 (pokemon `limit_reached`, will land), plus the Phase 0 PRs in Appendix A (assume they land; code defensively until then).

## Global Constraints

- Node 22+, pnpm. Run `pnpm run check` (svelte-check, must pass) and `pnpm run lint` (prettier) before every commit. Tests run with `pnpm test` (vitest).
- CLAUDE.md rules apply: do not touch unrelated code; Svelte 5 runes only; no new i18n strings are expected for this plan (if you add any: append English-only to `messages/en.json`).
- Path alias `@` and `$lib` both map into `./src`.
- **Pushed DNF filters must always be a SUPERSET of what the local filter logic accepts.** Local `filter()`/`shouldDisplay*` re-checks everything; a too-loose pushed filter costs bandwidth, a too-tight one silently hides map objects. When in doubt, loosen.
- The API response field for open gym slots is `available_slots`; the diadem field is the DB typo `availble_slots` (`gym.d.ts:19`). Do not "fix" the typo — it's the DB column name and is used throughout.
- Do not add a config option for any of this. Detection is automatic (decision recorded in issue #174).
- Commit style: conventional prefixes (`feat:`, `fix:`, `chore:`, `docs:`) matching `git log`.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/server/queryMapObjects/queries.d.ts` | modify | add fort DNF + fort scan/availability wire types |
| `src/lib/server/api/golbatApi.ts` | modify | add fort scan / by-id / availability HTTP functions |
| `src/lib/server/api/golbatFortApi.ts` | create | detection state + 60s availability poll + cached payload |
| `src/lib/server/init.ts` | modify | start detection during init |
| `src/lib/server/queryMapObjects/fortDnf.ts` | create | pure DNF translation functions (filter → clauses) |
| `src/lib/server/queryMapObjects/fortDnf.test.ts` | create | vitest for the translators |
| `src/lib/server/queryMapObjects/queryGymApi.ts` | create | `ApiGymQuery extends GymQuery` |
| `src/lib/server/queryMapObjects/queryPokestopApi.ts` | create | `ApiPokestopQuery extends PokestopQuery` |
| `src/lib/server/queryMapObjects/queryStationApi.ts` | create | `ApiStationQuery extends StationQuery` |
| `src/lib/server/queryMapObjects/queryMapObjects.ts` | modify | API registry consulted when detection is on |
| `src/lib/server/api/queryStats.ts` | modify | skip live-table SQL when fort API on; merge availability |
| `src/routes/api/stats/+server.ts` | modify | merge fresh availability at request time |
| `docs/src/content/docs/reference/configuration.md` | modify | document Golbat-side requirements |

---

### Task 1: Wire types + Golbat API client functions

**Files:**
- Modify: `src/lib/server/queryMapObjects/queries.d.ts`
- Modify: `src/lib/server/api/golbatApi.ts`

**Interfaces:**
- Produces: types `GolbatDnfId`, `GolbatFortDnfFilter`, `FortScanBody`, `GolbatGymResult`, `GolbatPokestopResult`, `GolbatStationResult`, `GymScanResponse`, `PokestopScanResponse`, `StationScanResponse`, `FortAvailability`; functions `scanGyms(body)`, `scanPokestops(body)`, `scanStations(body)`, `getGolbatGym(id, thisFetch?)`, `getGolbatPokestop(id, thisFetch?)`, `getGolbatStation(id, thisFetch?)`, `fetchFortAvailability()` — all return `T | undefined` (undefined on any non-2xx, matching `callGolbat` semantics).

- [ ] **Step 1: Add the wire types to `queries.d.ts`** (append after `GolbatPokemonQuery`):

```ts
export type GolbatDnfId = { pokemon_id: number; form?: number };

/** One DNF clause: conditions AND within, clauses OR across. Omitted field = no constraint. */
export type GolbatFortDnfFilter = {
	is_ar_scan_eligible?: boolean;
	// gym
	available_slots?: { min: number; max: number };
	team_id?: number[];
	raid_level?: number[];
	raid_pokemon_id?: GolbatDnfId[];
	// pokestop
	lure_id?: number[];
	quest_reward_type?: number[];
	quest_reward_amount?: { min: number; max: number };
	quest_reward_item_id?: number[];
	quest_reward_pokemon?: GolbatDnfId[];
	incident_display_type?: number[];
	incident_character?: number[];
	contest_pokemon?: GolbatDnfId[];
	contest_pokemon_type?: number[];
	// station
	battle_level?: number[];
	battle_pokemon?: GolbatDnfId[];
	stationed_gmax?: boolean;
	station_active?: boolean;
};

export type FortScanBody = {
	min: { latitude: number; longitude: number };
	max: { latitude: number; longitude: number };
	limit: number;
	filters?: GolbatFortDnfFilter[];
	with_incidents?: boolean;
};

export type FortAvailability = {
	gyms: { raids: { raid_level: number; pokemon_id: number | null; form: number | null }[] };
	pokestops: {
		quests: {
			with_ar: boolean;
			reward_type: number;
			item_id: number;
			amount: number;
			pokemon_id: number;
			form_id: number;
			title: string;
			target: number;
			count: number;
		}[];
		invasions: { character: number; display_type: number; confirmed: boolean }[];
		lures: { lure_id: number }[];
		showcases: { pokemon_id: number | null; form: number | null; type_id: number | null }[];
	};
	stations: {
		battles: { battle_level: number; pokemon_id: number | null; form: number | null }[];
	};
};
```

- [ ] **Step 2: Add response/result types and functions to `golbatApi.ts`.** The API returns whole DB records; type only what diadem consumes, via the existing `MinMapObject` shapes plus the fields that need renaming. Add:

```ts
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { GymData, GymDefender, Rsvp } from "@/lib/types/mapObjectData/gym";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import type { StationData } from "@/lib/types/mapObjectData/station";
import type { FortAvailability, FortScanBody } from "@/lib/server/queryMapObjects/queries";

// Raw API records: like diadem's rows except the fields the mappers rename/reshape.
export type GolbatGymResult = Omit<
	MinMapObject<GymData>,
	"availble_slots" | "defenders_raw" | "defenders" | "raw_rsvps" | "rsvps"
> & {
	available_slots?: number | null;
	deleted: boolean;
	defenders?: GymDefender[] | null; // native JSON, not a string
	rsvps?: Rsvp[] | null; // native JSON, not a string
};

export type GolbatIncidentResult = Omit<Incident, "confirmed"> & { confirmed: boolean };

export type GolbatPokestopResult = Omit<MinMapObject<PokestopData>, "incident" | "deleted"> & {
	deleted: boolean;
	invasions?: GolbatIncidentResult[];
};

export type GolbatStationResult = Omit<
	MinMapObject<StationData>,
	"is_inactive" | "is_battle_available" | "stationed_pokemon" | "raw_stationed_pokemon"
> & {
	is_inactive: boolean;
	is_battle_available: boolean;
	stationed_pokemon?: string | null; // still a serialized string on the wire
};

export type GymScanResponse = {
	gyms: GolbatGymResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean; // present once the fort mirror of Golbat #392 lands
};
export type PokestopScanResponse = {
	pokestops: GolbatPokestopResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};
export type StationScanResponse = {
	stations: GolbatStationResult[];
	examined: number;
	skipped: number;
	total: number;
	limit_reached?: boolean;
};
```

Add a `quiet` parameter to `callGolbat` so the detection poll doesn't spam the error log while Golbat runs without `fort_in_memory` (change the signature, leave all existing call sites alone — the parameter defaults to false):

```ts
async function callGolbat<T>(
	path: string,
	method: "GET" | "POST",
	body: BodyInit | undefined = undefined,
	thisFetch: typeof fetch = fetch,
	quiet = false
): Promise<T | undefined> {
```

and inside the `!response.ok` branch: `if (!quiet) log.error(...)` (keep a `log.debug` for the quiet case).

Then the new exported functions (note: paths without a leading slash — `new URL` would drop Golbat base paths otherwise):

```ts
export async function scanGyms(body: FortScanBody) {
	return await callGolbat<GymScanResponse>("api/gym/scan", "POST", JSON.stringify(body));
}

export async function scanPokestops(body: FortScanBody) {
	return await callGolbat<PokestopScanResponse>("api/pokestop/scan", "POST", JSON.stringify(body));
}

export async function scanStations(body: FortScanBody) {
	return await callGolbat<StationScanResponse>("api/station/scan", "POST", JSON.stringify(body));
}

export async function getGolbatGym(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<GolbatGymResult>("api/gym/id/" + id, "GET", undefined, thisFetch);
}

export async function getGolbatPokestop(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<GolbatPokestopResult>("api/pokestop/id/" + id, "GET", undefined, thisFetch);
}

export async function getGolbatStation(id: string, thisFetch: typeof fetch = fetch) {
	return await callGolbat<GolbatStationResult>("api/station/id/" + id, "GET", undefined, thisFetch);
}

export async function fetchFortAvailability() {
	return await callGolbat<FortAvailability>("api/fort/available", "GET", undefined, fetch, true);
}
```

- [ ] **Step 3: Verify** — Run: `pnpm run check` — expected: 0 errors. (If `Rsvp` isn't exported from `gym.d.ts`, export it there; same for `Incident` in `pokestop.d.ts` — both already exist as types.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/queryMapObjects/queries.d.ts src/lib/server/api/golbatApi.ts
git commit -m "feat: add golbat fort api client functions and wire types"
```

---

### Task 2: Detection module + init wiring

**Files:**
- Create: `src/lib/server/api/golbatFortApi.ts`
- Modify: `src/lib/server/init.ts`

**Interfaces:**
- Consumes: `fetchFortAvailability()` from Task 1.
- Produces: `isFortApiEnabled(): boolean`, `getCachedFortAvailability(): FortAvailability | undefined`, `startFortApiDetection(): Promise<void>`, `refreshFortAvailability(): Promise<void>`.

- [ ] **Step 1: Create `src/lib/server/api/golbatFortApi.ts`:**

```ts
import { fetchFortAvailability } from "@/lib/server/api/golbatApi";
import type { FortAvailability } from "@/lib/server/queryMapObjects/queries";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("golbat:fort");
const REFRESH_SECONDS = 60;

let fortApiEnabled = false;
let cachedAvailability: FortAvailability | undefined;

export function isFortApiEnabled() {
	return fortApiEnabled;
}

export function getCachedFortAvailability() {
	return cachedAvailability;
}

// Golbat gates every fort endpoint on fort_in_memory (503 when off, 404 on
// older versions), so a successful availability fetch doubles as detection.
export async function refreshFortAvailability() {
	const result = await fetchFortAvailability();
	const nowEnabled = result !== undefined;

	if (nowEnabled !== fortApiEnabled) {
		log.info(
			nowEnabled
				? "Golbat fort API detected, serving gyms/pokestops/stations from it"
				: "Golbat fort API unavailable, serving gyms/pokestops/stations from SQL"
		);
	}

	fortApiEnabled = nowEnabled;
	if (result) cachedAvailability = result;
}

export async function startFortApiDetection() {
	setInterval(() => {
		refreshFortAvailability().catch((err) => log.error("Fort availability refresh failed: %s", err));
	}, REFRESH_SECONDS * 1000)?.unref?.();

	await refreshFortAvailability();
}
```

- [ ] **Step 2: Wire into `init.ts`** — add to the `Promise.all` in `initDiadem()`:

```ts
import { startFortApiDetection } from "@/lib/server/api/golbatFortApi";
// ...
	await Promise.all([
		masterfileProvider.refresh(),
		uiconsIndexProvider.refresh(),
		remoteLocaleProvider.refresh(),
		masterstatsProvider.refresh(),
		startFortApiDetection()
	]);
```

- [ ] **Step 3: Verify** — `pnpm run check` passes, then `pnpm run dev` and confirm one of the two detection log lines appears at startup (which one depends on your Golbat's `fort_in_memory`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/api/golbatFortApi.ts src/lib/server/init.ts
git commit -m "feat: detect golbat fort api support at startup"
```

---

### Task 3: DNF translation functions (TDD)

**Files:**
- Create: `src/lib/server/queryMapObjects/fortDnf.ts`
- Test: `src/lib/server/queryMapObjects/fortDnf.test.ts`

**Interfaces:**
- Consumes: `FilterGym`, `FilterPokestop`, `FilterStation` from `@/lib/features/filters/filters`; `GolbatFortDnfFilter` from Task 1; `RewardType`, `INCIDENT_DISPLAYS_INVASION`, `INCIDENT_DISPLAY_GOLD`, `INCIDENT_DISPLAY_KECLEON`, `INCIDENT_DISPLAY_CONTEST` from `@/lib/utils/pokestopUtils`.
- Produces: `buildGymDnfFilters(filter)`, `buildPokestopDnfFilters(filter)`, `buildStationDnfFilters(filter)` — each returns `GolbatFortDnfFilter[] | null`. **Contract: `[]` = match everything (send no filters), non-empty = clauses to send, `null` = match nothing (caller returns an empty result without calling Golbat).**

The source of truth for the semantics is the SQL in `queryGym.ts:53-87`, `queryPokestop.ts:114-326`, `queryStation.ts:44-89` — each SQL OR-branch becomes one DNF clause. Every clause must be a superset of its SQL counterpart (see Global Constraints).

- [ ] **Step 1: Write failing tests** in `fortDnf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	buildGymDnfFilters,
	buildPokestopDnfFilters,
	buildStationDnfFilters
} from "./fortDnf";

const disabled = { enabled: false };
const enabledEmpty = { enabled: true, filters: [] };

describe("buildGymDnfFilters", () => {
	it("matches all when plain gyms are shown", () => {
		expect(
			buildGymDnfFilters({ gymPlain: { enabled: true }, raid: { enabled: true, filters: [] } } as any)
		).toEqual([]);
	});

	it("translates levels, eggs and bosses into separate OR clauses", () => {
		const result = buildGymDnfFilters({
			gymPlain: { enabled: false },
			raid: {
				enabled: true,
				filters: [
					{
						enabled: true,
						show: ["egg"],
						levels: [5],
						bosses: [{ pokemon_id: 150, temp_evolution_id: 2 }]
					}
				]
			}
		} as any);
		expect(result).toContainEqual({ raid_pokemon_id: [{ pokemon_id: 0 }] });
		expect(result).toContainEqual({ raid_level: [5] });
		// temp_evolution_id is not expressible — pokemon id alone (superset)
		expect(result).toContainEqual({ raid_pokemon_id: [{ pokemon_id: 150 }] });
	});

	it("falls back to an any-active-raid clause when raid filter has no conditions", () => {
		const result = buildGymDnfFilters({
			gymPlain: { enabled: false },
			raid: { enabled: true, filters: [{ enabled: true }] }
		} as any);
		expect(result).toHaveLength(1);
		expect(result![0].raid_level!.length).toBeGreaterThanOrEqual(9);
	});
});

describe("buildPokestopDnfFilters", () => {
	it("matches all when plain pokestops are shown", () => {
		expect(
			buildPokestopDnfFilters({ enabled: true, pokestopPlain: { enabled: true } } as any)
		).toEqual([]);
	});

	it("matches nothing when enabled but no sub-filter is on", () => {
		expect(
			buildPokestopDnfFilters({
				enabled: true,
				pokestopPlain: disabled,
				lure: enabledEmpty && disabled,
				quest: disabled,
				invasion: disabled,
				goldPokestop: disabled,
				kecleon: disabled,
				contest: disabled
			} as any)
		).toBeNull();
	});

	it("translates invasions with characters exactly like the SQL", () => {
		const result = buildPokestopDnfFilters({
			enabled: true,
			pokestopPlain: disabled,
			lure: disabled,
			quest: disabled,
			invasion: { enabled: true, filters: [{ enabled: true, characters: [41, 42] }] },
			goldPokestop: disabled,
			kecleon: disabled,
			contest: disabled
		} as any);
		expect(result).toEqual([
			{ incident_display_type: [1, 2, 3], incident_character: [41, 42] }
		]);
	});

	it("pushes a stardust range as reward_type + amount in one AND clause", () => {
		const result = buildPokestopDnfFilters({
			enabled: true,
			pokestopPlain: disabled,
			lure: disabled,
			quest: {
				enabled: true,
				filters: [{ enabled: true, stardust: { min: 500, max: Infinity } }]
			},
			invasion: disabled,
			goldPokestop: disabled,
			kecleon: disabled,
			contest: disabled
		} as any);
		expect(result).toEqual([
			{ quest_reward_type: [3], quest_reward_amount: { min: 500, max: 10000 } }
		]);
	});
});

describe("buildStationDnfFilters", () => {
	it("adds station_active to every battle clause", () => {
		const result = buildStationDnfFilters({
			enabled: true,
			stationPlain: { enabled: false },
			maxBattle: {
				enabled: true,
				filters: [{ enabled: true, bosses: [{ pokemon_id: 809, bread_mode: 2 }] }]
			}
		} as any);
		expect(result).toEqual([
			{ station_active: true, battle_pokemon: [{ pokemon_id: 809 }] }
		]);
	});

	it("translates hasGmax", () => {
		const result = buildStationDnfFilters({
			enabled: true,
			stationPlain: { enabled: false },
			maxBattle: { enabled: true, filters: [{ enabled: true, hasGmax: true }] }
		} as any);
		expect(result).toEqual([{ stationed_gmax: true }]);
	});
});
```

- [ ] **Step 2: Run to verify failure** — Run: `pnpm test -- fortDnf` — expected: FAIL (module not found).

- [ ] **Step 3: Implement `fortDnf.ts`:**

```ts
import type { FilterGym, FilterPokestop, FilterStation } from "@/lib/features/filters/filters";
import type { GolbatFortDnfFilter } from "@/lib/server/queryMapObjects/queries";
import {
	INCIDENT_DISPLAY_CONTEST,
	INCIDENT_DISPLAY_GOLD,
	INCIDENT_DISPLAY_KECLEON,
	INCIDENT_DISPLAYS_INVASION,
	RewardType
} from "@/lib/utils/pokestopUtils";

// Superset guards: broad enough that a matching object can never be missed;
// the local filter()/shouldDisplay* pass trims the excess.
const ALL_RAID_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const ALL_LURE_IDS = [501, 502, 503, 504, 505, 506];
const ALL_QUEST_REWARD_TYPES = Object.values(RewardType).filter(
	(v): v is number => typeof v === "number" && v > 0
);
const AMOUNT_MAX = 10000;

function minMax(range: { min: number; max: number }) {
	return {
		min: Number.isFinite(range.min) ? range.min : 0,
		max: Number.isFinite(range.max) ? range.max : AMOUNT_MAX
	};
}

/** Returns [] = match all, clauses = send as filters, null = match nothing. */
export function buildGymDnfFilters(filter: FilterGym | undefined): GolbatFortDnfFilter[] | null {
	if (!filter || filter.gymPlain.enabled || !filter.raid.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.raid.filters.filter((f) => f.enabled)) {
		// Mirrors queryGym.getFilterWhere: each SQL OR-branch is one clause.
		// A clause with any raid_* field only matches gyms with an active raid.
		if (filterset.show?.includes("egg")) clauses.push({ raid_pokemon_id: [{ pokemon_id: 0 }] });
		if (filterset.show?.includes("boss"))
			clauses.push({ raid_level: filterset.levels?.length ? filterset.levels : ALL_RAID_LEVELS });
		if (filterset.levels?.length) clauses.push({ raid_level: filterset.levels });
		for (const boss of filterset.bosses ?? []) {
			// temp_evolution_id is not a DNF field: match by id only, re-filter locally
			clauses.push({ raid_pokemon_id: [{ pokemon_id: boss.pokemon_id }] });
		}
	}

	// SQL equivalent had a bare "raid_end_timestamp > now" when no clauses exist
	return clauses.length ? clauses : [{ raid_level: ALL_RAID_LEVELS }];
}

export function buildPokestopDnfFilters(
	filter: FilterPokestop | undefined
): GolbatFortDnfFilter[] | null {
	if (!filter?.enabled || filter.pokestopPlain.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];

	if (filter.lure.enabled) {
		const items = filter.lure.filters.filter((f) => f.enabled).flatMap((f) => f.items);
		clauses.push({ lure_id: items.length ? items : ALL_LURE_IDS });
	}

	if (filter.quest.enabled) {
		const questFilters = filter.quest.filters.filter((f) => f.enabled);
		if (!questFilters.length) {
			// SQL fell back to "has any active quest"
			clauses.push({ quest_reward_type: ALL_QUEST_REWARD_TYPES });
		}
		for (const filterset of questFilters) {
			const rewardClauses: GolbatFortDnfFilter[] = [];

			if (filterset.stardust)
				rewardClauses.push({
					quest_reward_type: [RewardType.STARDUST],
					quest_reward_amount: minMax(filterset.stardust)
				});
			if (filterset.pokecoins)
				rewardClauses.push({
					quest_reward_type: [RewardType.POKECOINS],
					quest_reward_amount: minMax(filterset.pokecoins)
				});
			if (filterset.xp)
				rewardClauses.push({
					quest_reward_type: [RewardType.XP],
					quest_reward_amount: minMax(filterset.xp)
				});
			if (filterset.pokemon?.length)
				rewardClauses.push({
					quest_reward_type: [RewardType.POKEMON],
					quest_reward_pokemon: filterset.pokemon.map((p) => ({ pokemon_id: p.pokemon_id }))
				});
			for (const item of filterset.item ?? [])
				rewardClauses.push({
					quest_reward_type: [RewardType.ITEM],
					quest_reward_item_id: [item.id]
					// exact amount match is not expressible as a range safely — local re-filter
				});
			for (const reward of filterset.megaResource ?? [])
				rewardClauses.push({
					quest_reward_type: [RewardType.MEGA_ENERGY, RewardType.TEMP_EVO_BRANCH_RESOURCE],
					quest_reward_pokemon: [{ pokemon_id: reward.id }]
				});
			for (const reward of [...(filterset.candy ?? []), ...(filterset.xlCandy ?? [])])
				rewardClauses.push({
					quest_reward_type: [RewardType.CANDY, RewardType.XL_CANDY],
					quest_reward_pokemon: [{ pokemon_id: reward.id }]
				});

			if (rewardClauses.length) {
				clauses.push(...rewardClauses);
			} else {
				// tasks-only filterset (title/target isn't a DNF field): any-quest superset
				clauses.push({ quest_reward_type: ALL_QUEST_REWARD_TYPES });
			}
		}
	}

	if (filter.invasion.enabled) {
		const invasionFilters = filter.invasion.filters.filter((f) => f.enabled);
		const characterIds = invasionFilters.flatMap((f) => f.characters ?? []);
		const hasUnsafeInvasionFilter = invasionFilters.some((f) => f.rewards?.length);
		const clause: GolbatFortDnfFilter = { incident_display_type: [...INCIDENT_DISPLAYS_INVASION] };
		if (invasionFilters.length > 0 && characterIds.length > 0 && !hasUnsafeInvasionFilter) {
			clause.incident_character = characterIds;
		}
		clauses.push(clause);
	}

	if (filter.goldPokestop.enabled) clauses.push({ incident_display_type: [INCIDENT_DISPLAY_GOLD] });
	if (filter.kecleon.enabled) clauses.push({ incident_display_type: [INCIDENT_DISPLAY_KECLEON] });

	if (filter.contest.enabled) {
		const contestFilters = filter.contest.filters.filter((f) => f.enabled);
		if (!contestFilters.length) {
			clauses.push({ incident_display_type: [INCIDENT_DISPLAY_CONTEST] });
		}
		for (const filterset of contestFilters) {
			const clause: GolbatFortDnfFilter = { incident_display_type: [INCIDENT_DISPLAY_CONTEST] };
			// ranking_standard is not a DNF field — local re-filter
			if (filterset.focus.pokemon_id)
				clause.contest_pokemon = [{ pokemon_id: filterset.focus.pokemon_id }];
			if (filterset.focus.type_id) clause.contest_pokemon_type = [filterset.focus.type_id];
			clauses.push(clause);
		}
	}

	// SQL equivalent: "1 = 0"
	return clauses.length ? clauses : null;
}

export function buildStationDnfFilters(
	filter: FilterStation | undefined
): GolbatFortDnfFilter[] | null {
	if (!filter || filter.stationPlain.enabled || !filter.maxBattle.enabled) return [];

	const clauses: GolbatFortDnfFilter[] = [];
	for (const filterset of filter.maxBattle.filters.filter((f) => f.enabled)) {
		if (filterset.isActive) {
			clauses.push({ station_active: true });
			continue;
		}
		if (filterset.hasGmax) {
			clauses.push({ stationed_gmax: true });
			continue;
		}
		for (const boss of filterset.bosses ?? []) {
			// bread_mode is covered by battle_level in practice (gmax = level 6),
			// and re-checked locally either way — push id only
			clauses.push({ station_active: true, battle_pokemon: [{ pokemon_id: boss.pokemon_id }] });
		}
	}

	// SQL fallback: active battle with no boss constraint
	return clauses.length ? clauses : [{ station_active: true }];
}
```

Note: if `RewardType.TEMP_EVO_BRANCH_RESOURCE` doesn't exist under that exact name, use whatever member `queryPokestop.ts:195` references — copy it, don't invent.

- [ ] **Step 4: Run tests** — `pnpm test -- fortDnf` — expected: PASS. Adjust the test fixtures if the real `FilterX` types force different shapes (`as any` keeps fixtures small; keep them minimal but honest).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/queryMapObjects/fortDnf.ts src/lib/server/queryMapObjects/fortDnf.test.ts
git commit -m "feat: translate diadem filters to golbat fort dnf clauses"
```

---

### Task 4: ApiGymQuery

**Files:**
- Create: `src/lib/server/queryMapObjects/queryGymApi.ts`

**Interfaces:**
- Consumes: `scanGyms`, `getGolbatGym`, `GolbatGymResult` (Task 1); `buildGymDnfFilters` (Task 3); `GymQuery` (existing).
- Produces: `class ApiGymQuery extends GymQuery` overriding `query` and `querySingle`. Inherits `filter()`/`prepare()` from `GymQuery` — the mapper must produce exactly the `MinMapObject<GymData>` shape the SQL rows had, except native-JSON fields are set directly (so the inherited `defenders_raw`/`raw_rsvps` parsing no-ops).

- [ ] **Step 1: Create `queryGymApi.ts`:**

```ts
import type { FilterGym } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { getGolbatGym, scanGyms, type GolbatGymResult } from "@/lib/server/api/golbatApi";
import { buildGymDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { GymQuery } from "@/lib/server/queryMapObjects/queryGym";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { GymData } from "@/lib/types/mapObjectData/gym";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { error } from "@sveltejs/kit";
import { booleanPointInPolygon, point } from "@turf/turf";

function mapGym(g: GolbatGymResult): MinMapObject<GymData> {
	const { available_slots, deleted, defenders, rsvps, ...rest } = g;
	const gym = {
		...rest,
		availble_slots: available_slots ?? undefined,
		deleted: deleted ? 1 : 0
	} as MinMapObject<GymData>;

	// Native JSON on the wire — inherited prepare() only parses the *_raw string
	// variants, so normalize forms here and assign directly.
	if (defenders) {
		gym.defenders = defenders;
		for (const defender of gym.defenders) {
			defender.form = getNormalizedForm(defender.pokemon_id, defender.form);
		}
	}
	if (rsvps) gym.rsvps = rsvps;

	return gym;
}

export class ApiGymQuery extends GymQuery {
	async query(
		bounds: Bounds,
		filter: FilterGym | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<GymData>>> {
		const dnf = buildGymDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const result = await scanGyms({
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined
		});
		if (!result) error(500);

		if (result.limit_reached || result.gyms.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

		let examined = result.examined;
		const data: MinMapObject<GymData>[] = [];
		for (const g of result.gyms) {
			if (g.deleted) continue;
			if (since !== undefined && (g.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([g.lon, g.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapGym(g));
		}
		return { data, examined };
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<GymData>[]> {
		const gym = await getGolbatGym(id, thisFetch);
		return gym && !gym.deleted ? [mapGym(gym)] : [];
	}
}
```

- [ ] **Step 2: Verify** — `pnpm run check` passes. If `GymQuery`'s `query` signature clash produces a variance error, match the parent signature exactly (add the unused `context?: FeaturePermissionContext` parameter).

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/queryMapObjects/queryGymApi.ts
git commit -m "feat: gym map queries via golbat fort api"
```

---

### Task 5: ApiPokestopQuery

**Files:**
- Create: `src/lib/server/queryMapObjects/queryPokestopApi.ts`

**Interfaces:**
- Consumes: `scanPokestops`, `getGolbatPokestop`, `GolbatPokestopResult` (Task 1); `buildPokestopDnfFilters` (Task 3); `PokestopQuery` (existing).
- Produces: `class ApiPokestopQuery extends PokestopQuery` overriding `query`/`querySingle`. The mapper turns the API's nested `invasions[]` into diadem's `incident[]`; the inherited `prepare()` then builds quests, showcase data and confirmed rewards from the same field names the SQL provided.

- [ ] **Step 1: Create `queryPokestopApi.ts`:**

```ts
import type { FilterPokestop } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import {
	getGolbatPokestop,
	scanPokestops,
	type GolbatPokestopResult
} from "@/lib/server/api/golbatApi";
import { buildPokestopDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { PokestopQuery } from "@/lib/server/queryMapObjects/queryPokestop";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop";
import { error } from "@sveltejs/kit";
import { booleanPointInPolygon, point } from "@turf/turf";

function mapPokestop(p: GolbatPokestopResult): MinMapObject<PokestopData> {
	const { deleted, invasions, ...rest } = p;
	const pokestop = {
		...rest,
		deleted: deleted ? 1 : 0,
		incident: (invasions ?? []).map(
			(i) => ({ ...i, confirmed: i.confirmed ? 1 : 0 }) as unknown as Incident
		)
	} as MinMapObject<PokestopData>;
	return pokestop;
}

export class ApiPokestopQuery extends PokestopQuery {
	async query(
		bounds: Bounds,
		filter: FilterPokestop | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<PokestopData>>> {
		const dnf = buildPokestopDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const result = await scanPokestops({
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined,
			with_incidents: true
		});
		if (!result) error(500);

		if (result.limit_reached || result.pokestops.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

		let examined = result.examined;
		const data: MinMapObject<PokestopData>[] = [];
		for (const p of result.pokestops) {
			if (p.deleted) continue;
			if (since !== undefined && (p.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([p.lon, p.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapPokestop(p));
		}
		return { data, examined };
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<PokestopData>[]> {
		const stop = await getGolbatPokestop(id, thisFetch);
		return stop && !stop.deleted ? [mapPokestop(stop)] : [];
	}
}
```

- [ ] **Step 2: Check the incident field names line up.** The API incident uses `start`/`expiration` JSON keys (`ApiPokestopIncident`), diadem's `Incident` type uses `start`/`expiration` too (`pokestop.d.ts:61-70`) — verify with the type checker; if a name differs, rename it inside `mapPokestop`'s incident map instead of casting.

- [ ] **Step 3: Verify** — `pnpm run check` passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/queryMapObjects/queryPokestopApi.ts
git commit -m "feat: pokestop map queries via golbat fort api"
```

---

### Task 6: ApiStationQuery

**Files:**
- Create: `src/lib/server/queryMapObjects/queryStationApi.ts`

**Interfaces:**
- Consumes: `scanStations`, `getGolbatStation`, `GolbatStationResult` (Task 1); `buildStationDnfFilters` (Task 3); `StationQuery` (existing).
- Produces: `class ApiStationQuery extends StationQuery`. Booleans map to 0/1 (the `StationData` type declares numbers; `isMaxBattleActive` in `stationUtils.ts:40` and `matchMaxBattleFilterset` only use truthiness and `===` on ids, so 0/1 preserves behavior). The wire's `stationed_pokemon` string maps to `raw_stationed_pokemon` so the inherited `prepare()` parses it.

- [ ] **Step 1: Create `queryStationApi.ts`:**

```ts
import type { FilterStation } from "@/lib/features/filters/filters";
import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import {
	getGolbatStation,
	scanStations,
	type GolbatStationResult
} from "@/lib/server/api/golbatApi";
import { buildStationDnfFilters } from "@/lib/server/queryMapObjects/fortDnf";
import type { MapObjectResponse } from "@/lib/server/queryMapObjects/MapObjectQuery";
import { StationQuery } from "@/lib/server/queryMapObjects/queryStation";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { StationData } from "@/lib/types/mapObjectData/station";
import { error } from "@sveltejs/kit";
import { booleanPointInPolygon, point } from "@turf/turf";

function mapStation(s: GolbatStationResult): MinMapObject<StationData> {
	const { is_inactive, is_battle_available, stationed_pokemon, ...rest } = s;
	return {
		...rest,
		is_inactive: is_inactive ? 1 : 0,
		is_battle_available: is_battle_available ? 1 : 0,
		raw_stationed_pokemon: stationed_pokemon ?? undefined
	} as MinMapObject<StationData>;
}

export class ApiStationQuery extends StationQuery {
	async query(
		bounds: Bounds,
		filter: FilterStation | undefined,
		polygon: PermittedPolygon,
		since?: number,
		limit?: number
	): Promise<MapObjectResponse<MinMapObject<StationData>>> {
		const dnf = buildStationDnfFilters(filter);
		if (dnf === null) return { data: [], examined: 0 };

		const actualLimit = Math.min(limit ?? this.limit, this.limit);
		const result = await scanStations({
			min: { latitude: bounds.minLat, longitude: bounds.minLon },
			max: { latitude: bounds.maxLat, longitude: bounds.maxLon },
			limit: actualLimit + 1,
			filters: dnf.length ? dnf : undefined
		});
		if (!result) error(500);

		if (result.limit_reached || result.stations.length > actualLimit) {
			return { data: [], examined: actualLimit, limitReached: true };
		}

		let examined = result.examined;
		const data: MinMapObject<StationData>[] = [];
		for (const s of result.stations) {
			if (since !== undefined && (s.updated ?? 0) <= since) continue;
			if (polygon && !booleanPointInPolygon(point([s.lon, s.lat]), polygon)) {
				examined -= 1;
				continue;
			}
			data.push(mapStation(s));
		}
		return { data, examined };
	}

	async querySingle(id: string, thisFetch?: typeof fetch): Promise<MinMapObject<StationData>[]> {
		const station = await getGolbatStation(id, thisFetch);
		return station ? [mapStation(station)] : [];
	}
}
```

Note: unlike the SQL path, expired stations exist in the index (stations are the ephemeral fort type). `buildStationDnfFilters` pushes `station_active: true` on battle clauses; when plain stations are shown, expired ones may appear that SQL also returned (the `station` table keeps them too) — behavior matches. If parity testing shows extra expired stations vs SQL, add `{ station_active: true }` to the plain-station case and note it in the PR.

- [ ] **Step 2: Verify** — `pnpm run check` passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/queryMapObjects/queryStationApi.ts
git commit -m "feat: station map queries via golbat fort api"
```

---

### Task 7: Registry switch + live parity verification

**Files:**
- Modify: `src/lib/server/queryMapObjects/queryMapObjects.ts`

**Interfaces:**
- Consumes: `isFortApiEnabled` (Task 2), the three Api*Query classes (Tasks 4-6).
- Produces: `getQuery()` returns the API-backed instance for GYM/POKESTOP/STATION whenever detection is on; everything else (and the fallback) unchanged.

- [ ] **Step 1: Modify `queryMapObjects.ts`** — add below the existing `registry`:

```ts
import { isFortApiEnabled } from "@/lib/server/api/golbatFortApi";
import { ApiGymQuery } from "@/lib/server/queryMapObjects/queryGymApi";
import { ApiPokestopQuery } from "@/lib/server/queryMapObjects/queryPokestopApi";
import { ApiStationQuery } from "@/lib/server/queryMapObjects/queryStationApi";

// Used instead of the SQL classes while the Golbat fort API is detected (golbatFortApi.ts)
const fortApiRegistry: Partial<Record<MapObjectType, MapObjectQuery<any, any>>> = {
	[MapObjectType.GYM]: new ApiGymQuery(),
	[MapObjectType.POKESTOP]: new ApiPokestopQuery(),
	[MapObjectType.STATION]: new ApiStationQuery()
};

export function getQuery(type: MapObjectType): MapObjectQuery<any, any> {
	if (isFortApiEnabled()) {
		const apiQuery = fortApiRegistry[type];
		if (apiQuery) return apiQuery;
	}
	const query = registry[type];
	if (!query) error(404);
	return query;
}
```

(Replace the existing `getQuery` — keep a single export.)

- [ ] **Step 2: `pnpm run check` + `pnpm test`** — both pass.

- [ ] **Step 3: Live parity verification** (requires a Golbat with #385 and `fort_in_memory = true`; toggle Golbat's flag or stop Golbat to compare against the SQL path):

1. `pnpm run dev`, confirm the "fort API detected" log line.
2. In the browser: pan around with (a) plain gyms+pokestops+stations on, (b) raid-only filter with a boss list, (c) quest filter with a stardust range and an item, (d) invasion filter with characters, (e) max-battle filter with a boss and with hasGmax. Compare rendered objects against the same filters with Golbat's `fort_in_memory` off (SQL path) — same forts should render; popups must show defenders, RSVPs, quests, incidents (with confirmed lineups), showcases, stationed Pokémon.
3. Click individual gym/pokestop/station markers (exercises `querySingle` by-id).
4. Zoom out until the limit notice appears — confirm the "query limit reached" toast still fires (issue #151 behavior).
5. Stop Golbat, wait ≤60s: log line flips, map queries keep working via SQL. Start Golbat again: flips back.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/queryMapObjects/queryMapObjects.ts
git commit -m "feat: serve fort map objects from golbat api when detected"
```

---

### Task 8: Pick lists from availability (merged into MasterStats)

**Files:**
- Modify: `src/lib/server/api/queryStats.ts`
- Modify: `src/routes/api/stats/+server.ts`

**Interfaces:**
- Consumes: `isFortApiEnabled`, `getCachedFortAvailability` (Task 2); existing `MasterStats` types.
- Produces: `mergeFortAvailability(stats: MasterStats): MasterStats` exported from `queryStats.ts`; `count` becomes optional on `ActiveRaidStats`, `MaxBattleStatsEntry`, `ContestStatsEntry` (decision in issue #174 — the availability index cannot provide counts and nothing renders them).

Provisional decision (issue #174 open question): availability is merged into the existing `MasterStats` shape so no component changes. If ccev answers the open question differently, this task is the only one that moves.

- [ ] **Step 1: Make `count` optional** on `ActiveRaidStats`, `MaxBattleStatsEntry`, `ContestStatsEntry` in `queryStats.ts` (`count?: number`), run `pnpm run check`, and fix any strictness fallout (there should be none — producers still set it).

- [ ] **Step 2: Skip the three live-table SQL queries when the fort API is on.** In `queryMasterStats()`, the `Promise.all` currently always runs `allQuestStats` (UNION ALL over `pokestop` — the expensive one), `allContestStats` (live `pokestop` scan) and `allMaxBattlesStats` (live `station` scan). Wrap each:

```ts
import { isFortApiEnabled } from "@/lib/server/api/golbatFortApi";
// ... inside the Promise.all, replace the three queries:
		isFortApiEnabled() ? Promise.resolve([] as QuestStatsRow[]) : query<QuestStatsRow[]>(/* unchanged SQL */),
// same pattern for ContestStatsRow[] and MaxBattleStatsRow[]
```

(`allRaidStats` from `raid_stats` stays — it's an aggregate table, cheap, and stats keep their hourly cadence per issue #174.)

- [ ] **Step 3: Add `mergeFortAvailability` to `queryStats.ts`:**

```ts
import { getCachedFortAvailability, isFortApiEnabled } from "@/lib/server/api/golbatFortApi";
import type { FortAvailability } from "@/lib/server/queryMapObjects/queries";

// gmax battles are the level-6 tier; verify the numeric against ingameLocale.ts:135
// (1 = dynamax, 2 = gigantamax) and a live spot check before merging:
//   SELECT DISTINCT battle_level, battle_pokemon_bread_mode FROM station
//     WHERE battle_pokemon_bread_mode IS NOT NULL;
const BREAD_MODE_DYNAMAX = 1;
const BREAD_MODE_GIGANTAMAX = 2;

export function mergeFortAvailability(stats: MasterStats): MasterStats {
	const availability = getCachedFortAvailability();
	if (!isFortApiEnabled() || !availability) return stats;

	const activeRaids: ActiveRaidStats[] = availability.gyms.raids
		.filter((r) => r.pokemon_id)
		.map((r) => ({
			level: r.raid_level,
			pokemon_id: r.pokemon_id!,
			form: getNormalizedForm(r.pokemon_id!, r.form ?? 0),
			// not in availability yet (Golbat enrichment PR pending) — 0 until it lands
			temp_evolution_id: 0
		}));

	const activeMaxBattles: MaxBattleStatsEntry[] = availability.stations.battles
		.filter((b) => b.pokemon_id)
		.map((b) => ({
			level: b.battle_level,
			pokemon_id: b.pokemon_id!,
			form: getNormalizedForm(b.pokemon_id!, b.form ?? 0),
			bread_mode: b.battle_level >= 6 ? BREAD_MODE_GIGANTAMAX : BREAD_MODE_DYNAMAX
		}));

	const activeContests: ContestStatsEntry[] = availability.pokestops.showcases.map((s) => ({
		// ranking_standard not in availability yet (Golbat enrichment PR pending)
		ranking_standard: 0,
		focus: s.pokemon_id
			? {
					type: "pokemon",
					pokemon_id: s.pokemon_id,
					pokemon_form: getNormalizedForm(s.pokemon_id, s.form ?? 0)
				}
			: { type: "pokemon_type", pokemon_type: s.type_id ?? 0 }
	})) as ContestStatsEntry[];

	const quests: QuestStats = {};
	let questsTotal = 0;
	for (const q of availability.pokestops.quests) {
		const reward = questRewardFromAvailability(q);
		if (!reward) continue;
		const key = `${q.reward_type}|${q.item_id}|${q.pokemon_id}|${q.form_id}|${q.amount}|${q.title}|${q.target}`;
		const existing = quests[key];
		if (existing) {
			existing.count += q.count; // AR + no-AR variants of the same quest merge
		} else {
			quests[key] = { reward, title: q.title, target: q.target, count: q.count };
			questsTotal += q.count;
		}
	}

	return {
		...stats,
		activeRaids,
		activeMaxBattles,
		activeContests,
		quests,
		totalQuests: { count: questsTotal }
	};
}

function questRewardFromAvailability(
	q: FortAvailability["pokestops"]["quests"][number]
): QuestReward | undefined {
	switch (q.reward_type) {
		case RewardType.ITEM:
			return { type: RewardType.ITEM, info: { item_id: q.item_id, amount: q.amount } };
		case RewardType.POKEMON:
			return {
				type: RewardType.POKEMON,
				info: { pokemon_id: q.pokemon_id, form: getNormalizedForm(q.pokemon_id, q.form_id) }
			} as QuestReward;
		case RewardType.CANDY:
		case RewardType.XL_CANDY:
		case RewardType.MEGA_ENERGY:
			return {
				type: q.reward_type,
				info: { pokemon_id: q.pokemon_id, amount: q.amount }
			} as QuestReward;
		case RewardType.STARDUST:
		case RewardType.XP:
		case RewardType.POKECOINS:
			return { type: q.reward_type, info: { amount: q.amount } } as QuestReward;
		default:
			return { type: q.reward_type, info: {} } as QuestReward;
	}
}
```

Check the exact member shapes of the `QuestReward` union and `ContestFocus` union in `pokestop.d.ts` (e.g. the type-based focus member's property names, `ContestFocusType`) and adjust the literals so `pnpm run check` passes without `as` erasing real mismatches — the casts above are only for narrowing the union, not hiding wrong field names.

- [ ] **Step 4: Merge at request time** in `src/routes/api/stats/+server.ts` — wrap the provider result:

```ts
import { mergeFortAvailability } from "@/lib/server/api/queryStats";
// ...
	const stats = await masterstatsProvider.get();
	return json(mergeFortAvailability(stats), { headers: ... /* keep existing headers */ });
```

This keeps the hourly SQL cadence for everything else while pick lists reflect the ≤60s-fresh availability cache on every `/api/stats` fetch.

- [ ] **Step 5: Verify live** — with fort API on: open the raid filterset → boss pick list populated (mega bosses appear as their base form until the Golbat enrichment lands — known, accepted); quest reward select shows rewards with counts; max battle boss list shows gmax badges only on level-6 bosses; showcase filter lists focus options; GymPopup on an egg shows possible bosses. With fort API off: everything falls back to the SQL-built stats exactly as today.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/api/queryStats.ts src/routes/api/stats/+server.ts
git commit -m "feat: source filter pick lists from golbat fort availability"
```

---

### Task 9: Documentation

**Files:**
- Modify: `docs/src/content/docs/reference/configuration.md` (the `server.golbat` section)

- [ ] **Step 1:** Add to the `server.golbat` section:

```md
### Golbat fort API (optional, recommended)

When your Golbat exposes the fort map-data API (Golbat with [#385](https://github.com/UnownHash/Golbat/pull/385), `fort_in_memory = true` in Golbat's config — `preload = true` recommended), Diadem detects it automatically at startup and serves gyms, pokéstops and stations from it instead of SQL, and sources filter pick lists from Golbat's availability index. No Diadem configuration is needed — detection re-checks every minute, so Golbat can be upgraded or toggled without restarting Diadem. Without it, Diadem falls back to direct database queries as before.
```

- [ ] **Step 2:** `pnpm run lint` passes (prettier covers markdown). Commit:

```bash
git add docs/src/content/docs/reference/configuration.md
git commit -m "docs: document golbat fort api auto-detection"
```

---

### Task 10 (blocked on Golbat status endpoint — Appendix A.1): prefer the status call for detection

Keep the availability-probe from Task 2 as the fallback for older Golbat versions. Once A.1 lands:

- [ ] **Step 1:** Add to `golbatApi.ts`:

```ts
export type GolbatStatus = {
	features: { fort_in_memory: boolean };
	limits?: { max_pokemon_results?: number; max_fort_results?: number };
};

export async function fetchGolbatStatus() {
	return await callGolbat<GolbatStatus>("api/status", "GET", undefined, fetch, true);
}
```

(Adjust path/field names to whatever the merged Golbat PR defines — check the PR, not this plan.)

- [ ] **Step 2:** In `golbatFortApi.ts`, call `fetchGolbatStatus()` first in `refreshFortAvailability()`: if it returns a body, `fortApiEnabled = status.features.fort_in_memory` and only fetch availability when enabled; if it returns `undefined` (older Golbat), keep the existing probe behavior unchanged. If the status call reports limits, log them once — clamping `requestLimits` to server caps is a follow-up, not this plan.

- [ ] **Step 3:** `pnpm run check`, live-verify both detection paths, commit `feat: detect fort api via golbat status endpoint`.

---

## Appendix A — Golbat-side prerequisites (separate repo: UnownHash/Golbat)

These are **not** tasks in this plan (different repo/language); they're the contracts diadem codes against. James (jfberry) is a Golbat committer; treat them as accepted-on-filing. The diadem tasks above all work against currently-merged Golbat (#385) — nothing here blocks Tasks 1-9.

1. **Status/feature-flags endpoint** (blocks Task 10 only): report enabled optional features (`fort_in_memory`) and useful server facts (max scan limits). Diadem's Task 2 probe remains the fallback.
2. **`limit_reached` on fort scan responses**: straight mirror of Golbat #392 (pre-expiry key count vs effective limit) on `ApiGymScanResult`, `ApiPokestopScanResult`, `ApiStationScanResult`, `ApiFortCombinedScanResult`. Diadem already reads the optional field (Tasks 4-6) and the `limit + 1` overflow check covers the interim.
3. **Availability enrichment**: `temp_evolution_id` on `ApiGymRaidAvailable`, `ranking_standard` on `ApiPokestopShowcaseAvailable` (both exist on the underlying records; update `decoder/fort_availability.go` index keys + the golden-snapshot tests). When landed: map them in Task 8's merge (replace the two `0` placeholders).
4. **Bug fix**: `ApiPokestopResult.FirstSeenTimestamp` is `int16` (`decoder/api_pokestop.go`) — unix timestamps truncate. Change to `int64`; the reflection completeness test should have caught the width, extend it if practical.

## Appendix B — Known behavioral deltas (accepted in issue #174)

- Raid/battle/showcase pick lists lose `count` (never rendered; availability index can't provide them by design).
- Mega raid bosses appear without their mega form in pick lists until A.3 lands (`temp_evolution_id: 0`).
- Showcase `ranking_standard` is 0 in pick lists until A.3 lands.
- Pick lists refresh within ~60s of game-state changes instead of hourly (improvement).
- `enabled` is now populated on gyms/pokestops from the API (was declared but never selected).
