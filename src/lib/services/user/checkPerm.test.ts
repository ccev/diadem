import { FeaturePermissionContext } from "@/lib/services/user/checkPerm";
import { Features } from "@/lib/utils/features";
import { bboxPolygon, lineString, multiPolygon } from "@turf/turf";
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

describe("permission coverage for query filters", () => {
	const box = bboxPolygon([0, 0, 2, 2]);
	it("requires coverage by the union of the tier's areas", () => {
		const context = new FeaturePermissionContext(
			{
				everywhere: [],
				areas: [
					{
						name: "left",
						features: [Features.POKEMON_IV],
						polygon: bboxPolygon([0, 0, 1, 2]).geometry
					},
					{
						name: "right",
						features: [Features.POKEMON_IV],
						polygon: bboxPolygon([1, 0, 2, 2]).geometry
					}
				]
			},
			[Features.POKEMON_IV, Features.POKEMON_PVP]
		);
		expect(context.allowedThroughout(Features.POKEMON_IV, box)).toBe(true);
		expect(context.allowedThroughout(Features.POKEMON_PVP, box)).toBe(false);
		expect(context.allowedThroughout(Features.POKEMON_IV, bboxPolygon([0, 0, 3, 3]))).toBe(false);
		expect(context.allowedThroughout(Features.POKEMON_IV, null)).toBe(false);
	});
	it("checks every component of a disjoint query polygon", () => {
		const context = new FeaturePermissionContext(
			{
				everywhere: [],
				areas: [{ name: "left", features: [Features.POKEMON_IV], polygon: box.geometry }]
			},
			[Features.POKEMON_IV]
		);
		expect(
			context.allowedThroughout(
				Features.POKEMON_IV,
				multiPolygon([box.geometry.coordinates, bboxPolygon([3, 0, 4, 1]).geometry.coordinates])
			)
		).toBe(false);
	});
	it("accepts global grants without a query polygon", () => {
		const context = new FeaturePermissionContext({ everywhere: [Features.POKEMON_IV], areas: [] }, [
			Features.POKEMON_IV
		]);
		expect(context.allowedThroughout(Features.POKEMON_IV, null)).toBe(true);
	});
});
