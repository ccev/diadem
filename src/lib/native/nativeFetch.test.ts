import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { installNativeFetch, rewriteInstanceUrl } from "@/lib/native/nativeFetch";

const state = vi.hoisted(() => ({
	request: vi.fn(),
	instance: "https://demap.co",
	token: "session-token"
}));
vi.mock("@capacitor/core", () => ({
	Capacitor: { getPlatform: () => "android" },
	CapacitorHttp: { request: state.request }
}));
vi.mock("@/lib/native/runtime", () => ({
	isNative: () => true,
	getInstanceUrl: () => state.instance
}));
vi.mock("@/lib/native/auth", () => ({ getBearerToken: () => state.token }));

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
	// SvelteKit's load fetch passes same-origin requests as relative paths
	// (it strips the origin in resolve_fetch_url), so the rewriter must resolve
	// them against localOrigin instead of throwing on `new URL(relative)`.
	it("rewrites a RELATIVE /api path (the form SvelteKit load fetch passes)", () => {
		expect(rewriteInstanceUrl("/api/config", INSTANCE, LOCAL)).toBe("https://demap.co/api/config");
	});
	it("rewrites a relative /assets path", () => {
		expect(rewriteInstanceUrl("/assets/pokemon/1.png", INSTANCE, LOCAL)).toBe(
			"https://demap.co/assets/pokemon/1.png"
		);
	});
	it("does NOT rewrite an unrelated relative path", () => {
		expect(rewriteInstanceUrl("/map", INSTANCE, LOCAL)).toBeNull();
	});
	// UICONS image URLs are built absolute (instance base) on native; they must
	// still be routed through CapacitorHttp (returned unchanged), not left to a
	// cross-origin webview fetch that would taint the WebGL texture.
	it("routes an already-absolute instance URL through unchanged", () => {
		expect(
			rewriteInstanceUrl("https://demap.co/assets/DEFAULT/pokemon/1.png", INSTANCE, LOCAL)
		).toBe("https://demap.co/assets/DEFAULT/pokemon/1.png");
	});
	it("still ignores absolute external URLs even when an instance is set", () => {
		expect(rewriteInstanceUrl("https://tiles.example.com/1.pbf", INSTANCE, LOCAL)).toBeNull();
	});
});

describe("installNativeFetch", () => {
	const originalFetch = vi.fn();
	const nativeResponse = {
		status: 200,
		headers: { "Content-Type": "application/json" },
		data: { success: true },
		url: `${INSTANCE}/api/config`
	};

	beforeEach(() => {
		state.request.mockReset().mockResolvedValue(nativeResponse);
		originalFetch.mockReset().mockResolvedValue(new Response("local"));
		state.instance = INSTANCE;
		state.token = "session-token";
		vi.stubGlobal("window", { location: { origin: LOCAL }, fetch: originalFetch });
		installNativeFetch();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("rewrites instance calls and forwards auth, body content type, and native timeouts", async () => {
		const body = JSON.stringify({ north: 54 });
		const response = await window.fetch("/api/pokemon", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body
		});
		expect(state.request).toHaveBeenCalledWith({
			url: `${INSTANCE}/api/pokemon`,
			method: "POST",
			headers: {
				"content-type": "application/json",
				"Accept-Encoding": "identity",
				Authorization: "Bearer session-token"
			},
			data: body,
			connectTimeout: 15_000,
			readTimeout: 15_000,
			responseType: "blob"
		});
		expect(await response.json()).toEqual({ success: true });
	});

	it("preserves Request bodies and explicit authorization", async () => {
		const request = new Request(`${LOCAL}/api/user/settings`, {
			method: "POST",
			headers: { Authorization: "Bearer explicit" },
			body: "settings"
		});
		await window.fetch(request);
		expect(state.request).toHaveBeenCalledWith(
			expect.objectContaining({
				data: "settings",
				headers: expect.objectContaining({
					authorization: "Bearer explicit",
					"content-type": "text/plain;charset=UTF-8"
				})
			})
		);
		expect(request.bodyUsed).toBe(false);
	});

	it("leaves unrelated fetches unchanged and does not send their bearer token", async () => {
		const url = "https://tiles.example.com/1.pbf";
		await window.fetch(url);
		expect(originalFetch).toHaveBeenCalledWith(url, undefined);
		expect(state.request).not.toHaveBeenCalled();
	});

	it("uses the current selected instance", async () => {
		state.instance = "https://other.example.com";
		await window.fetch("/api/config");
		expect(state.request).toHaveBeenCalledWith(
			expect.objectContaining({ url: "https://other.example.com/api/config" })
		);
	});

	it("preserves MessagePack response bytes", async () => {
		const bytes = Uint8Array.from([0x81, 0xa4, 0x74, 0x65, 0x73, 0x74, 0xc3]);
		state.request.mockResolvedValue({
			...nativeResponse,
			headers: { "content-type": "application/msgpack" },
			data: btoa(String.fromCharCode(...bytes))
		});
		const response = await window.fetch("/api/config");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
	});

	it("constructs null bodies for HEAD and HTTP no-content responses", async () => {
		expect((await window.fetch("/api/config", { method: "HEAD" })).body).toBeNull();
		for (const status of [204, 205, 304]) {
			state.request.mockResolvedValue({ ...nativeResponse, status, data: "" });
			const response = await window.fetch("/api/config");
			expect(response.status).toBe(status);
			expect(response.body).toBeNull();
		}
	});

	it("rejects already-aborted requests without contacting the native bridge", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(window.fetch("/api/config", { signal: controller.signal })).rejects.toMatchObject({
			name: "AbortError"
		});
		expect(state.request).not.toHaveBeenCalled();
	});

	it("settles an aborted request before the native network call completes", async () => {
		let finish!: (response: typeof nativeResponse) => void;
		state.request.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
		const controller = new AbortController();
		const response = window.fetch("/api/config", { signal: controller.signal });
		controller.abort();
		await expect(response).rejects.toMatchObject({ name: "AbortError" });
		finish(nativeResponse);
	});
});

it("times out a stalled native bridge request even if platform retries never finish", async () => {
	vi.useFakeTimers();
	vi.stubGlobal("window", { location: { origin: LOCAL }, fetch: vi.fn() });
	state.request.mockReturnValue(new Promise(() => {}));
	installNativeFetch();
	const result = expect(window.fetch("/api/config")).rejects.toMatchObject({
		name: "TimeoutError"
	});
	await vi.advanceTimersByTimeAsync(15_000);
	await result;
	vi.useRealTimers();
	vi.unstubAllGlobals();
});
