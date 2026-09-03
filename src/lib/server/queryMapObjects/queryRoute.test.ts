import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { RouteQuery } from "@/lib/server/queryMapObjects/queryRoute";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { describe, expect, it } from "vitest";

describe("RouteQuery", () => {
	it("calculates elevation totals and strips waypoint elevations", () => {
		const route = {
			id: "route",
			lat: 1,
			lon: 1,
			name: "Test route",
			shortcode: "TEST",
			description: "Test description",
			distance_meters: 1000,
			duration_seconds: 600,
			reversible: 1,
			start_fort_id: "start",
			start_fort_deleted: "0",
			start_fort_type: MapObjectType.GYM,
			start_name: "Start",
			start_image: "start.jpg",
			start_lat: 1,
			start_lon: 1,
			start_team_id: 2,
			start_available_slots: 3,
			start_in_battle: 0,
			start_ex_raid_eligible: 1,
			start_fort_updated: 100,
			start_fort_first_seen: 50,
			end_fort_id: "end",
			end_fort_deleted: "0",
			end_fort_type: MapObjectType.POKESTOP,
			end_name: "End",
			end_image: "end.jpg",
			end_lat: 4,
			end_lon: 4,
			end_team_id: null,
			end_available_slots: null,
			end_in_battle: null,
			end_ex_raid_eligible: null,
			end_fort_updated: 100,
			end_fort_first_seen: 50,
			image: "route.jpg",
			image_border_color: "4742A1FF",
			tags: "[]",
			route_type: 0,
			updated: 100,
			version: 1,
			waypoints: JSON.stringify([
				{ lat_degrees: 1, lng_degrees: 1, elevation_in_meters: 100 },
				{ lat_degrees: 2, lng_degrees: 2, elevation_in_meters: 112.5 },
				{ lat_degrees: 3, lng_degrees: 3, elevation_in_meters: 108 },
				{ lat_degrees: 4, lng_degrees: 4, elevation_in_meters: 115 }
			])
		} as unknown as MinMapObject<RouteData>;

		const query = new RouteQuery();
		query.prepare(route);
		query.prepare(route);

		expect(route.elevation_uphill_meters).toBe(19.5);
		expect(route.elevation_downhill_meters).toBe(4.5);
		expect(route.start).toEqual({
			id: "start",
			type: MapObjectType.GYM,
			name: "Start",
			image: "start.jpg",
			lat: 1,
			lon: 1,
			updated: 100,
			firstSeen: 50,
			deleted: false,
			teamId: 2,
			availableSlots: 3,
			inBattle: false,
			exRaidEligible: true
		});
		expect(route.waypoints).toEqual([
			{ lat_degrees: 1, lng_degrees: 1 },
			{ lat_degrees: 2, lng_degrees: 2 },
			{ lat_degrees: 3, lng_degrees: 3 },
			{ lat_degrees: 4, lng_degrees: 4 }
		]);
		expect(route).not.toHaveProperty("start_fort_id");
	});
});
