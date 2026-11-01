import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export type BiomeFields = {
	landform?: number;
	landcover?: number;
	temperature?: number;
	features?: number[];
	[field: string]: unknown;
};

export type BiomeProfile = {
	cell_id: string;
	fields: BiomeFields | null;
	/** Unix seconds. */
	geography_updated_at?: number;
	/** Unix seconds. */
	pools_updated_at?: number;
};

export type BiomeData = {
	id: string;
	mapId: string;
	type: MapObjectType.BIOME;
	lat: number;
	lon: number;
	profile: BiomeProfile;
};

export type BiomeSpawn = {
	pokemon_id: number;
	form: number;
	weight: number;
};

export type BiomePool = {
	name: string | null;
	share: number;
} & (
	| { spawns: BiomeSpawn[]; variants?: never }
	| { spawns?: never; variants: { spawns: BiomeSpawn[] }[] }
);

export type BiomePools = {
	cell_id: string;
	components: BiomePool[];
};
