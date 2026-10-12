import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permissions } from "@/lib/services/config/configTypes";
import type { User } from "@/lib/server/db/internal/schema";
import { Features } from "@/lib/utils/features";

const mocks = vi.hoisted(() => ({
	rules: [] as Permissions[],
	discord: vi.fn(),
	telegram: vi.fn()
}));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ auth: {}, permissions: mocks.rules })
}));
vi.mock("./discordDetails", () => ({ getGuildMemberInfo: mocks.discord }));
vi.mock("./telegramMembership", () => ({ createTelegramMembershipLookup: () => mocks.telegram }));
vi.mock("@/lib/server/api/kojiApi", () => ({
	fetchKojiGeofences: async () => [
		{
			properties: { name: "Area" },
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[0, 0]
					]
				]
			}
		}
	]
}));

beforeEach(() => {
	vi.resetModules();
	mocks.discord.mockReset();
	mocks.telegram.mockReset();
	mocks.rules = [
		{ everyone: true, features: [Features.POKEMON] },
		{ loggedIn: true, features: [Features.GYM] },
		{
			guildId: "guild",
			roleId: "role",
			telegramChatId: "-100",
			features: [Features.RAID],
			areas: ["Area"]
		}
	];
});

describe("shared permission mapper", () => {
	it.each([
		[true, false],
		[false, true],
		[true, true],
		[false, false]
	])("Discord %s OR Telegram %s", async (discord, telegram) => {
		mocks.discord.mockResolvedValue(
			discord ? { user: { id: "d" }, roles: ["role"] } : { roles: [] }
		);
		mocks.telegram.mockResolvedValue(telegram);
		const { updatePermissions, getEveryonePerms } = await import("./permissions");
		expect((await getEveryonePerms(fetch)).everywhere).toEqual(["pokemon"]);
		const perms = await updatePermissions({ id: "u" } as User, "discord-token", fetch, "123");
		expect(perms.everywhere).toEqual(["pokemon", "gym"]);
		expect(perms.areas.length).toBe(discord || telegram ? 1 : 0);
		if (perms.areas.length) expect(perms.areas[0].features).toEqual(["raid"]);
	});
	it("Discord exception cannot cancel a Telegram grant", async () => {
		mocks.discord.mockRejectedValue(new Error("outage"));
		mocks.telegram.mockResolvedValue(true);
		const { updatePermissions } = await import("./permissions");
		expect(
			(await updatePermissions({ id: "u" } as User, "token", fetch, "123")).areas
		).toHaveLength(1);
	});
	it("missing Discord token cannot skip the Telegram branch", async () => {
		mocks.telegram.mockResolvedValue(true);
		const { updatePermissions } = await import("./permissions");
		expect((await updatePermissions({ id: "u" } as User, "", fetch, "123")).areas).toHaveLength(1);
		expect(mocks.discord).not.toHaveBeenCalled();
	});
	it("Telegram failure grants no Telegram-only access but preserves Discord grants", async () => {
		mocks.rules.push({ telegramChatId: "-100", features: [Features.SCOUT] });
		mocks.discord.mockResolvedValue({ user: { id: "d" }, roles: ["role"] });
		mocks.telegram.mockResolvedValue(false);
		const { updatePermissions } = await import("./permissions");
		const perms = await updatePermissions({ id: "u" } as User, "token", fetch, "123");
		expect(perms.areas).toHaveLength(1);
		expect(perms.everywhere).not.toContain("scout");
	});
});
