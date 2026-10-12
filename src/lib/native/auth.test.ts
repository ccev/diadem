import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
	values: new Map<string, string>(),
	open: vi.fn(),
	close: vi.fn()
}));
vi.mock("@/lib/native/runtime", () => ({
	getInstanceUrl: () => "https://map.example.test",
	isNative: () => true
}));
vi.mock("@capacitor/preferences", () => ({
	Preferences: {
		set: async ({ key, value }: { key: string; value: string }) => {
			mocks.values.set(key, value);
		},
		get: async ({ key }: { key: string }) => ({ value: mocks.values.get(key) ?? null }),
		remove: async ({ key }: { key: string }) => {
			mocks.values.delete(key);
		}
	}
}));
vi.mock("@capacitor/browser", () => ({ Browser: { open: mocks.open, close: mocks.close } }));
vi.mock("@capacitor/app", () => ({ App: { getInfo: async () => ({ id: "ee.malt.diadem" }) } }));
import { startNativeLogin, completeNativeLogin, getBearerToken, clearStoredToken } from "./auth";
beforeEach(async () => {
	vi.clearAllMocks();
	mocks.values.clear();
	await clearStoredToken();
});
afterEach(() => vi.unstubAllGlobals());

describe("native provider login", () => {
	it.each(["discord", "telegram"])(
		"opens %s and exchanges only with its persisted verifier",
		async (provider) => {
			await startNativeLogin(provider, "/map");
			const url = new URL(mocks.open.mock.calls[0][0].url);
			expect(url.pathname).toBe(`/login/${provider}`);
			expect(url.searchParams.get("app")).toBe("ee.malt.diadem");
			const verifier = mocks.values.get("diadem_pkce_verifier")!;
			expect(url.searchParams.get("challenge")).toBe(
				createHash("sha256").update(verifier).digest("base64url")
			);
			expect(url.toString()).not.toContain(verifier);
			const exchange = vi.fn().mockResolvedValue(Response.json({ token: "session" }));
			vi.stubGlobal("fetch", exchange);
			expect(await completeNativeLogin("one-time-code")).toBe(true);
			expect(JSON.parse(exchange.mock.calls[0][1].body)).toEqual({
				code: "one-time-code",
				verifier
			});
			expect(getBearerToken()).toBe("session");
			expect(mocks.values.has("diadem_pkce_verifier")).toBe(false);
			expect(await completeNativeLogin("one-time-code")).toBe(false);
		}
	);
	it("does not persist a token on rejected or failed exchanges", async () => {
		await startNativeLogin("telegram");
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));
		expect(await completeNativeLogin("bad-code")).toBe(false);
		expect(getBearerToken()).toBeNull();
		expect(mocks.close).toHaveBeenCalled();
	});
});
