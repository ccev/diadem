import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/db/internal", () => ({ db: {} }));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => ({}) }));

import { getSessionsToClose, resolveSessionLimit } from "@/lib/server/auth/sessionLimits";
import type { DiscordGuildData } from "@/lib/server/auth/discordDetails";
import type { AuthSessions } from "@/lib/services/config/configTypes";

const config: AuthSessions = {
	maxPerUser: 2,
	users: [
		{ userIds: ["vip"], maxPerUser: 0 },
		{ userIds: ["restricted", "other"], maxPerUser: 1 }
	],
	roles: [
		{ guildId: "guild", roleId: "supporter", maxPerUser: 5 },
		{ guildId: "guild", roleId: "booster", maxPerUser: 4 }
	],
	guilds: [{ guildId: "guild", maxPerUser: 3 }]
};

const member = (roles: string[]) => async (): Promise<DiscordGuildData> => ({
	user: { id: "x" },
	roles
});
const notMember = async (): Promise<DiscordGuildData> => ({ roles: [] });

describe("resolveSessionLimit", () => {
	it("uses the default for users no limit applies to", async () => {
		expect(await resolveSessionLimit(config, "someone", notMember)).toBe(2);
		expect(await resolveSessionLimit({}, "someone", notMember)).toBe(0);
	});

	it("applies guild, then role limits", async () => {
		expect(await resolveSessionLimit(config, "someone", member([]))).toBe(3);
		expect(await resolveSessionLimit(config, "someone", member(["booster"]))).toBe(4);
		expect(await resolveSessionLimit(config, "someone", member(["supporter", "booster"]))).toBe(5);
	});

	it("lets a role limit be lower than the guild limit", async () => {
		const strict = { ...config, roles: [{ guildId: "guild", roleId: "trial", maxPerUser: 1 }] };
		expect(await resolveSessionLimit(strict, "someone", member(["trial"]))).toBe(1);
	});

	it("applies user limits regardless of roles and guilds, without asking Discord", async () => {
		const getGuild = vi.fn(member(["supporter"]));
		expect(await resolveSessionLimit(config, "restricted", getGuild)).toBe(1);
		expect(await resolveSessionLimit(config, "vip", getGuild)).toBe(0);
		expect(getGuild).not.toHaveBeenCalled();
	});

	it("works without a default limit", async () => {
		const usersOnly = { users: [{ userIds: ["restricted"], maxPerUser: 1 }] };
		expect(await resolveSessionLimit(usersOnly, "restricted", notMember)).toBe(1);
		expect(await resolveSessionLimit(usersOnly, "someone", notMember)).toBe(0);
	});

	it("treats a failed guild lookup as not being a member", async () => {
		expect(await resolveSessionLimit(config, "someone", async () => undefined)).toBe(2);
	});
});

describe("getSessionsToClose", () => {
	it("keeps the current session and the newest others up to the limit", () => {
		expect(getSessionsToClose(["new", "b", "c", "old"], "new", 2)).toEqual(["c", "old"]);
		expect(getSessionsToClose(["b", "new", "c"], "new", 1)).toEqual(["b", "c"]);
		expect(getSessionsToClose(["new", "b"], "new", 2)).toEqual([]);
		expect(getSessionsToClose(["new", "b"], "new", 0)).toEqual([]);
	});
});
