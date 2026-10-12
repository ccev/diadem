import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { RequestEvent } from "@sveltejs/kit";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), token: vi.fn(() => "session-secret") }));
vi.mock("./betterAuth", () => ({
	isAuthEnabled: () => true,
	isAuthRequired: () => false,
	signInWithProvider: mocks.signIn,
	getNativeAuthToken: mocks.token
}));
vi.mock("@/lib/server/db/internal", () => ({ db: {} }));
vi.mock("@/lib/utils/getMapPath", () => ({ getMapPath: () => "/map" }));
vi.mock("@/lib/services/config/config.server", () => ({
	getClientConfig: () => ({
		auth: { providers: ["discord", "telegram"] },
		general: { customHome: false }
	})
}));
vi.mock("@/lib/server/logging", () => ({ getServerLogger: () => ({ info: vi.fn() }) }));
import { GET } from "@/routes/(auth)/login/[provider]/+server";
import { load } from "@/routes/(auth)/login/[provider]/callback/+page.server";
import { consumeNativeCode } from "./nativeHandoff";
import { sanitizeRedirectPath } from "./auth";

function event(path: string, provider = "telegram") {
	const cookies = new Map<string, string>();
	return {
		url: new URL(path, "https://map.example.test"),
		params: { provider },
		locals: { user: { id: "u", name: "User" } },
		cookies: {
			get: (key: string) => cookies.get(key),
			set: (key: string, value: string) => cookies.set(key, value),
			delete: (key: string) => cookies.delete(key)
		}
	} as unknown as RequestEvent;
}
beforeEach(() => {
	vi.clearAllMocks();
	mocks.signIn.mockResolvedValue({ url: "https://oauth.example/authorize" });
});

describe("provider routes and native handoff", () => {
	it.each(["discord", "telegram"])(
		"binds %s callback to original challenge, burns flow, never returns raw token",
		async (provider) => {
			const verifier = "a".repeat(43);
			const challenge = createHash("sha256").update(verifier).digest("base64url");
			const request = event(
				`/login/${provider}?native=1&challenge=${challenge}&redir=/map`,
				provider
			);
			expect((await GET(request)).status).toBe(302);
			const callback = mocks.signIn.mock.calls[0][2].callbackURL;
			request.url = new URL(callback, request.url.origin);
			request.url.searchParams.set("challenge", "attacker-controlled");
			let location = "";
			try {
				await load(request as never);
			} catch (redirect: any) {
				location = redirect.location;
			}
			expect(location).toMatch(/^diadem:\/\/auth\?code=/);
			expect(location).not.toContain("session-secret");
			const code = new URL(location).searchParams.get("code")!;
			expect(consumeNativeCode(code, verifier)).toBe("session-secret");
			await expect(load(request as never)).rejects.toMatchObject({
				location: "diadem://auth?error=1"
			});
		}
	);
	it("rejects direct callback and error callbacks even with an existing session", async () => {
		const direct = event("/login/telegram/callback?native=1&challenge=attacker");
		await expect(load(direct as never)).rejects.toMatchObject({
			location: "diadem://auth?error=1"
		});
		const request = event(`/login/telegram?native=1&challenge=${"a".repeat(43)}`);
		await GET(request);
		request.url = new URL(mocks.signIn.mock.calls[0][2].errorCallbackURL, request.url.origin);
		await expect(load(request as never)).rejects.toMatchObject({
			location: "diadem://auth?error=1"
		});
		expect(mocks.token).not.toHaveBeenCalled();
	});
	it("returns provider denial to native via the early error route", async () => {
		const request = event(`/login/telegram?native=1&challenge=${"a".repeat(43)}`);
		await GET(request);
		request.url = new URL("https://map.example.test/login/error/callback?error=access_denied");
		request.params.provider = "error";
		await expect(load(request as never)).rejects.toMatchObject({
			location: "diadem://auth?error=1"
		});
		expect(mocks.token).not.toHaveBeenCalled();
	});
	it("rejects unsupported providers and malformed native challenges", async () => {
		expect((await GET(event("/login/unknown", "unknown"))).status).toBe(404);
		expect((await GET(event("/login/telegram?native=1&challenge=bad"))).status).toBe(400);
		expect(mocks.signIn).not.toHaveBeenCalled();
	});
	it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example"])(
		"rejects unsafe redirect %j",
		(path) => {
			expect(sanitizeRedirectPath(path, "/map")).toBe("/map");
		}
	);
});
