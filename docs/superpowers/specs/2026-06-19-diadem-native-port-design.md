# Diadem Native (iOS + Android) — Design

**Date:** 2026-06-19
**Status:** Approved (design); pending implementation plan

## Summary

Port the Diadem web app (SvelteKit SPA + MapLibre GL JS) to native iOS and
Android using **Capacitor**. The native app bundles the existing Svelte client
and runs it in Capacitor's system webview as a **thin client**: every server
interaction (`/api/*`, `/assets/*`, auth) is sent to a configured remote Diadem
instance. No server code ships in the app.

The map stays **maplibre-gl JS** in the webview. Native MapLibre rendering is
explicitly **deferred** (a custom dual-platform plugin with no off-the-shelf
option; revisit later behind the existing `map.svelte.ts` seam).

### Key identifiers
- **App id:** `ee.malt.diadem`
- **App display name:** `Diadem`
- **Diadem project domain:** `diadem.malt.ee`
- **Reference test instance:** `https://demap.co` (a heavily modified fork on the
  same repo version — expect some unexpected behaviour; it is for end-to-end
  testing, not a behaviour spec).

## Architecture

### Thin client + remote instance
SSR is already disabled globally (`export const ssr = false`), so the client is
already a SPA. The native app wraps that SPA; all server calls resolve against a
configured instance URL.

### Two build modes from one codebase
- **Server build (unchanged):** `adapter-node` → the hosted Diadem instance.
- **Native build (new):** `adapter-static` SPA mode → static assets Capacitor
  wraps. Selected by an env flag in `svelte.config.js`. Server routes (`/api`,
  `/assets`, thumbnail/satori, auth endpoints) are absent from this bundle —
  they live on the instance.

Build-mode selection must not regress the web/server build. The static build is
validated as a known build detail (may need `adapter-static` with a SPA
fallback and `prerender = false`; confirm endpoints are excluded).

## Subsystems

### A. Capacitor scaffold + build pipeline
- Add `@capacitor/core`, `@capacitor/cli`, android + ios platforms.
- `capacitor.config.ts`: app id `ee.malt.diadem`, name `Diadem`, webDir = static
  build output, icon/splash.
- Wire `cap sync` to the native static build.
- **NixOS dev shell** (`flake.nix`): Node 22, JDK 17, Android SDK +
  platform-tools, Gradle. (iOS toolchain is macOS-only and out of this shell.)

### B. API base layer
- A single `apiBase()` resolver. All relative `fetch("/api/…")` calls (~20 sites
  across `services/`, `features/`, `mapObjects/`) and `/assets/…` URLs
  (including maplibre `loadImage`) route through it → `${instanceUrl}/…`.
- In the browser/dev/server build, `apiBase()` returns `""` → web app unchanged.
- Networking via **`CapacitorHttp`** (native HTTP: avoids CORS, native cookie
  jar, attaches the bearer token).

### C. Instance gate
- First-run screen: enter Diadem URL → validate by hitting `/api/config` (or
  `/api/supported-features`) → persist with **Capacitor Preferences**.
- Switchable later from settings.
- **Build-time hardcode:** if an instance URL is baked in at build time (e.g.
  `demap.co` for the user's branded "demap" app), the gate is skipped entirely.

### D. Auth — provider-agnostic token handoff
On native, system-browser OAuth cookies are not visible to the app's webview, so
auth uses a token handoff instead of cookies:
1. `/login/<provider>` opens the **system browser** (`@capacitor/browser`).
2. After OAuth, a **new Diadem server bounce endpoint** mints a short-lived
   one-time token and redirects to `diadem://auth?token=…`.
3. The app catches the deep link, exchanges the token for a session token
   (better-auth bearer), stores it (Preferences / secure storage).
4. `CapacitorHttp` sends `Authorization: Bearer …` on every call.

Works for **any** better-auth provider (not Discord-specific).

**Server changes to Diadem (in scope):** enable bearer / one-time-token support,
add the bounce endpoint, register the `diadem://` deep-link callback as a trusted
origin. Gated so they are no-ops for the existing web flow.

### E. Deep links
- Custom scheme `diadem://` routes into the SPA router: `/a/…`, `/pokemon/<id>`,
  `/wayfarer`, and the other `(share)`/direct-link routes.
- **Hardcoded/branded builds** additionally register **universal/app links** for
  that specific instance domain (feasible because the publisher owns it, e.g.
  `demap.co`).
- The generic multi-instance app uses the custom scheme only (cannot claim
  arbitrary instance domains).

### F. Native web APIs (behind existing seams, web fallback preserved)
- `geolocate.svelte.ts` → `@capacitor/geolocation` (+ runtime permission).
- `device.ts` clipboard → `@capacitor/clipboard`.
- `device.ts` share → `@capacitor/share`.
Each guarded by `Capacitor.isNativePlatform()`; web keeps the existing
`navigator.*` paths.

### G. Strip Home on native
- Native always boots into the map; the `<Home />` / `isOnMap()` branch is
  bypassed under a native-platform flag.
- Android hardware back button handled (close popup/menu, then exit).

### H. Drawers
- Keep `diadem-vaul-svelte` (works fine in the webview). A native sheet is noted
  as future polish, **not in scope**.

## Data flow (native boot)
Boot → read stored instance (or hardcoded) → gate if missing → load instance
`/api/config` + user settings → SPA renders map → map/data calls go through
`apiBase()` + `CapacitorHttp` with bearer → auth via system browser + deep-link
token when needed.

## Error handling
- Unreachable/invalid instance → gate shows a clear error, offers retry / re-enter.
- Expired/invalid token → 401 → silent re-auth or return to login.
- Offline → existing app states; the static shell still loads.

## Testing
- **Android (fully doable locally):** `flake.nix` dev shell → `cap run android`
  onto a USB-debugging phone. Fast loop: Capacitor live-reload pointed at the
  Vite dev server on the LAN. Production-like: static build → `cap sync` → run.
  Verify against a real instance (`https://demap.co`).
- **iOS (constraints):** cannot build/run iOS on NixOS — requires macOS + Xcode;
  real-device install needs an Apple Developer account. iOS-side code is written
  carefully and validated via a **macOS CI job (GitHub Actions `macos` runner)
  building + booting the iOS Simulator**. Real iPhone QA needs Apple hardware.
- **Deep links / auth:** simulate with
  `adb shell am start -a android.intent.action.VIEW -d "diadem://…"`; test OAuth
  end-to-end against the instance.

## Out of scope (explicit)
- Native MapLibre rendering (deferred; webview JS map for now).
- Native drawers (keep vaul).
- The custom Home page on native.
- iOS real-device QA in this environment.

## Open implementation details to resolve during planning
- Exact `adapter-static` SPA configuration and endpoint exclusion.
- Exact better-auth mechanism for the one-time-token handoff (plugin choice).
- `CapacitorHttp` interaction with maplibre's internal image/tile fetching.
- App icon / splash assets.
