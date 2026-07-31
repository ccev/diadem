import { describe, expect, it } from "vitest";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import {
	getRouteBounds,
	getRouteColor,
	getRouteCoordinates,
	getRouteEndpointFort,
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

	it("computes bounds over the full route path", () => {
		expect(getRouteBounds(route)).toEqual([6, 51, 7, 52]);
	});

	it("normalizes route colors and falls back for invalid values", () => {
		expect(getRouteColor(route)).toBe("#4742A1FF");
		expect(getRouteColor({ ...route, image_border_color: "invalid" })).toBe("#6366f1");
	});

	it("creates a plain Pokestop for a reversible end", () => {
		const pokestop = getRouteEndpointFort(
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

	it("creates a team-colored gym endpoint without raid data", () => {
		const gym = getRouteEndpointFort(
			[
				{
					...route,
					start_fort_type: MapObjectType.GYM,
					start_name: "Route Gym",
					start_image: "gym.jpg",
					start_team_id: 2,
					start_available_slots: 3,
					start_in_battle: 1,
					start_ex_raid_eligible: 1,
					start_fort_updated: 456,
					start_fort_first_seen: 123
				}
			],
			"start"
		);

		expect(gym).toMatchObject({
			id: "start",
			mapId: "gym-start",
			type: MapObjectType.GYM,
			name: "Route Gym",
			team_id: 2,
			availble_slots: 3,
			in_battle: 1,
			ex_raid_eligible: 1,
			updated: 456,
			first_seen_timestamp: 123,
			isRouteEndpoint: true
		});
		expect(gym).not.toHaveProperty("raid_level");
	});

	it("does not create an endpoint for a deleted fort", () => {
		expect(
			getRouteEndpointFort(
				[{ ...route, start_fort_type: MapObjectType.GYM, start_fort_deleted: 1 }],
				"start"
			)
		).toBeUndefined();
	});
});
