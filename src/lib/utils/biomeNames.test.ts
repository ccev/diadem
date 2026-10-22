import { getBiomeLabel } from "@/lib/utils/biomeUtils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/paraglide/messages", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/paraglide/messages")>()),
	biome_name_cool_hilly_forest: () => "Forest in the cool hills",
	biome_name_warm_mountainous_city: () => "City among warm mountains"
}));

describe("complete biome name translations", () => {
	it("uses translated names verbatim instead of composing translated fragments", () => {
		expect(
			getBiomeLabel({
				cell_id: "5160937946483785728",
				fields: { landcover: 3, temperature: 2, landform: 2 }
			})
		).toBe("Forest in the cool hills");
		expect(
			getBiomeLabel({
				cell_id: "5160937946483785728",
				fields: { features: [1], temperature: 3, landform: 1 }
			})
		).toBe("City among warm mountains");
	});
});
