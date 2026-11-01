import * as m from "@/lib/paraglide/messages";
import type {
	BiomeFields,
	BiomePools,
	BiomeProfile,
	BiomeSpawn
} from "@/lib/types/mapObjectData/biome";

export function isDiscoveredBiome(profile: BiomeProfile): boolean {
	return profile.fields != null;
}

const fieldLabels: Record<
	"landform" | "landcover" | "temperature" | "features",
	Record<number, () => string>
> = {
	landform: {
		1: m.biome_mountains,
		2: m.biome_hills,
		3: m.biome_tablelands,
		4: m.biome_plains
	},
	landcover: {
		1: m.biome_cropland,
		2: m.biome_shrubland,
		3: m.biome_forest,
		4: m.biome_grassland,
		5: m.biome_settlements,
		6: m.biome_sparse,
		8: m.biome_snow_ice
	},
	temperature: {
		1: m.biome_boreal,
		2: m.biome_cool_temperate,
		3: m.biome_warm_temperate,
		4: m.biome_subtropical,
		5: m.biome_tropical,
		6: m.biome_polar
	},
	features: {
		1: m.biome_city,
		2: m.biome_beach,
		3: m.biome_ocean,
		4: m.biome_river,
		5: m.biome_lake,
		6: m.biome_desert
	}
};

export function getBiomeFieldLabel(field: keyof typeof fieldLabels, value?: number): string {
	if (value === undefined) return m.unknown();
	return fieldLabels[field][value]?.() ?? m.biome_unknown_value({ value });
}

export type BiomeName =
	| "cropland"
	| "shrubland"
	| "forest"
	| "grassland"
	| "settlements"
	| "sparse"
	| "snowy"
	| "city"
	| "beach"
	| "ocean"
	| "river"
	| "lake"
	| "desert"
	| "waters";

const landcoverNames: Record<number, BiomeName> = {
	1: "cropland",
	2: "shrubland",
	3: "forest",
	4: "grassland",
	5: "settlements",
	6: "sparse",
	8: "snowy"
};

const temperatureNames: Record<
	number,
	"boreal" | "cool" | "warm" | "subtropical" | "tropical" | "polar"
> = {
	1: "boreal",
	2: "cool",
	3: "warm",
	4: "subtropical",
	5: "tropical",
	6: "polar"
};

// Shared by titles, colors and icons: water > beach > desert > city > landcover.
export function getBiomeName(fields: BiomeFields | null): BiomeName | undefined {
	if (!fields) return;
	const features = fields.features ?? [];
	if ([3, 4, 5].filter((feature) => features.includes(feature)).length > 1) return "waters";
	for (const [feature, name] of [
		[3, "ocean"],
		[4, "river"],
		[5, "lake"],
		[2, "beach"],
		[6, "desert"],
		[1, "city"]
	] as const) {
		if (features.includes(feature)) return name;
	}
	return landcoverNames[fields.landcover ?? 0];
}

export function getBiomeLabel(profile: BiomeProfile): string {
	const fields = profile.fields;
	if (!fields) return m.biome();

	const name = getBiomeName(fields);
	const temperature = temperatureNames[fields.temperature ?? 0];
	if (!name || !temperature) return m.biome();

	let landform: "" | "mountainous_" | "hilly_" = "";
	if (fields.landform === 1) {
		landform = "mountainous_";
	} else if (fields.landform === 2) {
		landform = "hilly_";
	}
	return m[`biome_name_${temperature}_${landform}${name}`]();
}

const biomeColors: Record<BiomeName, [number, number, number]> = {
	cropland: [254, 154, 0], // amber-500
	shrubland: [94, 165, 0], // lime-600
	forest: [0, 166, 62], // green-600
	grassland: [124, 207, 0], // lime-500
	settlements: [173, 70, 255], // purple-500
	sparse: [94, 233, 181], // emerald-300
	snowy: [116, 212, 255], // sky-300
	city: [173, 70, 255], // purple-500
	beach: [255, 210, 48], // amber-300
	desert: [240, 177, 0], // yellow-500
	ocean: [97, 95, 255], // indigo-500
	lake: [43, 127, 255], // blue-500
	river: [43, 127, 255], // blue-500
	waters: [43, 127, 255] // blue-500
};

export function getBiomeColor(profile: BiomeProfile, opacity = 0.25): string {
	let color: [number, number, number] = [98, 116, 142]; // slate-500 fallback
	if (profile.fields) {
		const name = getBiomeName(profile.fields);
		if (name) {
			color = biomeColors[name];
		}
	}
	const [red, green, blue] = color;
	return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export type BiomeSpawnChance = Omit<BiomeSpawn, "weight"> & {
	minimum: number;
	maximum: number;
};

export function getBiomePoolSpawns(
	pools: BiomePools,
	selectedComponentIndex: number
): BiomeSpawnChance[] {
	const overallChances = new Map<string, BiomeSpawnChance>();
	const selectedPokemonKeys = new Set<string>();

	for (const [componentIndex, component] of pools.components.entries()) {
		if (component.share <= 0) continue;

		let variants: { spawns: BiomeSpawn[] }[];
		if (component.spawns) {
			variants = [component];
		} else {
			variants = component.variants;
		}

		const pokemonInComponent = new Map<string, BiomeSpawn>();
		const weightsByVariant: Map<string, number>[] = [];
		for (const variant of variants) {
			const variantWeights = new Map<string, number>();
			for (const spawn of variant.spawns) {
				const pokemonKey = `${spawn.pokemon_id}-${spawn.form}`;
				const previousWeight = variantWeights.get(pokemonKey) ?? 0;
				variantWeights.set(pokemonKey, previousWeight + spawn.weight);
				pokemonInComponent.set(pokemonKey, spawn);

				if (componentIndex === selectedComponentIndex) {
					selectedPokemonKeys.add(pokemonKey);
				}
			}
			weightsByVariant.push(variantWeights);
		}

		for (const [pokemonKey, pokemon] of pokemonInComponent) {
			let minimumWeight = Infinity;
			let maximumWeight = -Infinity;
			for (const variantWeights of weightsByVariant) {
				const weight = variantWeights.get(pokemonKey) ?? 0;
				minimumWeight = Math.min(minimumWeight, weight);
				maximumWeight = Math.max(maximumWeight, weight);
			}

			let overallChance = overallChances.get(pokemonKey);
			if (!overallChance) {
				overallChance = {
					pokemon_id: pokemon.pokemon_id,
					form: pokemon.form,
					minimum: 0,
					maximum: 0
				};
				overallChances.set(pokemonKey, overallChance);
			}

			overallChance.minimum += minimumWeight * component.share;
			overallChance.maximum += maximumWeight * component.share;
		}
	}

	const selectedSpawns: BiomeSpawnChance[] = [];
	for (const pokemonKey of selectedPokemonKeys) {
		const chance = overallChances.get(pokemonKey);
		if (chance && chance.maximum > 0) {
			selectedSpawns.push(chance);
		}
	}

	selectedSpawns.sort((a, b) => {
		if (a.maximum !== b.maximum) return b.maximum - a.maximum;
		if (a.pokemon_id !== b.pokemon_id) return a.pokemon_id - b.pokemon_id;
		return a.form - b.form;
	});

	return selectedSpawns;
}
