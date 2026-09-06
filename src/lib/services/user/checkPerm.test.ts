import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";
import { lineString } from "@turf/turf";
import { describe, expect, it } from "vitest";

const permissions = {
	everywhere: [],
	areas: [
		{
			name: "test area",
			features: [Features.ROUTE],
			polygon: {
				type: "Polygon" as const,
				coordinates: [
					[
						[0, 0],
						[0, 1],
						[1, 1],
						[1, 0],
						[0, 0]
					]
				]
			}
		}
	]
};

describe("FeaturePermissionContext geometry", () => {
	it("allows a route crossing an area when both endpoints are outside", () => {
		const context = new FeaturePermissionContext(permissions, [Features.ROUTE]);

		expect(
			context.isAllowedGeometry(
				Features.ROUTE,
				lineString([
					[-1, 0.5],
					[2, 0.5]
				])
			)
		).toBe(true);
		expect(context.isAllowedAt(Features.ROUTE, 0.5, -1)).toBe(false);
		expect(context.isAllowedAt(Features.ROUTE, 0.5, 2)).toBe(false);
	});

	it("rejects a route outside the area", () => {
		const context = new FeaturePermissionContext(permissions, [Features.ROUTE]);

		expect(
			context.isAllowedGeometry(
				Features.ROUTE,
				lineString([
					[-1, 2],
					[2, 2]
				])
			)
		).toBe(false);
	});
});
