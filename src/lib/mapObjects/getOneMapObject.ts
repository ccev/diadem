import type { MapData, MapObjectType } from "@/lib/types/mapObjectData/mapObjects";

export async function getOneMapObject(
	type: MapObjectType,
	id: string,
	thisFetch?: typeof fetch
): Promise<MapData | undefined> {
	const response = await (thisFetch ?? fetch)("/api/" + type + "/" + id);
	const data = await response.json();

	if (!data) return;
	if (data.error) {
		console.error("Error while fetching " + type + ": " + data.error);
		return;
	}

	if (!data.result) {
		return;
	}

	const result = data.result[0]

	if (!result || Object.keys(result).length === 0) return

	return result
}
