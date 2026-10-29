import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/db/internal", () => ({ db: {} }));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => ({}) }));
vi.mock("@/lib/server/api/kojiApi", () => ({ fetchKojiGeofences: async () => undefined }));
const guildMember = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/auth/discordDetails", () => ({ getGuildMemberInfo: guildMember }));

import { getSessionsToClose, resolveSessionLimit } from "@/lib/server/auth/sessionLimits";
import { makeRuleMatcher } from "@/lib/server/auth/permissions";
import type { RuleRequirements } from "@/lib/services/config/configTypes";

const applies = (matching: RuleRequirements[]) => async (rule: RuleRequirements) =>
	matching.includes(rule);

describe("resolveSessionLimit", () => {
	const members = { guildId: "guild", maxPerUser: 3 };
	const supporters = { guildId: "guild", roleId: "supporter", maxPerUser: 5 };
	const admins = { userIds: ["admin"], maxPerUser: 0 };

	it("is unlimited without a default limit", async () => {
		expect(await resolveSessionLimit(undefined, [members], applies([members]))).toBe(0);
		expect(await resolveSessionLimit(0, [members], applies([members]))).toBe(0);
	});

	it("uses the highest limit of every matching rule", async () => {
		const rules = [supporters, members];
		expect(await resolveSessionLimit(2, rules, applies([]))).toBe(2);
		expect(await resolveSessionLimit(2, rules, applies([members]))).toBe(3);
		expect(await resolveSessionLimit(2, rules, applies([members, supporters]))).toBe(5);
		expect(await resolveSessionLimit(2, [...rules, admins], applies([members, admins]))).toBe(0);
	});

	it("doesn't check rules that can't raise the limit", async () => {
		const ruleApplies = vi.fn(applies([members, supporters]));
		expect(await resolveSessionLimit(4, [members, supporters], ruleApplies)).toBe(5);
		expect(ruleApplies).toHaveBeenCalledTimes(1);
		expect(ruleApplies).toHaveBeenCalledWith(supporters);
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

describe("rule requirements", () => {
	const user = { id: "u1", discordId: "123" };

	it("matches userIds alone or combined with guild requirements", async () => {
		guildMember.mockResolvedValue({ user: { id: "123" }, roles: ["supporter"] });
		const ruleApplies = makeRuleMatcher(user, "token");
		expect(await ruleApplies({ userIds: ["123", "456"] })).toBe(true);
		expect(await ruleApplies({ userIds: ["456"] })).toBe(false);
		expect(await ruleApplies({ userIds: ["456"], loggedIn: true })).toBe(false);
		expect(await ruleApplies({ userIds: ["123"], guildId: "g", roleId: "supporter" })).toBe(true);
		expect(await ruleApplies({ userIds: ["123"], guildId: "g", roleId: "admin" })).toBe(false);
	});

	it("keeps existing guild, role and loggedIn behaviour", async () => {
		guildMember.mockResolvedValue({ user: { id: "123" }, roles: ["supporter"] });
		const ruleApplies = makeRuleMatcher(user, "token");
		expect(await ruleApplies({ loggedIn: true })).toBe(true);
		expect(await ruleApplies({ guildId: "g" })).toBe(true);
		expect(await ruleApplies({ guildId: "g", roleId: "supporter" })).toBe(true);
		expect(await ruleApplies({ guildId: "g", roleId: "admin" })).toBe(false);
		expect(await ruleApplies({ roleId: "supporter" })).toBe(false);
		expect(await makeRuleMatcher(user, "")({ guildId: "g" })).toBe(false);
	});
});
