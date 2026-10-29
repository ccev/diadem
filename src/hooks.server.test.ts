import type { Handle, RequestEvent } from "@sveltejs/kit";
import { Features } from "@/lib/utils/features";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updatePermissions: vi.fn() }));
// Exercise the auth hook without SvelteKit's live request/tracing context.
vi.mock("@sveltejs/kit/hooks", () => ({ sequence: (_paraglide: Handle, auth: Handle) => auth }));
vi.mock("@/lib/server/auth/auth", () => ({
	getUserByDiscordId: async () => ({ id: "user", discordId: "123" })
}));
vi.mock("@/lib/server/auth/betterAuth", () => ({
	AUTH_BASE_PATH: "/api/auth",
	auth: null,
	isAuthEnabled: () => true,
	getAuthSession: async () => ({ session: { id: "session" }, user: { discordId: "123" } }),
	getDiscordAccessToken: async () => "token"
}));
vi.mock("@/lib/server/auth/permissions", () => ({
	getEveryonePerms: async () => ({ everywhere: [], areas: [] }),
	updatePermissions: mocks.updatePermissions
}));
vi.mock("@/lib/server/logging", () => ({ getServerLogger: () => ({ warning: vi.fn() }) }));
vi.mock("@/lib/services/config/config.server", () => ({
	getClientConfig: () => ({ general: {} })
}));
vi.mock("@/lib/services/config/config", () => ({ setConfig: vi.fn() }));
vi.mock("@/lib/paraglide/runtime", () => ({ locales: ["en"], serverAsyncLocalStorage: undefined }));
vi.mock("@/lib/paraglide/server", () => ({
	paraglideMiddleware: (
		request: Request,
		next: (input: { request: Request; locale: string }) => unknown
	) => next({ request, locale: "en" })
}));

beforeEach(() => {
	vi.resetModules();
	mocks.updatePermissions.mockReset();
});

it("returns a retryable 503 without caching a permission denial, then recovers", async () => {
	const { DiscordGuildLookupError } = await import("./lib/server/auth/discordDetails");
	const { handle } = await import("./hooks.server");
	const granted = { everywhere: [Features.POKEMON], areas: [] };
	mocks.updatePermissions
		.mockRejectedValueOnce(
			new DiscordGuildLookupError("Discord guild lookup failed (HTTP 429)", 17)
		)
		.mockResolvedValue(granted);
	const request = new Request("http://localhost/api/user/permissions");
	const event = {
		request,
		url: new URL(request.url),
		locals: {},
		fetch: vi.fn(),
		setHeaders: vi.fn()
	} as unknown as RequestEvent;
	const resolve = vi.fn(async () => new Response("OK"));

	await expect(handle({ event, resolve })).rejects.toMatchObject({ status: 503 });
	expect(event.setHeaders).toHaveBeenCalledExactlyOnceWith({ "Retry-After": "17" });
	expect(resolve).not.toHaveBeenCalled();

	await handle({ event, resolve });
	expect(event.locals.perms).toEqual(granted);
	expect(mocks.updatePermissions).toHaveBeenCalledTimes(2);
	await handle({ event, resolve });
	expect(mocks.updatePermissions).toHaveBeenCalledTimes(2);
});
