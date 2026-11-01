import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	instance: "https://map.example",
	platform: "android",
	preferences: new Map<string, string>(),
	open: vi.fn(),
	close: vi.fn(),
	clearCookies: vi.fn(),
	toast: vi.fn()
}));
vi.mock("@/lib/native/runtime", () => ({
	getInstanceUrl: () => mocks.instance,
	isNative: () => true
}));
vi.mock("@capacitor/core", () => ({
	Capacitor: { getPlatform: () => mocks.platform },
	CapacitorCookies: { clearCookies: mocks.clearCookies }
}));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ id: "ee.malt.diadem" }) } }));
vi.mock("@capacitor/browser", () => ({ Browser: { open: mocks.open, close: mocks.close } }));
vi.mock("@capacitor/preferences", () => ({
	Preferences: {
		get: async ({ key }: { key: string }) => ({ value: mocks.preferences.get(key) ?? null }),
		set: async ({ key, value }: { key: string; value: string }) =>
			mocks.preferences.set(key, value),
		remove: async ({ key }: { key: string }) => mocks.preferences.delete(key)
	}
}));
vi.mock("@/lib/ui/toasts.svelte", () => ({ openToast: mocks.toast }));
vi.mock("@/lib/paraglide/messages", () => ({ m: { signin_toast_error: () => "Sign-in failed" } }));

beforeEach(() => {
	vi.resetModules();
	mocks.instance = "https://map.example";
	mocks.platform = "android";
	mocks.preferences.clear();
	mocks.open.mockReset().mockResolvedValue(undefined);
	mocks.close.mockReset().mockResolvedValue(undefined);
	mocks.clearCookies.mockReset().mockResolvedValue(undefined);
	mocks.toast.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("native authentication", () => {
	it("keeps the verifier on-device and sends only its challenge with the Android package", async () => {
		const auth = await import("./auth");
		await auth.startNativeLogin("discord", "/a?lat=1");
		const attempt = JSON.parse(mocks.preferences.get("diadem_pkce_verifier")!);
		const url = new URL(mocks.open.mock.calls[0][0].url);
		expect(url.pathname).toBe("/login/discord");
		expect(url.searchParams.get("challenge")).toBe(
			createHash("sha256").update(attempt.verifier).digest("base64url")
		);
		expect(url.searchParams.get("verifier")).toBeNull();
		expect(url.searchParams.get("app")).toBe("ee.malt.diadem");
		expect(url.searchParams.get("redir")).toBe("/a?lat=1");
	});

	it("uses the portable custom scheme rather than an Android intent on iOS", async () => {
		mocks.platform = "ios";
		const auth = await import("./auth");
		await auth.startNativeLogin();
		expect(new URL(mocks.open.mock.calls[0][0].url).searchParams.has("app")).toBe(false);
	});

	it("restores the verifier after a cold start and persists an instance-bound session", async () => {
		await (await import("./auth")).startNativeLogin();
		const attempt = JSON.parse(mocks.preferences.get("diadem_pkce_verifier")!);
		vi.resetModules();
		const auth = await import("./auth");
		const request = vi.fn().mockResolvedValue(Response.json({ token: "session-token" }));
		vi.stubGlobal("fetch", request);
		expect(await auth.completeNativeLogin("one-time-code")).toBe(true);
		expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
			code: "one-time-code",
			verifier: attempt.verifier
		});
		expect(auth.getBearerToken()).toBe("session-token");
		expect(JSON.parse(mocks.preferences.get("diadem_bearer_token")!)).toEqual({
			instance: mocks.instance,
			token: "session-token"
		});
		expect(mocks.preferences.has("diadem_pkce_verifier")).toBe(false);
		mocks.instance = "https://other.example";
		expect(auth.getBearerToken()).toBeNull();
	});

	it("does not exchange a pending login against a different instance", async () => {
		const auth = await import("./auth");
		await auth.startNativeLogin();
		mocks.instance = "https://other.example";
		const request = vi.fn();
		vi.stubGlobal("fetch", request);
		expect(await auth.completeNativeLogin("code")).toBe(false);
		expect(request).not.toHaveBeenCalled();
	});

	it("keeps the verifier after a network failure so the handoff can be retried", async () => {
		const auth = await import("./auth");
		await auth.startNativeLogin();
		const request = vi
			.fn()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce(Response.json({ token: "session-token" }));
		vi.stubGlobal("fetch", request);
		expect(await auth.completeNativeLogin("code")).toBe(false);
		expect(mocks.preferences.has("diadem_pkce_verifier")).toBe(true);
		expect(await auth.completeNativeLogin("code")).toBe(true);
	});

	it("coalesces simultaneous launch and appUrlOpen callbacks", async () => {
		const auth = await import("./auth");
		await auth.startNativeLogin();
		const request = vi.fn().mockResolvedValue(Response.json({ token: "session-token" }));
		vi.stubGlobal("fetch", request);
		expect(
			await Promise.all([auth.completeNativeLogin("code"), auth.completeNativeLogin("code")])
		).toEqual([true, true]);
		expect(request).toHaveBeenCalledOnce();
	});

	it("does not restore a session if the user cancels while the exchange is in flight", async () => {
		const auth = await import("./auth");
		await auth.startNativeLogin();
		let finishRequest: (response: Response) => void;
		const request = vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					finishRequest = resolve;
				})
		);
		vi.stubGlobal("fetch", request);
		const exchanging = auth.completeNativeLogin("code");
		await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
		await auth.clearStoredToken();
		finishRequest!(Response.json({ token: "cancelled-session" }));
		expect(await exchanging).toBe(false);
		expect(auth.getBearerToken()).toBeNull();
	});

	it("migrates the legacy raw token without logging an existing user out", async () => {
		mocks.preferences.set("diadem_bearer_token", "legacy-session-token");
		const auth = await import("./auth");
		await auth.loadStoredToken();
		expect(auth.getBearerToken()).toBe("legacy-session-token");
		expect(JSON.parse(mocks.preferences.get("diadem_bearer_token")!).instance).toBe(mocks.instance);
	});

	it("does not restore a token stored for another instance", async () => {
		mocks.preferences.set(
			"diadem_bearer_token",
			JSON.stringify({ instance: "https://other.example", token: "other-token" })
		);
		const auth = await import("./auth");
		await auth.loadStoredToken();
		expect(auth.getBearerToken()).toBeNull();
	});

	it("reports browser launch failures and clears the unfinished login", async () => {
		mocks.open.mockRejectedValueOnce(new Error("No browser available"));
		const auth = await import("./auth");
		await auth.startNativeLogin();
		expect(mocks.toast).toHaveBeenCalledWith("Sign-in failed", 10000);
		expect(mocks.preferences.has("diadem_pkce_verifier")).toBe(false);
	});

	it("signs out with a trusted Origin so native session cookies can be revoked", async () => {
		vi.stubGlobal("window", { location: { href: "https://localhost/" } });
		mocks.preferences.set("diadem_bearer_token", "legacy-session-token");
		const auth = await import("./auth");
		await auth.loadStoredToken();
		const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", request);
		await auth.nativeLogout();
		expect(request).toHaveBeenCalledWith(`${mocks.instance}/api/auth/sign-out`, {
			method: "POST",
			headers: { Origin: "https://localhost", Authorization: "Bearer legacy-session-token" }
		});
		expect(auth.getBearerToken()).toBeNull();
	});

	it("revokes a native cookie-only session even when no local bearer remains", async () => {
		vi.stubGlobal("window", { location: { href: "https://localhost/" } });
		const auth = await import("./auth");
		const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", request);
		await auth.nativeLogout();
		expect(request).toHaveBeenCalledWith(`${mocks.instance}/api/auth/sign-out`, {
			method: "POST",
			headers: { Origin: "https://localhost" }
		});
	});

	it("uses the trusted iOS custom-scheme Origin when signing out", async () => {
		mocks.platform = "ios";
		vi.stubGlobal("window", {
			location: { href: "capacitor://localhost/a", origin: "null" }
		});
		const auth = await import("./auth");
		const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", request);
		await auth.nativeLogout();
		expect(request).toHaveBeenCalledWith(`${mocks.instance}/api/auth/sign-out`, {
			method: "POST",
			headers: { Origin: "capacitor://localhost" }
		});
		expect(mocks.clearCookies).toHaveBeenCalledWith({ url: mocks.instance });
	});

	it("clears iOS session cookies for the selected instance when sign-out is offline", async () => {
		mocks.platform = "ios";
		mocks.preferences.set(
			"diadem_bearer_token",
			JSON.stringify({ instance: mocks.instance, token: "session-token" })
		);
		vi.stubGlobal("window", { location: { href: "capacitor://localhost/" } });
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		const auth = await import("./auth");
		await auth.loadStoredToken();
		expect(auth.getBearerToken()).toBe("session-token");
		await auth.nativeLogout();
		expect(auth.getBearerToken()).toBeNull();
		expect(mocks.preferences.has("diadem_bearer_token")).toBe(false);
		expect(mocks.clearCookies).toHaveBeenCalledOnce();
		expect(mocks.clearCookies).toHaveBeenCalledWith({ url: mocks.instance });
	});
});
