import type { CellID } from 's2js/dist/s2/cellid';

export type WeatherData = {
	id: number;
	cellId: CellID;
	level: number | null;
	latitude: number;
	longitude: number;
	gameplay_condition: number | null;
	wind_direction: number | null;
	cloud_level: number | null;
	rain_level: number | null;
	wind_level: number | null;
	snow_level: number | null;
	fog_level: number | null;
	special_effect_level: number | null;
	severity: number | null;
	warn_weather: number | null;
	updated: number;
};
