import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { RouteQuery } from "@/lib/server/queryMapObjects/queryRoute";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import { describe, expect, it } from "vitest";

describe("RouteQuery", () => {
	it("calculates elevation totals and strips waypoint elevations", () => {
		const route = {
			reversible: 1,
			start_fort_deleted: "0",
			end_fort_deleted: "0",
			start_fort_type: MapObjectType.POKESTOP,
			end_fort_type: MapObjectType.POKESTOP,
			tags: "[]",
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
		expect(route.waypoints).toEqual([
			{ lat_degrees: 1, lng_degrees: 1 },
			{ lat_degrees: 2, lng_degrees: 2 },
			{ lat_degrees: 3, lng_degrees: 3 },
			{ lat_degrees: 4, lng_degrees: 4 }
		]);
	});
});
