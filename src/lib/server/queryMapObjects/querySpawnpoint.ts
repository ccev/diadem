import type { FilterSpawnpoint } from "@/lib/features/filters/filters";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { requestLimits } from "@/lib/server/api/rateLimit";
import { DbMapObjectQuery } from "@/lib/server/queryMapObjects/MapObjectQuery";
import type { SpawnpointData } from "@/lib/types/mapObjectData/spawnpoint";

export class SpawnpointQuery extends DbMapObjectQuery<SpawnpointData, FilterSpawnpoint> {
	protected readonly type = MapObjectType.SPAWNPOINT;
	protected readonly table = "spawnpoint";
	protected readonly fields = [
		"CONVERT(id, CHAR) AS id",
		"lat",
		"lon",
		"updated",
		"last_seen",
		"despawn_sec",
		"first_seen"
	];
	protected readonly limit = requestLimits[MapObjectType.SPAWNPOINT];
	protected readonly idColumn = "id";
}
