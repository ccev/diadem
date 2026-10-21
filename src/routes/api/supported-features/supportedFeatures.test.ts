import type { ServerConfig } from "@/lib/services/config/configTypes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./+server";

const config = vi.hoisted(() => ({ biomes: undefined as ServerConfig["biomes"] }));

vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => config }));
vi.mock("@/lib/server/auth/betterAuth", () => ({
	isAuthEnabled: () => false,
	isAuthRequired: () => false
}));
vi.mock("@/lib/server/api/respond", () => ({
	respond: (_request: Request, data: unknown) => Response.json(data)
}));

beforeEach(() => {
	config.biomes = undefined;
});

describe("supported biomes feature", () => {
	it.each([undefined, {}, { secret: "test-secret" }, { url: "" }, { url: " \t " }])(
		"is unavailable without an endpoint (%j)",
		async (biomes) => {
			config.biomes = biomes;
			const response = await GET({
				locals: { user: null },
				request: new Request("https://diadem.test/api/supported-features")
			} as Parameters<typeof GET>[0]);
			expect(await response.json()).toMatchObject({ biomes: false });
		}
	);

	it("advertises availability without disclosing the private URL or token", async () => {
		config.biomes = { url: "https://biomes.example.com", secret: "test-secret" };
		const response = await GET({
			locals: { user: null },
			request: new Request("https://diadem.test/api/supported-features")
		} as Parameters<typeof GET>[0]);
		const data = await response.json();
		expect(data.biomes).toBe(true);
		expect(JSON.stringify(data)).not.toContain(config.biomes.url);
		expect(JSON.stringify(data)).not.toContain(config.biomes.secret);
	});
});
