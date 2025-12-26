import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type RouteData = {
  id: string;
  mapId: string;
  type: MapObjectType.ROUTE;
  lat: number;  // start lat, to have a reference point
  lon: number;
  name: string;
  shortcode: string;
  description: string;
  distance_meters: number;
  duration_seconds: number;
  start_fort_id: string;
  start_image: string;
  start_lat: number;
  start_lon: number;
  end_fort_id: string;
  end_image: string;
  end_lat: number;
  end_lon: number;
  image: string;
  image_border_color: string;
  reversible: number;
  tags: string | null;
  route_type: number; // Renamed from 'type' in SQL to avoid conflict with discriminant
  updated: number;
  version: number;
  waypoints: string;
};