import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type SpawnpointData = {
  id: bigint;
  mapId: string;
  type: MapObjectType.SPAWNPOINT;
  lat: number;
  lon: number;
  updated: number;
  last_seen: number;
  despawn_sec: number | null;
  first_seen: number;
};