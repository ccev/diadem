# Diadem Native — Plan 1: Foundation (runnable Android app against a remote instance)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a Capacitor Android app that boots straight into the Diadem map and loads all data from a configured remote Diadem instance, while the existing web/server build is completely unchanged.

**Architecture:** The existing SvelteKit SPA is bundled into Capacitor and runs in the system webview as a thin client. A `hooks.client.ts` `init` installs a `window.fetch` wrapper that rewrites instance-relative requests (`/api/*`, `/assets/*`) to `${instanceUrl}/...` and routes them through `CapacitorHttp` (no CORS, native cookie jar, future bearer header). The basemap loads from absolute URLs in config and is untouched. A second `adapter-static` build mode produces the bundled assets. All native behaviour is guarded by `Capacitor.isNativePlatform()`, so the web build is byte-for-byte unaffected.

**Tech Stack:** Capacitor 7 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`), `@sveltejs/adapter-static`, Vitest (new, for the pure native helpers), Nix flake dev shell (Node 22, JDK 17, Android SDK, Gradle).

**Scope of this plan (Plan 1 only):** scaffold, build pipeline, Nix shell, the native fetch/URL layer, boot-into-map, and a hardcoded test instance (`https://demap.co`). **Out of this plan (later plans):** instance-gate UI, native web APIs (geo/clipboard/share), auth + deep links + Diadem server changes, iOS.

**Reference instance for manual verification:** `https://demap.co` (a modified fork on the same repo version — expect minor behavioural differences).

---

## File structure

New files:
- `flake.nix` — NixOS dev shell (Node, JDK, Android SDK, Gradle).
- `vitest.config.ts` — test runner config (project had none).
- `src/lib/native/runtime.ts` — `isNative()`, `getInstanceUrl()`, `normalizeInstanceUrl()`.
- `src/lib/native/rewriteUrl.ts` — pure URL-rewrite decision (`rewriteInstanceUrl()`).
- `src/lib/native/nativeFetch.ts` — `installNativeFetch()` (wraps `window.fetch`, uses `CapacitorHttp`).
- `src/lib/native/runtime.test.ts`, `src/lib/native/rewriteUrl.test.ts` — unit tests.
- `src/hooks.client.ts` — installs the native fetch wrapper before the app boots.
- `capacitor.config.ts` — Capacitor project config.

Modified files:
- `package.json` — deps + scripts.
- `svelte.config.js` — env-switched adapter (node vs static).
- `src/routes/+layout.ts` — on native, redirect to the map path after config loads.
- `.gitignore` — ignore `android/`, `ios/`, build output.

---

## Task 1: NixOS dev shell

**Files:**
- Create: `flake.nix`

- [ ] **Step 1: Write `flake.nix`**

```nix
{
  description = "Diadem native (Capacitor) dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
          config.android_sdk.accept_license = true;
        };

        android = pkgs.androidenv.composeAndroidPackages {
          platformVersions = [ "34" "35" ];
          buildToolsVersions = [ "34.0.0" "35.0.0" ];
          includeEmulator = false;
          includeSystemImages = false;
          includeNDK = false;
        };
        androidSdk = android.androidsdk;
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs_22
            pkgs.nodejs_22.pkgs.pnpm
            pkgs.jdk17
            pkgs.gradle
            androidSdk
          ];

          ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
          ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
          JAVA_HOME = "${pkgs.jdk17}";

          shellHook = ''
            export PATH="$ANDROID_HOME/platform-tools:$PATH"
            echo "Diadem native dev shell — node $(node -v), java $(java -version 2>&1 | head -1)"
          '';
        };
      });
}
```

- [ ] **Step 2: Enter the shell and verify the toolchain**

Run:
```bash
nix develop --command bash -c 'node -v && java -version && echo $ANDROID_HOME && ls $ANDROID_HOME/platforms'
```
Expected: Node `v22.x`, OpenJDK `17.x`, a non-empty `$ANDROID_HOME`, and an `android-34`/`android-35` directory listed. (If the Android SDK derivation needs a version bump, adjust `platformVersions`/`buildToolsVersions` and re-run.)

- [ ] **Step 3: Commit**

```bash
git add flake.nix
git commit -m "build: add NixOS dev shell for Capacitor Android toolchain"
```

---

## Task 2: Install dependencies and the test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime + dev dependencies**

Run (inside `nix develop`):
```bash
pnpm add @capacitor/core@^7 @capacitor/android@^7
pnpm add -D @capacitor/cli@^7 @sveltejs/adapter-static@^3 vitest@^2
```
Expected: installs succeed; `package.json` gains these entries.

- [ ] **Step 2: Add the test + cap scripts to `package.json`**

In `package.json` `"scripts"`, add:
```json
		"test": "vitest run",
		"test:watch": "vitest",
		"cap:sync": "cap sync",
		"build:native": "BUILD_TARGET=native vite build"
```
(Replace the existing placeholder `"test"` note in CLAUDE.md context — this is now a real runner.)

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: { "@": path.resolve(__dirname, "./src") }
	},
	test: {
		include: ["src/**/*.test.ts"],
		environment: "node"
	}
});
```

- [ ] **Step 4: Verify the runner starts (no tests yet = no failure)**

Run: `pnpm test`
Expected: Vitest runs and reports "No test files found" (exit 0) — confirms the runner is wired.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "build: add Capacitor, adapter-static, and Vitest"
```

---

## Task 3: Native runtime module (instance URL + platform detection)

**Files:**
- Create: `src/lib/native/runtime.ts`
- Test: `src/lib/native/runtime.test.ts`

- [ ] **Step 1: Write the failing test for `normalizeInstanceUrl`**

```ts
// src/lib/native/runtime.test.ts
import { describe, it, expect } from "vitest";
import { normalizeInstanceUrl } from "@/lib/native/runtime";

describe("normalizeInstanceUrl", () => {
	it("strips a trailing slash", () => {
		expect(normalizeInstanceUrl("https://demap.co/")).toBe("https://demap.co");
	});
	it("adds https:// when no scheme is present", () => {
		expect(normalizeInstanceUrl("demap.co")).toBe("https://demap.co");
	});
	it("preserves an explicit http scheme", () => {
		expect(normalizeInstanceUrl("http://192.168.1.5:5173")).toBe("http://192.168.1.5:5173");
	});
	it("returns empty string for empty input", () => {
		expect(normalizeInstanceUrl("")).toBe("");
		expect(normalizeInstanceUrl("   ")).toBe("");
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/native/runtime.test.ts`
Expected: FAIL — "Failed to resolve import ... runtime" / `normalizeInstanceUrl is not a function`.

- [ ] **Step 3: Implement `src/lib/native/runtime.ts`**

```ts
import { Capacitor } from "@capacitor/core";

/** True only inside a Capacitor native shell (iOS/Android), false in any browser. */
export function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

/** Normalize a user/instance URL: trim, add https:// if no scheme, drop trailing slash. */
export function normalizeInstanceUrl(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	return withScheme.replace(/\/+$/, "");
}

/**
 * The remote Diadem instance the app talks to.
 * Plan 1: build-time hardcode via VITE env (set to https://demap.co for testing).
 * Later plan: fall back to a value stored via the instance-gate screen.
 * Returns "" on web/dev so relative same-origin fetches are used unchanged.
 */
export function getInstanceUrl(): string {
	if (!isNative()) return "";
	const baked = import.meta.env.VITE_DIADEM_INSTANCE as string | undefined;
	return normalizeInstanceUrl(baked ?? "");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/native/runtime.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/native/runtime.ts src/lib/native/runtime.test.ts
git commit -m "feat(native): instance URL + platform detection helpers"
```

---

## Task 4: URL rewrite decision (pure function)

**Files:**
- Create: `src/lib/native/rewriteUrl.ts`
- Test: `src/lib/native/rewriteUrl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/native/rewriteUrl.test.ts
import { describe, it, expect } from "vitest";
import { rewriteInstanceUrl } from "@/lib/native/rewriteUrl";

const INSTANCE = "https://demap.co";
const LOCAL = "https://localhost"; // the native webview origin

describe("rewriteInstanceUrl", () => {
	it("rewrites a local-origin /api request to the instance", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/api/config`, INSTANCE, LOCAL)).toBe(
			"https://demap.co/api/config"
		);
	});
	it("rewrites a local-origin /assets request to the instance", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/assets/pokemon/1.png`, INSTANCE, LOCAL)).toBe(
			"https://demap.co/assets/pokemon/1.png"
		);
	});
	it("preserves query strings", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/api/search/forts?q=x`, INSTANCE, LOCAL)).toBe(
			"https://demap.co/api/search/forts?q=x"
		);
	});
	it("does NOT rewrite an unrelated local path", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/map`, INSTANCE, LOCAL)).toBeNull();
	});
	it("does NOT rewrite an absolute external URL (e.g. basemap tiles)", () => {
		const tile = "https://tiles.example.com/12/34/56.pbf";
		expect(rewriteInstanceUrl(tile, INSTANCE, LOCAL)).toBeNull();
	});
	it("returns null when there is no instance configured", () => {
		expect(rewriteInstanceUrl(`${LOCAL}/api/config`, "", LOCAL)).toBeNull();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test src/lib/native/rewriteUrl.test.ts`
Expected: FAIL — `rewriteInstanceUrl is not a function`.

- [ ] **Step 3: Implement `src/lib/native/rewriteUrl.ts`**

```ts
/** Paths that live on the Diadem instance and must be redirected there on native. */
const INSTANCE_PREFIXES = ["/api/", "/assets/"];

/**
 * Decide whether a request URL should be redirected to the remote instance.
 * Returns the rewritten absolute URL, or null to leave the request untouched.
 *
 * @param requestUrl absolute URL of the outgoing request
 * @param instanceUrl normalized instance origin ("" = none configured)
 * @param localOrigin the webview's own origin (requests to this origin are candidates)
 */
export function rewriteInstanceUrl(
	requestUrl: string,
	instanceUrl: string,
	localOrigin: string
): string | null {
	if (!instanceUrl) return null;

	let parsed: URL;
	try {
		parsed = new URL(requestUrl);
	} catch {
		return null;
	}

	// Only rewrite requests aimed at our own webview origin.
	if (parsed.origin !== localOrigin) return null;

	const matches = INSTANCE_PREFIXES.some(
		(p) => parsed.pathname === p.slice(0, -1) || parsed.pathname.startsWith(p)
	);
	if (!matches) return null;

	return `${instanceUrl}${parsed.pathname}${parsed.search}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test src/lib/native/rewriteUrl.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/native/rewriteUrl.ts src/lib/native/rewriteUrl.test.ts
git commit -m "feat(native): pure URL-rewrite decision for instance requests"
```

---

## Task 5: Native fetch wrapper (CapacitorHttp)

**Files:**
- Create: `src/lib/native/nativeFetch.ts`

- [ ] **Step 1: Implement `src/lib/native/nativeFetch.ts`**

```ts
import { CapacitorHttp } from "@capacitor/core";
import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import { rewriteInstanceUrl } from "@/lib/native/rewriteUrl";

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function headersToObject(init?: RequestInit, req?: Request): Record<string, string> {
	const out: Record<string, string> = {};
	const h = init?.headers ?? req?.headers;
	if (!h) return out;
	new Headers(h).forEach((value, key) => (out[key] = value));
	return out;
}

/**
 * Install a window.fetch wrapper that redirects instance-relative requests
 * (/api, /assets) to the configured remote instance and runs them through
 * CapacitorHttp (native HTTP: no CORS, native cookie jar; bearer added later).
 * Non-instance requests fall through to the original fetch unchanged.
 * No-op off native.
 */
export function installNativeFetch(): void {
	if (!isNative()) return;

	const instance = getInstanceUrl();
	const localOrigin = window.location.origin;
	const originalFetch = window.fetch.bind(window);

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const req = input instanceof Request ? input : undefined;
		const url = req ? req.url : input instanceof URL ? input.href : String(input);

		const target = rewriteInstanceUrl(url, instance, localOrigin);
		if (!target) return originalFetch(input as RequestInfo, init);

		const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
		const headers = headersToObject(init, req);

		let data: unknown = init?.body ?? undefined;
		if (data === undefined && req && method !== "GET" && method !== "HEAD") {
			data = await req.clone().text();
		}

		const response = await CapacitorHttp.request({
			url: target,
			method,
			headers,
			data,
			responseType: "blob" // base64 payload in response.data; works for JSON + binary
		});

		const bytes = typeof response.data === "string" ? base64ToBytes(response.data) : new Uint8Array();
		return new Response(bytes, {
			status: response.status,
			headers: response.headers as Record<string, string>
		});
	};
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run check`
Expected: no new type errors in `src/lib/native/`. (Pre-existing project errors, if any, are unrelated.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/native/nativeFetch.ts
git commit -m "feat(native): CapacitorHttp-backed fetch wrapper for instance requests"
```

---

## Task 6: Install the wrapper before the app boots

**Files:**
- Create: `src/hooks.client.ts`

- [ ] **Step 1: Create `src/hooks.client.ts`**

```ts
import type { ClientInit } from "@sveltejs/kit";
import { installNativeFetch } from "@/lib/native/nativeFetch";

// Runs once, before any +layout.ts/+page.ts load function — so the very first
// fetch("/api/config") in the root layout is already redirected on native.
export const init: ClientInit = () => {
	installNativeFetch();
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run check`
Expected: no new errors. (`ClientInit` is exported by `@sveltejs/kit`.)

- [ ] **Step 3: Verify the web build is unaffected**

Run: `pnpm run build`
Expected: the normal adapter-node build still succeeds (the hook is a no-op off native).

- [ ] **Step 4: Commit**

```bash
git add src/hooks.client.ts
git commit -m "feat(native): install native fetch wrapper in client init hook"
```

---

## Task 7: Boot straight into the map on native

**Files:**
- Modify: `src/routes/+layout.ts`

- [ ] **Step 1: Update `src/routes/+layout.ts` to redirect into the map on native**

Replace the file contents with:
```ts
import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { setConfig } from "@/lib/services/config/config";
import { getMapPath } from "@/lib/utils/getMapPath";
import { isNative } from "@/lib/native/runtime";
import {
	getDefaultUserSettings,
	setUserSettings,
	updateUserSettings
} from "@/lib/services/userSettings.svelte";
import type { LayoutLoad } from "./$types";

export const ssr = false;

export const load: LayoutLoad = async ({ fetch, url }) => {
	const configResponse = await fetch("/api/config");
	const config = await configResponse.json();
	setConfig(config);

	let rawUserSettings: string | null = null;
	if (browser && window.localStorage) {
		rawUserSettings = localStorage.getItem("userSettings");
	}

	if (rawUserSettings) {
		setUserSettings(JSON.parse(rawUserSettings));
	} else {
		setUserSettings(getDefaultUserSettings());
	}

	updateUserSettings();

	// On native, never show the custom Home page — go straight to the map.
	if (isNative()) {
		const mapPath = getMapPath(config);
		if (url.pathname === "/" && mapPath !== "/") {
			throw redirect(307, mapPath);
		}
	}
};
```

- [ ] **Step 2: Typecheck + web build sanity**

Run: `pnpm run check && pnpm run build`
Expected: no new type errors; adapter-node build succeeds. (On web, `isNative()` is false, so behaviour is identical to before.)

- [ ] **Step 3: Commit**

```bash
git add src/routes/+layout.ts
git commit -m "feat(native): boot into the map path, skipping Home"
```

---

## Task 8: Static build mode (adapter switch)

**Files:**
- Modify: `svelte.config.js`

- [ ] **Step 1: Update `svelte.config.js` to switch adapters by env**

Replace the file contents with:
```js
import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isNative = process.env.BUILD_TARGET === "native";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: isNative
			? adapterStatic({ fallback: "index.html", strict: false })
			: adapterNode(),
		alias: {
			"@": "src"
		},
		files: {
			serviceWorker: "src/lib/serviceWorker/index.ts"
		}
	},

	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
```

Notes for the implementer:
- `fallback: "index.html"` makes a SPA shell so client-side routes (`/map`, `/a/...`, `/pokemon/<id>`) resolve.
- `strict: false` is required because the server endpoints (`/api`, `/assets`) are not prerendered — they live on the instance and are excluded from the native bundle.

- [ ] **Step 2: Verify the native static build produces a client bundle**

Run: `BUILD_TARGET=native VITE_DIADEM_INSTANCE=https://demap.co pnpm build`
Expected: build succeeds and `build/` contains `index.html` + `_app/` client assets (no Node server entry). If adapter-static errors on a specific endpoint, confirm `strict: false` is set and that no page has `export const prerender = true`.

- [ ] **Step 3: Verify the normal server build still works**

Run: `pnpm build`
Expected: adapter-node build succeeds unchanged.

- [ ] **Step 4: Commit**

```bash
git add svelte.config.js
git commit -m "build: env-switched adapter (node for server, static for native)"
```

---

## Task 9: Capacitor scaffold + Android platform

**Files:**
- Create: `capacitor.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "ee.malt.diadem",
	appName: "Diadem",
	webDir: "build",
	server: {
		androidScheme: "https"
	}
};

export default config;
```

- [ ] **Step 2: Ignore generated native projects and build output**

Append to `.gitignore`:
```
# Capacitor / native
/android
/ios
/build
.gradle
```
(Plan 1 keeps the generated `android/` project out of git; it is regenerated with `cap add android`. A later plan can decide to commit it for CI.)

- [ ] **Step 3: Produce a native build, then add + sync the Android platform**

Run (inside `nix develop`):
```bash
BUILD_TARGET=native VITE_DIADEM_INSTANCE=https://demap.co pnpm build
npx cap add android
npx cap sync android
```
Expected: `cap add android` creates `android/`; `cap sync` copies `build/` into the Android assets and installs the Android plugins without error.

- [ ] **Step 4: Commit**

```bash
git add capacitor.config.ts .gitignore
git commit -m "feat(native): Capacitor scaffold + Android platform (ee.malt.diadem)"
```

---

## Task 10: Build, run on device, and verify against the instance

**Files:** none (verification task)

- [ ] **Step 1: Connect the Android phone**

Enable USB debugging on the phone, plug it in, then run:
```bash
adb devices
```
Expected: the device is listed as `device` (authorize the prompt on the phone if needed).

- [ ] **Step 2: Build with the test instance baked in and run**

Run (inside `nix develop`):
```bash
BUILD_TARGET=native VITE_DIADEM_INSTANCE=https://demap.co pnpm build
npx cap sync android
npx cap run android
```
Expected: Gradle builds, the app installs and launches on the phone.

- [ ] **Step 3: Verify the thin client works end-to-end**

On the device, confirm:
- The app opens **directly to the map** (no Home page).
- The **basemap renders** (absolute-URL tiles from config).
- **Map object icons appear** when panning over a populated area — confirms `/assets/*` image requests are reaching `demap.co` through the native fetch wrapper.
- Pan/zoom triggers data loads — confirms `/api/*` POSTs reach the instance.

If icons or data fail to load, inspect the webview: run `chrome://inspect` on the host, open the device's webview, and check the Network/Console for the rewritten `https://demap.co/...` requests and any `CapacitorHttp` errors.

- [ ] **Step 4: Verify the web app is still healthy**

Open `https://c1.husky-alioth.ts.net/` (the live dev server) and confirm the web app still loads the map and data normally — proving the native changes did not affect the web build.

- [ ] **Step 5: Final commit (only if any tweaks were needed)**

```bash
git add -A
git commit -m "chore(native): foundation verified on Android against demap.co"
```

---

## Plan 1 self-review

- **Spec coverage (Plan 1 portion):** thin-client architecture ✔ (Tasks 4–7), two build modes ✔ (Task 8), API base layer / CapacitorHttp ✔ (Tasks 3–6), Capacitor scaffold + Nix ✔ (Tasks 1, 9), strip Home ✔ (Task 7), build-time hardcode ✔ (Task 3 env + Task 10). Deferred to later plans (correctly out of scope here): instance-gate UI, native geo/clipboard/share, auth + deep links + Diadem server changes, iOS, native MapLibre.
- **Type consistency:** `isNative()`, `getInstanceUrl()`, `normalizeInstanceUrl()` (runtime.ts) and `rewriteInstanceUrl()` (rewriteUrl.ts) and `installNativeFetch()` (nativeFetch.ts) are used with consistent signatures across Tasks 3–7.
- **No placeholders:** every code/config step contains full content.

## After Plan 1

Subsequent plans (each its own working/testable increment):
- **Plan 2 — Native UX:** native geolocation/clipboard/share behind `device.ts`/`geolocate.svelte.ts`; Android back-button handling.
- **Plan 3 — Instance gate:** first-run URL screen + Preferences persistence + settings switch; hardcode path already in place.
- **Plan 4 — Auth + deep links:** Diadem server token-handoff endpoint, system-browser OAuth, `diadem://` deep links into the SPA router, bearer header in `nativeFetch`.
