import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type NestData = {
  id: string;  // nest_id to id:str
  mapId: string;
  type: MapObjectType.NEST;

  lat: number;
  lon: number;
  name: string | null;
  polygon: {x: number, y: number}[][] | {x: number, y: number}[][][];  // y is lat, x is lon
  area_name: string | null;
  spawnpoints: number | null;
  m2: number | null;
  active: number | null;
  pokemon_id: number | null;
  pokemon_form: number | null;
  pokemon_avg: number | null;
  pokemon_ratio: number | null;
  pokemon_count: number | null;
  discarded: string | null;
  updated: number | null;
};