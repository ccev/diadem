import { getConfig } from "@/lib/services/config/config";
import { getDefaultMapStyle } from "@/lib/services/themeMode";
import maplibre from "maplibre-gl";
import type { MapStyle } from "@/lib/services/config/configTypes";

export function mapStyleFromId(id: string) {
	let styleConfig = getConfig().mapStyles.find((s) => s.id === id);
	if (!styleConfig) {
		console.error("Invalid map style id, using default");
		styleConfig = getDefaultMapStyle();
	}
	return styleConfig
}

export function getMapStyle(mapStyle: MapStyle){
	if (mapStyle.raster) {
		return {
			'version': 8,
			'sources': {
				'raster-tiles': {
					'type': 'raster',
					'tiles': [mapStyle.url],
					'tileSize': mapStyle.raster.tileSize,
					'minzoom': mapStyle.raster.min,
					'maxzoom': mapStyle.raster.max,
					'attribution': mapStyle.attribution ?? "",
				}
			},
			'layers': [
				{
					'id': 'simple-tiles',
					'type': 'raster',
					'source': 'raster-tiles',
				}
			],
			'id': "style-" + mapStyle.id
		} as maplibre.StyleSpecification
	}

	return mapStyle.url
}