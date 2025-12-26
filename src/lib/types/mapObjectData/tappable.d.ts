import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type TappableData = {
  id: string;
  mapId: string;
  type: MapObjectType.TAPPABLE;
  lat: number;
  lon: number;
  fort_id: string | null;
  spawn_id: bigint | null;
  tappable_type: string;
  pokemon_id: number | null;
  item_id: number | null;
  count: number | null;
  expire_timestamp_verified: number;
  expire_timestamp: number | null;
  updated: number;
};