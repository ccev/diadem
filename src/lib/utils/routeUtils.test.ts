import { describe, expect, it } from "vitest";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import {
	getRouteColor,
	getRouteCoordinates,
	getRouteEndpointPokestop,
	routeStartsAt
} from "@/lib/utils/routeUtils";

const route = {
	start_fort_id: "start",
	end_fort_id: "end",
	start_lat: 51,
	start_lon: 6,
	end_lat: 52,
	end_lon: 7,
	reversible: true,
	image_border_color: "4742A1FF",
	waypoints: [
		{ lat_degrees: 51, lng_degrees: 6 },
		{ lat_degrees: 51.5, lng_degrees: 6.5 }
	]
} as RouteData;

describe("route utilities", () => {
	it("treats both endpoints of a reversible route as starts", () => {
		expect(routeStartsAt(route, "start")).toBe(true);
		expect(routeStartsAt(route, "end")).toBe(true);
		expect(routeStartsAt({ ...route, reversible: false }, "end")).toBe(false);
	});

	it("builds a path including both endpoints without adjacent duplicates", () => {
		expect(getRouteCoordinates(route)).toEqual([
			[6, 51],
			[6.5, 51.5],
			[7, 52]
		]);
	});

	it("normalizes route colors and falls back for invalid values", () => {
		expect(getRouteColor(route)).toBe("#4742A1FF");
		expect(getRouteColor({ ...route, image_border_color: "invalid" })).toBe("#6366f1");
	});

	it("creates a plain Pokestop for a reversible end", () => {
		const pokestop = getRouteEndpointPokestop(
			[
				{
					...route,
					end_name: "Reverse start",
					end_image: "end.jpg",
					updated: 123
				}
			],
			"end"
		);

		expect(pokestop).toMatchObject({
			id: "end",
			mapId: "pokestop-end",
			lat: 52,
			lon: 7,
			name: "Reverse start",
			url: "end.jpg",
			incident: [],
			quests: [],
			isRouteEndpoint: true
		});
	});
});
