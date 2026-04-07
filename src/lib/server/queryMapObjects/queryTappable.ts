import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { TappableData } from "@/lib/types/mapObjectData/tappable";
import type { FilterTappable } from "@/lib/features/filters/filters";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export class TappableQuery extends DbMapObjectQuery<TappableData, FilterTappable> {
	protected readonly type = MapObjectType.TAPPABLE;
	protected readonly table = "tappable";
	protected readonly fields = [
		"id",
		"lat",
		"lon",
		"type as tappable_type",
		"pokemon_id",
		"item_id",
		"count",
		"expire_timestamp_verified",
		"expire_timestamp",
		"updated"
	];
	protected readonly limit = requestLimits[MapObjectType.TAPPABLE];
	protected readonly idColumn = "id";
}
