# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Diadem — a Pokémon GO map frontend built with SvelteKit and MapLibre GL. Connects to Golbat (scanner DB), Koji (geofences), and Dragonite (scout data) backends. Uses Discord OAuth for auth with role-based permissions.

## Commands

- **Dev server:** `pnpm run dev`
- **Build:** `pnpm run build`
- **Type check:** `pnpm run check`
- **Lint (prettier):** `pnpm run lint`
- **Format:** `pnpm run format`
- **DB push schema:** `pnpm run db:push`
- **DB studio:** `pnpm run db:studio`

- **Test:** `pnpm test`
  tests are not yet implemented, ignore this.

Tests must always be passing. Run `pnpm test` after making changes to verify. Node 22+ required. Uses pnpm.

## Tech Stack

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`) — NOT legacy stores
- **SvelteKit** with `adapter-node`, SSR disabled globally (`export const ssr = false`)
- **Svelte compiler** has `experimental.async` enabled
- **TypeScript** strict mode
- **Tailwind CSS 4** via PostCSS
- **MapLibre GL** + `svelte-maplibre` for maps
- **Drizzle ORM** with MySQL (internal DB for users/sessions)
- **Raw SQL queries** via mysql2 for external Golbat DB
- **Paraglide.js** (inlang) for i18n — translations in `messages/*.json`, generated code in `src/lib/paraglide/`
- **bits-ui** for headless UI components
- **runed** for Svelte reactivity utilities
- **zod** for validation
- **arctic** for Discord OAuth

## Architecture

### Route Groups

- `(auth)/` — Discord login flow
- `(main)/` — Main map UI, uses `[[map=map]]` optional param
- `(share)/` — Shareable filter/area links
- `api/` — REST endpoints; `[queryMapObject=mapObject]` is the dynamic map object query route
- `assets/` — UICON proxy with sharp optimization

### Source Organization

- `src/lib/server/` — Server-only: DB, auth, API query logic, config parsing, providers
- `src/lib/services/` — Client/isomorphic services (search, user settings, uicons, masterfile)
- `src/lib/features/` — Feature state (filters, search, scout, coverage)
- `src/lib/mapObjects/` — Map object state management and types
- `src/lib/map/` — MapLibre instance management
- `src/lib/types/mapObjectData/` — Type definitions per map object (pokemon, gym, pokestop, station, nest, route, etc.)
- `src/lib/utils/` — Utility functions per entity type
- `src/components/` — UI components; `components/custom/` are user-overridable via config symlinks
- `src/params/` — SvelteKit param matchers (`map.ts`, `mapObject.ts`)

### Key Patterns

- **Providers** (`src/lib/server/provider/`): TTL-based cached data fetchers for masterfile, uicons index, remote locale, master stats
- **Permissions**: Hierarchical Discord role-based system — `everyone → loggedIn → guildId → roleId`, per-feature and per-area grants
- **State files** use `.svelte.ts` extension for reactive Svelte 5 state (e.g., `mapObjectsState.svelte.ts`, `userSettings.svelte.ts`)
- **Config**: TOML-based (`config/config.toml`, symlinked into `src/lib/server/config.toml` by `setup.sh`)
- **Custom CSS/components**: `config/` directory files symlinked into `src/` by `setup.sh`

### Data Flow

1. Server hooks (`hooks.server.ts`) chain: paraglide i18n → auth/session/permissions → server init
2. Layout load fetches config + user settings
3. Map queries: client POSTs bounds + filters to `/api/[mapObject]` → server queries Golbat DB with permission checks → returns filtered data
4. Map objects stored in reactive `mapObjectsState`, rendered via MapLibre layers

### i18n

- Import translations: `import { m } from "@/lib/paraglide/messages"`
- Use: `m.key_name()`
- Add strings to `messages/en.json` (base), append to the end of file, do not add translations, only english.
- Path alias `@` maps to `./src`

### Database

- **Internal DB** (Drizzle): users + sessions tables in `src/lib/server/db/internal/schema.ts`
- **External DB** (raw queries): Golbat scanner data via `src/lib/server/db/external/`

### Documentation

An Astro Starlight-based documentation site can be founder under /docs. When adding major features, changing installation steps or changing the config definition, make sure to update the documentation.

## Svelte MCP

You might be able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

# Notes (important)

- Do not touch parts of the project unrelated to your current task
