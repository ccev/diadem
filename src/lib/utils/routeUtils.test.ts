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

const route: RouteData = {
	id: "route",
	mapId: "route-route",
	type: MapObjectType.ROUTE,
	lat: 51,
	lon: 6,
	name: "Test route",
	shortcode: "TEST",
	description: "Test description",
	distance_meters: 1000,
	duration_seconds: 600,
	elevation_uphill_meters: 0,
	elevation_downhill_meters: 0,
	start: {
		id: "start",
		type: MapObjectType.POKESTOP,
		name: null,
		image: "start.jpg",
		lat: 51,
		lon: 6,
		updated: 123,
		firstSeen: 123,
		deleted: false
	},
	end: {
		id: "end",
		type: MapObjectType.POKESTOP,
		name: null,
		image: "end.jpg",
		lat: 52,
		lon: 7,
		updated: 123,
		firstSeen: 123,
		deleted: false
	},
	reversible: true,
	image_border_color: "4742A1FF",
	image: "route.jpg",
	tags: [],
	route_type: 0,
	updated: 123,
	version: 1,
	waypoints: [
		{ lat_degrees: 51, lng_degrees: 6 },
		{ lat_degrees: 51.5, lng_degrees: 6.5 }
	]
};

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
					end: { ...route.end, name: "Reverse start", image: "end.jpg" }
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

	it("creates an end fort for a one-way route", () => {
		const pokestop = getRouteEndpointFort(
			[
				{
					...route,
					reversible: false,
					end: { ...route.end, name: "One-way end", image: "end.jpg" }
				}
			],
			"end"
		);

		expect(pokestop).toMatchObject({
			id: "end",
			name: "One-way end",
			url: "end.jpg"
		});
	});

	it("creates a team-colored gym endpoint without raid data", () => {
		const gym = getRouteEndpointFort(
			[
				{
					...route,
					start: {
						...route.start,
						type: MapObjectType.GYM,
						name: "Route Gym",
						image: "gym.jpg",
						teamId: 2,
						availableSlots: 3,
						inBattle: true,
						exRaidEligible: true,
						updated: 456,
						firstSeen: 123
					}
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
			getRouteEndpointFort([{ ...route, start: { ...route.start, deleted: true } }], "start")
		).toBeUndefined();
	});
});
