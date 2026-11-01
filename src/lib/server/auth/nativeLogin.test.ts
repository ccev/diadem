import { beforeEach, describe, expect, it, vi } from "vitest";
import { storeNativeLoginAttempt } from "./nativeLogin";

const mocks = vi.hoisted(() => ({ issue: vi.fn() }));
vi.mock("@/lib/server/auth/nativeHandoff", () => ({ issueNativeCode: mocks.issue }));
vi.mock("@/lib/server/auth/betterAuth", () => ({ isAuthEnabled: () => true }));
vi.mock("@/lib/server/auth/auth", () => ({
	sanitizeRedirectPath: (value: string | null, fallback: string) => value ?? fallback
}));
import { load, ssr, prerender } from "@/routes/(auth)/login/discord/native/+page.server";

type CallbackEvent = Parameters<typeof load>[0];

const challenge = "x".repeat(43);
const appId = "ee.malt.diadem";

function createEvent(params: Record<string, string> = {}) {
	const cookies = new Map<string, string>();
	const query = new URLSearchParams({ challenge, app: appId, redir: "/a?lat=1", ...params });
	const event = {
		url: new URL(`https://map.example/login/discord/native?${query}`),
		setHeaders: vi.fn(),
		locals: { user: { id: "user" }, session: { token: "private-session-token" } },
		cookies: {
			get: (key: string) => cookies.get(key),
			set: vi.fn((key: string, value: string) => cookies.set(key, value)),
			delete: (key: string) => cookies.delete(key)
		}
	} as unknown as CallbackEvent;
	return { event, cookies };
}

beforeEach(() => mocks.issue.mockReset().mockResolvedValue("one-time-code"));

describe("native OAuth callback", () => {
	it("returns server-rendered page data with a one-time code, never the session token", async () => {
		const { event, cookies } = createEvent();
		storeNativeLoginAttempt(event, { challenge, appId, redir: "/a?lat=1" });
		const data = await load(event);
		expect(mocks.issue).toHaveBeenCalledWith("private-session-token", challenge);
		expect(data).toEqual({
			success: true,
			returnUrl:
				"intent://auth?code=one-time-code&redir=%2Fa%3Flat%3D1#Intent;scheme=diadem;package=ee.malt.diadem;end"
		});
		expect(JSON.stringify(data)).not.toContain("private-session-token");
		expect(ssr).toBe(true);
		expect(prerender).toBe(false);
		expect(event.setHeaders).toHaveBeenCalledWith(
			expect.objectContaining({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" })
		);
		expect(cookies.size).toBe(0);
		expect(event.cookies.set).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			expect.objectContaining({
				httpOnly: true,
				secure: true,
				sameSite: "lax",
				path: "/login/discord"
			})
		);
	});

	it("does not hand off a logged-in session without a matching OAuth attempt", async () => {
		const { event } = createEvent();
		const data = await load(event);
		expect(mocks.issue).not.toHaveBeenCalled();
		expect(data).toEqual({
			success: false,
			returnUrl: "intent://auth?error=1#Intent;scheme=diadem;package=ee.malt.diadem;end"
		});
	});

	it("rejects callback parameters altered after login started", async () => {
		const { event, cookies } = createEvent({ app: "other.app" });
		storeNativeLoginAttempt(event, { challenge, appId, redir: "/a?lat=1" });
		await load(event);
		expect(mocks.issue).not.toHaveBeenCalled();
		expect(cookies.size).toBe(1);
	});

	it("reports OAuth cancellation even if an old session is still signed in", async () => {
		const { event } = createEvent({ error: "access_denied" });
		storeNativeLoginAttempt(event, { challenge, appId, redir: "/a?lat=1" });
		expect(await load(event)).toEqual(expect.objectContaining({ success: false }));
		expect(mocks.issue).not.toHaveBeenCalled();
	});

	it("returns through the custom scheme when no Android package was requested", async () => {
		const { event } = createEvent();
		event.url.searchParams.delete("app");
		storeNativeLoginAttempt(event, { challenge, appId: null, redir: "/a?lat=1" });
		expect(await load(event)).toEqual({
			success: true,
			returnUrl: "diadem://auth?code=one-time-code&redir=%2Fa%3Flat%3D1"
		});
	});
});
