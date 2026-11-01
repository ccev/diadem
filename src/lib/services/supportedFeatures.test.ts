import { isSupportedFeature, updateSupportedFeatures } from "@/lib/services/supportedFeatures";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils/requests", () => ({
	getHeaders: () => new Headers(),
	parseResponse: (response: Response) => response.json()
}));

afterEach(() => vi.unstubAllGlobals());

describe("supported biomes feature on the client", () => {
	it("is disabled by default and follows server support independently of saved settings", async () => {
		expect(isSupportedFeature("biomes")).toBe(false);
		const fetcher = vi.fn<typeof fetch>();
		vi.stubGlobal("fetch", fetcher);
		fetcher.mockResolvedValueOnce(Response.json({ biomes: true }));
		await updateSupportedFeatures();
		expect(isSupportedFeature("biomes")).toBe(true);
		fetcher.mockResolvedValueOnce(Response.json({ biomes: false }));
		await updateSupportedFeatures();
		expect(isSupportedFeature("biomes")).toBe(false);
		fetcher.mockResolvedValueOnce(Response.json({}));
		await updateSupportedFeatures();
		expect(isSupportedFeature("biomes")).toBe(false);
	});
});
