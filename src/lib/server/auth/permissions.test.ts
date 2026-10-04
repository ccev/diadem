import { Features } from "@/lib/utils/features";
import { beforeEach, expect, it, vi } from "vitest";
import type { Permissions } from "@/lib/services/config/configTypes";
import type { User } from "@/lib/server/db/internal/schema";
const mocks = vi.hoisted(() => ({ rules: [] as Permissions[], guild: vi.fn() }));
vi.mock("@/lib/services/config/config.server", () => ({
	getServerConfig: () => ({ permissions: mocks.rules })
}));
vi.mock("@/lib/server/auth/discordDetails", () => ({ getGuildMemberInfo: mocks.guild }));
vi.mock("@/lib/server/api/kojiApi", () => ({
	fetchKojiGeofences: async () =>
		["North", "South"].map((name) => ({
			properties: { name },
			geometry: { type: "Polygon", coordinates: [] }
		}))
}));
vi.mock("@/lib/utils/logger", () => ({ getLogger: () => ({ warning: vi.fn(), error: vi.fn() }) }));
import { updatePermissions } from "./permissions";
const user = { id: "test-user" } as User;
beforeEach(() => {
	mocks.guild.mockReset();
	mocks.rules = [
		{
			guildId: "north-server",
			roleId: "north-role",
			areas: ["North"],
			features: [Features.POKEMON_ALL]
		},
		{
			guildId: "south-server",
			roleId: "south-role",
			areas: ["South"],
			features: [Features.POKEMON_ALL]
		},
		{ guildId: "north-server", roleId: "global-role", features: [Features.ALL] }
	];
});
it("adds areas across guilds and looks up each guild only once", async () => {
	mocks.guild.mockImplementation(async (guild: string) => ({
		user: { id: user.id },
		roles: guild === "north-server" ? ["north-role"] : ["south-role"]
	}));
	const perms = await updatePermissions(user, "token", fetch);
	expect(perms.areas.map((area) => area.name)).toEqual(["North", "South"]);
	expect(perms.everywhere).toEqual([]);
	expect(mocks.guild).toHaveBeenCalledTimes(2);
});
it("does not grant the other region to a member of only one server", async () => {
	mocks.guild.mockImplementation(async (guild: string) => ({
		roles: guild === "north-server" ? ["north-role"] : []
	}));
	const perms = await updatePermissions(user, "token", fetch);
	expect(perms.areas.map((area) => area.name)).toEqual(["North"]);
});
it("preserves valid grants when another guild lookup fails", async () => {
	mocks.guild.mockImplementation(async (guild: string) => {
		if (guild === "south-server") throw new Error("Network failure");
		return { roles: ["north-role"] };
	});
	expect((await updatePermissions(user, "token", fetch)).areas.map((area) => area.name)).toEqual([
		"North"
	]);
});
it("supports a role granting all areas", async () => {
	mocks.guild.mockResolvedValue({ roles: ["global-role"] });
	expect((await updatePermissions(user, "token", fetch)).everywhere).toEqual(["*"]);
});
it("fails closed without a Discord token", async () => {
	expect(await updatePermissions(user, "", fetch)).toEqual({ areas: [], everywhere: [] });
	expect(mocks.guild).not.toHaveBeenCalled();
});
