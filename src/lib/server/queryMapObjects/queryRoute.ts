import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { RouteData } from "@/lib/types/mapObjectData/route";
import type { FilterRoute } from "@/lib/features/filters/filters";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export class RouteQuery extends DbMapObjectQuery<RouteData, FilterRoute> {
	protected readonly type = MapObjectType.ROUTE;
	protected readonly table = "route";
	protected readonly fields = [
		"id",
		"start_lat as lat",
		"start_lon as lon",
		"name",
		"shortcode",
		"description",
		"distance_meters",
		"duration_seconds",
		"start_fort_id",
		"start_image",
		"start_lat",
		"start_lon",
		"end_fort_id",
		"end_image",
		"end_lat",
		"end_lon",
		"image",
		"image_border_color",
		"reversible",
		"tags",
		"type as route_type",
		"updated",
		"version",
		"waypoints"
	];
	protected readonly limit = requestLimits[MapObjectType.ROUTE];
	protected readonly idColumn = "id";
}
