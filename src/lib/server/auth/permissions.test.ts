import type { User } from "@/lib/server/db/internal/schema";
import { Features } from "@/lib/utils/features";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({
		permissions: [
			{ everyone: true, features: [Features.POKEMON] },
			{ loggedIn: true, features: [Features.GYM] },
			{ guildId: "123", features: [Features.POKESTOP] },
			{ guildId: "123", roleId: "456", features: [Features.POKEMON_IV] }
		]
	})
}));
vi.mock("@/lib/server/api/kojiApi", () => ({ fetchKojiGeofences: async () => [] }));

const fetchMock = vi.fn<typeof fetch>();
const user = { id: "user" } as User;

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.stubEnv("DIADEM_CLUSTER_DISCORD", undefined);
	vi.stubGlobal("fetch", fetchMock);
	vi.spyOn(performance, "now").mockReturnValue(0);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("Discord permission refresh failures", () => {
	it("does not cache reduced permissions when the access token is unavailable", async () => {
		const { updatePermissions } = await import("./permissions");
		const { DiscordGuildLookupError } = await import("./discordDetails");
		await expect(updatePermissions(user, "", fetchMock)).rejects.toBeInstanceOf(
			DiscordGuildLookupError
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects a rate-limited refresh and recovers without waiting for the permission cache TTL", async () => {
		const { updatePermissions } = await import("./permissions");
		const { DiscordGuildLookupError } = await import("./discordDetails");
		fetchMock.mockResolvedValueOnce(Response.json({ retry_after: 2 }, { status: 429 }));
		await expect(updatePermissions(user, "token", fetchMock)).rejects.toBeInstanceOf(
			DiscordGuildLookupError
		);
		vi.mocked(performance.now).mockReturnValue(2000);
		fetchMock.mockResolvedValueOnce(Response.json({ user: { id: "user" }, roles: ["456"] }));
		expect(await updatePermissions(user, "token", fetchMock)).toEqual({
			everywhere: [Features.POKEMON, Features.GYM, Features.POKESTOP, Features.POKEMON_IV],
			areas: []
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("removes guild and role permissions after a confirmed non-membership response", async () => {
		const { updatePermissions } = await import("./permissions");
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
		expect(await updatePermissions(user, "token", fetchMock)).toEqual({
			everywhere: [Features.POKEMON, Features.GYM],
			areas: []
		});
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("keeps confirmed membership separate from an unknown membership status", async () => {
		const { isGuildMember, DiscordGuildLookupError } = await import("./discordDetails");
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
		await expect(isGuildMember("123", "token")).rejects.toBeInstanceOf(DiscordGuildLookupError);
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
		await expect(isGuildMember("123", "another-token")).resolves.toBe(false);
	});
});
