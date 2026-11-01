import type { BiomeFields, BiomePools, BiomeProfile } from "@/lib/types/mapObjectData/biome";
import {
	getBiomeColor,
	getBiomeFieldLabel,
	getBiomePoolSpawns,
	getBiomeLabel,
	getBiomeName,
	isDiscoveredBiome
} from "@/lib/utils/biomeUtils";
import { describe, expect, it } from "vitest";

const profile: BiomeProfile = {
	cell_id: "5160937946483785728",
	fields: { landform: 4, landcover: 3, temperature: 2, features: [] }
};

const pools: BiomePools = {
	cell_id: profile.cell_id,
	components: [
		{ name: "background", share: 0.35, spawns: [{ pokemon_id: 1, form: 163, weight: 0.2 }] },
		{ name: "event", share: 0.6, spawns: [{ pokemon_id: 77, form: 1011, weight: 0.1 }] },
		{ name: "regional", share: 0.05, spawns: [] }
	]
};

describe("biome geography", () => {
	it("only considers non-null geography discovered", () => {
		expect(isDiscoveredBiome(profile)).toBe(true);
		expect(isDiscoveredBiome({ ...profile, fields: null })).toBe(false);
		expect(isDiscoveredBiome({ ...profile, fields: {} })).toBe(true);
	});

	it("distinguishes missing and unknown enum values", () => {
		expect(getBiomeFieldLabel("landcover")).toBe("Unknown");
		expect(getBiomeFieldLabel("landcover", 0)).toBe("Unknown (0)");
		expect(getBiomeFieldLabel("landcover", 7)).toBe("Unknown (7)");
		expect(getBiomeFieldLabel("landcover", 8)).toBe("Snowy");
	});

	it.each([
		{ field: "landcover", value: 1, label: "Farmland" },
		{ field: "landcover", value: 4, label: "Meadows" },
		{ field: "landform", value: 3, label: "Plateaus" }
	] as const)("uses $label for $field value $value", ({ field, value, label }) => {
		expect(getBiomeFieldLabel(field, value)).toBe(label);
	});

	it("keeps colors independent of temperature, landform, moisture and update timestamps", () => {
		const before = getBiomeColor(profile);
		expect(
			getBiomeColor({
				...profile,
				geography_updated_at: 1792497600,
				fields: { ...profile.fields, moisture: 1 }
			})
		).toBe(before);
		expect(getBiomeColor({ ...profile, fields: { ...profile.fields, moisture: 3 } })).toBe(before);
		expect(getBiomeColor({ ...profile, fields: { ...profile.fields, landcover: 5 } })).not.toBe(
			before
		);
		expect(getBiomeColor({ ...profile, fields: { ...profile.fields, temperature: 5 } })).toBe(
			before
		);
		expect(getBiomeColor({ ...profile, fields: { ...profile.fields, landform: 1 } })).toBe(before);
	});

	it.each<{ name: string; fields: BiomeFields; rgb: string }>([
		{ name: "cropland", fields: { landcover: 1 }, rgb: "254, 154, 0" },
		{ name: "shrubland", fields: { landcover: 2 }, rgb: "94, 165, 0" },
		{ name: "forest", fields: { landcover: 3 }, rgb: "0, 166, 62" },
		{ name: "grassland", fields: { landcover: 4 }, rgb: "124, 207, 0" },
		{ name: "settlements", fields: { landcover: 5 }, rgb: "173, 70, 255" },
		{ name: "sparse", fields: { landcover: 6 }, rgb: "94, 233, 181" },
		{ name: "snowy", fields: { landcover: 8 }, rgb: "116, 212, 255" },
		{ name: "city", fields: { features: [1] }, rgb: "173, 70, 255" },
		{ name: "beach", fields: { features: [2] }, rgb: "255, 210, 48" },
		{ name: "ocean", fields: { features: [3] }, rgb: "97, 95, 255" },
		{ name: "river", fields: { features: [4] }, rgb: "43, 127, 255" },
		{ name: "lake", fields: { features: [5] }, rgb: "43, 127, 255" },
		{ name: "desert", fields: { features: [6] }, rgb: "240, 177, 0" },
		{ name: "waters", fields: { features: [3, 4] }, rgb: "43, 127, 255" }
	])("uses a fixed Tailwind palette color for $name", ({ fields, rgb }) => {
		expect(getBiomeColor({ ...profile, fields })).toBe(`rgba(${rgb}, 0.25)`);
	});

	it.each([0, 0.25, 0.45, 1])("preserves the requested opacity (%s)", (opacity) => {
		expect(getBiomeColor(profile, opacity)).toBe(`rgba(0, 166, 62, ${opacity})`);
	});

	it("uses water features before landcover regardless of feature order or repeats", () => {
		const water = { ...profile, fields: { ...profile.fields, features: [3, 1, 3] } };
		expect(getBiomeColor(water)).toBe(
			getBiomeColor({ ...water, fields: { ...water.fields, landcover: 1, features: [1, 3] } })
		);
		expect(getBiomeColor(water)).not.toBe(getBiomeColor(profile));
		expect(getBiomeColor(profile, 0.45)).toContain("0.45)");
	});

	it("uses slate-500 for unavailable or unknown geography", () => {
		for (const fields of [null, {}, { landcover: 0 }, { landcover: 99 }, { features: [99] }]) {
			expect(getBiomeColor({ ...profile, fields })).toBe("rgba(98, 116, 142, 0.25)");
			expect(getBiomeColor({ ...profile, fields }, 0.45)).toBe("rgba(98, 116, 142, 0.45)");
		}
	});
});

describe("biome names", () => {
	it.each<{ name: string; label: string; fields: BiomeFields }>([
		{ name: "cropland", label: "Farmland", fields: { landcover: 1 } },
		{ name: "shrubland", label: "Shrubland", fields: { landcover: 2 } },
		{ name: "forest", label: "Forest", fields: { landcover: 3 } },
		{ name: "grassland", label: "Meadows", fields: { landcover: 4 } },
		{ name: "settlements", label: "Settlements", fields: { landcover: 5 } },
		{ name: "sparse", label: "Barrens", fields: { landcover: 6 } },
		{ name: "snowy", label: "Snowfields", fields: { landcover: 8 } },
		{ name: "city", label: "City", fields: { features: [1] } },
		{ name: "beach", label: "Beach", fields: { features: [2] } },
		{ name: "ocean", label: "Ocean", fields: { features: [3] } },
		{ name: "river", label: "River", fields: { features: [4] } },
		{ name: "lake", label: "Lake", fields: { features: [5] } },
		{ name: "desert", label: "Desert", fields: { features: [6] } },
		{ name: "waters", label: "Waters", fields: { features: [3, 4] } }
	])(
		"has complete translations for every temperature and landform of $name",
		({ name, label, fields }) => {
			expect(getBiomeName(fields)).toBe(name);
			const temperatures = ["Boreal", "Cool", "Warm", "Subtropical", "Tropical", "Polar"];
			const landforms = ["", "Mountainous", "Hilly"];
			for (const [temperature, temperatureLabel] of temperatures.entries()) {
				for (const [landform, landformLabel] of landforms.entries()) {
					const expected = [temperatureLabel, landformLabel, label].filter(Boolean).join(" ");
					expect(getBiomeName({ ...fields, temperature: temperature + 1, landform })).toBe(name);
					expect(
						getBiomeLabel({
							...profile,
							fields: { ...fields, temperature: temperature + 1, landform }
						})
					).toBe(expected);
				}
			}
		}
	);

	it.each([
		[1, "Boreal Forest"],
		[2, "Cool Forest"],
		[3, "Warm Forest"],
		[4, "Subtropical Forest"],
		[5, "Tropical Forest"],
		[6, "Polar Forest"]
	])("uses a short temperature name for temperature %i", (temperature, name) => {
		expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, temperature } })).toBe(name);
	});

	it("combines temperature and landcover into a readable name", () => {
		expect(
			getBiomeLabel({ ...profile, fields: { ...profile.fields, temperature: 3, landcover: 5 } })
		).toBe("Warm Settlements");
		expect(getBiomeFieldLabel("temperature", 2)).toBe("Cool");
		expect(getBiomeFieldLabel("temperature", 3)).toBe("Warm");
	});

	it.each([
		[1, "Cool Mountainous Forest"],
		[2, "Cool Hilly Forest"]
	])("adds a landform adjective for landform %i", (landform, name) => {
		expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, landform } })).toBe(name);
		expect(getBiomeFieldLabel("landform", 1)).toBe("Mountains");
		expect(getBiomeFieldLabel("landform", 2)).toBe("Hills");
	});

	it("uses one generic fallback when naming data is unavailable", () => {
		expect(getBiomeLabel({ ...profile, fields: { landform: 1, landcover: 3 } })).toBe("Biome");
		expect(getBiomeLabel({ ...profile, fields: { landform: 2, features: [5] } })).toBe("Biome");
		expect(getBiomeLabel({ ...profile, fields: { landform: 2 } })).toBe("Biome");
	});

	it("does not add adjectives for tablelands, plains or unknown landforms", () => {
		for (const landform of [undefined, 0, 3, 4, 99]) {
			expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, landform } })).toBe(
				"Cool Forest"
			);
		}
	});

	it.each([
		[3, "Cool Ocean"],
		[4, "Cool River"],
		[5, "Cool Lake"]
	])("uses water feature %i instead of landcover in the name", (feature, name) => {
		const features = [feature, 1, feature, 2, 6, 99];
		expect(
			getBiomeLabel({ ...profile, fields: { ...profile.fields, landcover: 5, features } })
		).toBe(name);
		expect(features).toEqual([feature, 1, feature, 2, 6, 99]);
	});

	it.each([
		{ features: [3, 4] },
		{ features: [3, 5] },
		{ features: [4, 5] },
		{ features: [3, 4, 5] }
	])("uses Waters for distinct water features $features regardless of order", ({ features }) => {
		expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, features } })).toBe(
			"Cool Waters"
		);
		expect(
			getBiomeLabel({
				...profile,
				fields: { ...profile.fields, features: [2, ...[...features].reverse(), 2] }
			})
		).toBe("Cool Waters");
	});

	it.each([{ features: [2] }, { features: [2, 2] }, { features: [1, 2, 6, 99] }])(
		"uses Beach instead of landcover for features $features without water",
		({ features }) => {
			expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, features } })).toBe(
				"Cool Beach"
			);
		}
	);

	it("allows a feature to replace missing landcover", () => {
		expect(getBiomeLabel({ ...profile, fields: { temperature: 3, features: [2] } })).toBe(
			"Warm Beach"
		);
		expect(getBiomeLabel({ ...profile, fields: { features: [2] } })).toBe("Biome");
	});

	it.each([
		{ feature: 6, name: "Desert" },
		{ feature: 1, name: "City" }
	])("names $name biomes without requiring landcover", ({ feature, name }) => {
		expect(getBiomeLabel({ ...profile, fields: { temperature: 3, features: [feature] } })).toBe(
			`Warm ${name}`
		);
		expect(getBiomeLabel({ ...profile, fields: { features: [feature] } })).toBe("Biome");
	});

	it("keeps landcover names when no known features are present", () => {
		for (const features of [undefined, [], [0, 99]]) {
			expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, features } })).toBe(
				"Cool Forest"
			);
		}
	});

	it("names water biomes without requiring landcover", () => {
		expect(getBiomeLabel({ ...profile, fields: { temperature: 3, features: [3] } })).toBe(
			"Warm Ocean"
		);
		expect(getBiomeLabel({ ...profile, fields: { features: [5] } })).toBe("Biome");
		expect(getBiomeLabel({ ...profile, fields: { features: [3, 5] } })).toBe("Biome");
	});

	it("does not invent temperatures or landcover for missing, unset or unknown fields", () => {
		for (const value of [undefined, 0, 99]) {
			expect(getBiomeLabel({ ...profile, fields: { temperature: value, landcover: 3 } })).toBe(
				"Biome"
			);
			expect(getBiomeLabel({ ...profile, fields: { temperature: 3, landcover: value } })).toBe(
				"Biome"
			);
		}
		expect(getBiomeLabel({ ...profile, fields: {} })).toBe("Biome");
	});

	it("uses the generic name for unavailable geography", () => {
		expect(getBiomeLabel({ ...profile, fields: null })).toBe("Biome");
		expect(getBiomeName(null)).toBeUndefined();
		expect(getBiomeName({})).toBeUndefined();
		expect(getBiomeName({ landcover: 99, features: [99] })).toBeUndefined();
	});
});

describe("biome feature priority", () => {
	it.each([
		{ landform: 1, adjective: "Mountainous" },
		{ landform: 2, adjective: "Hilly" }
	])("preserves feature priority with $adjective names", ({ landform, adjective }) => {
		for (const { features, name } of [
			{ features: [3, 2, 6, 1], name: "Ocean" },
			{ features: [4, 2, 6, 1], name: "River" },
			{ features: [5, 2, 6, 1], name: "Lake" },
			{ features: [3, 4, 2, 6, 1], name: "Waters" },
			{ features: [2, 6, 1], name: "Beach" },
			{ features: [6, 1], name: "Desert" },
			{ features: [1], name: "City" }
		]) {
			expect(getBiomeLabel({ ...profile, fields: { ...profile.fields, landform, features } })).toBe(
				`Cool ${adjective} ${name}`
			);
		}
	});

	it.each([
		{ features: [3, 2, 6, 1], dominant: [3], name: "Cool Ocean", baseName: "ocean" },
		{ features: [4, 2, 6, 1], dominant: [4], name: "Cool River", baseName: "river" },
		{ features: [5, 2, 6, 1], dominant: [5], name: "Cool Lake", baseName: "lake" },
		{ features: [3, 4, 5, 2, 6, 1], dominant: [3, 4], name: "Cool Waters", baseName: "waters" },
		{ features: [4, 5, 2, 6, 1], dominant: [3, 4], name: "Cool Waters", baseName: "waters" },
		{ features: [2, 6, 1], dominant: [2], name: "Cool Beach", baseName: "beach" },
		{ features: [6, 1], dominant: [6], name: "Cool Desert", baseName: "desert" },
		{ features: [1], dominant: [1], name: "Cool City", baseName: "city" }
	])(
		"aligns the name, color and icon classification for $name",
		({ features, dominant, name, baseName }) => {
			const expectedColor = getBiomeColor({
				...profile,
				fields: { ...profile.fields, features: dominant }
			});
			expect(expectedColor).not.toBe(getBiomeColor(profile));
			for (const ordered of [features, [...features].reverse(), [...features, 99, ...features]]) {
				const biome = {
					...profile,
					fields: { ...profile.fields, landcover: 8, features: ordered }
				};
				expect(getBiomeLabel(biome)).toBe(name);
				expect(getBiomeName(biome.fields)).toBe(baseName);
				expect(getBiomeColor(biome)).toBe(expectedColor);
			}
		}
	);
});

describe("overall biome spawn chances", () => {
	it("includes unknown pools and their contributions to known pools", () => {
		const special = structuredClone(pools);
		special.components.push({
			name: "future-pool",
			share: 0.1,
			spawns: [{ pokemon_id: 77, form: 1011, weight: 0.5 }]
		});
		const [spawn] = getBiomePoolSpawns(special, 3);
		expect(spawn.minimum).toBeCloseTo(0.11);
		expect(spawn.maximum).toBeCloseTo(0.11);
		expect(getBiomePoolSpawns(special, 1)[0]).toEqual(spawn);
	});

	it("keeps multiple unnamed components separate and sums their shared species", () => {
		const special: BiomePools = {
			cell_id: profile.cell_id,
			components: [
				{
					name: null,
					share: 0.02,
					spawns: [{ pokemon_id: 774, form: 3380, weight: 1 }]
				},
				{
					name: null,
					share: 0.03,
					spawns: [
						{ pokemon_id: 774, form: 3380, weight: 0.5 },
						{ pokemon_id: 25, form: 0, weight: 0.5 }
					]
				}
			]
		};
		const [spawn] = getBiomePoolSpawns(special, 0);
		expect(spawn.minimum).toBeCloseTo(0.035);
		expect(spawn.maximum).toBeCloseTo(0.035);
		expect(getBiomePoolSpawns(special, 0)).toHaveLength(1);
		expect(getBiomePoolSpawns(special, 1)).toHaveLength(2);
		expect(getBiomePoolSpawns(special, 1)[0]).toEqual(spawn);
	});

	it("multiplies original catalog weights by their actual component shares without renormalizing", () => {
		const [event] = getBiomePoolSpawns(pools, 1);
		expect(event.minimum).toBeCloseTo(0.06);
		expect(event.maximum).toBeCloseTo(0.06);
		expect(getBiomePoolSpawns(pools, 0)[0].minimum).toBeCloseTo(0.07);
	});

	it("sums overall contributions by species AND form across catalogs", () => {
		const shared = structuredClone(pools);
		shared.components[0].spawns!.push(
			{ pokemon_id: 77, form: 1011, weight: 0.2 },
			{ pokemon_id: 77, form: 2336, weight: 0.3 }
		);
		const [event] = getBiomePoolSpawns(shared, 1);
		expect(event.minimum).toBeCloseTo(0.13);
		expect(getBiomePoolSpawns(shared, 0).find((spawn) => spawn.form === 1011)).toEqual(event);
		expect(getBiomePoolSpawns(shared, 0).find((spawn) => spawn.form === 2336)?.minimum).toBeCloseTo(
			0.105
		);
	});

	it("uses the API's non-event shares instead of assuming 35/60/5", () => {
		const noEvent = structuredClone(pools);
		noEvent.components = [{ ...noEvent.components[0], share: 0.95 }, noEvent.components[2]];
		expect(getBiomePoolSpawns(noEvent, 0)[0].maximum).toBeCloseTo(0.19);
		expect(getBiomePoolSpawns(noEvent, 1)).toEqual([]);
	});

	it("shows ranges for unresolved variants rather than adding or averaging them", () => {
		const variants = structuredClone(pools);
		variants.components[2] = {
			name: "regional",
			share: 0.05,
			variants: [
				{ spawns: [{ pokemon_id: 122, form: 1080, weight: 0.2 }] },
				{
					spawns: [
						{ pokemon_id: 122, form: 1080, weight: 0.4 },
						{ pokemon_id: 480, form: 0, weight: 0.1 }
					]
				}
			]
		};
		const [mrMime, uxie] = getBiomePoolSpawns(variants, 2);
		expect(mrMime.minimum).toBeCloseTo(0.01);
		expect(mrMime.maximum).toBeCloseTo(0.02);
		expect(uxie.minimum).toBe(0);
		expect(uxie.maximum).toBeCloseTo(0.005);
	});

	it("ignores unavailable distributions without redistributing their shares", () => {
		const unavailable = structuredClone(pools);
		unavailable.components[0] = { name: "background", share: 0.35, spawns: [] };
		expect(getBiomePoolSpawns(unavailable, 0)).toEqual([]);
		expect(getBiomePoolSpawns(unavailable, 1)[0].maximum).toBeCloseTo(0.06);
	});

	it("sums repeated species/form entries within a component", () => {
		const repeated = structuredClone(pools);
		repeated.components[1].spawns!.push({ pokemon_id: 77, form: 1011, weight: 0.2 });
		expect(getBiomePoolSpawns(repeated, 1)[0].maximum).toBeCloseTo(0.18);
	});

	it("sums duplicates within variants and adds other components without mutating the input", () => {
		const uncertainPools: BiomePools = {
			cell_id: profile.cell_id,
			components: [
				{
					name: "background",
					share: 0.5,
					spawns: [{ pokemon_id: 25, form: 0, weight: 0.2 }]
				},
				{
					name: "regional",
					share: 0.1,
					variants: [
						{
							spawns: [
								{ pokemon_id: 25, form: 0, weight: 0.1 },
								{ pokemon_id: 25, form: 0, weight: 0.2 }
							]
						},
						{ spawns: [] },
						{ spawns: [{ pokemon_id: 25, form: 0, weight: 0.15 }] }
					]
				}
			]
		};
		const originalPools = structuredClone(uncertainPools);
		const [spawn] = getBiomePoolSpawns(uncertainPools, 1);
		expect(spawn.minimum).toBeCloseTo(0.1);
		expect(spawn.maximum).toBeCloseTo(0.13);
		expect(getBiomePoolSpawns(uncertainPools, 0)).toEqual([spawn]);
		expect(uncertainPools).toEqual(originalPools);
	});

	it("does not display a zero-share component even if its Pokémon appear elsewhere", () => {
		const inactivePools: BiomePools = {
			cell_id: profile.cell_id,
			components: [
				{
					name: "background",
					share: 1,
					spawns: [{ pokemon_id: 25, form: 0, weight: 0.5 }]
				},
				{ name: "event", share: 0, spawns: [{ pokemon_id: 25, form: 0, weight: 1 }] }
			]
		};
		expect(getBiomePoolSpawns(inactivePools, 1)).toEqual([]);
		expect(getBiomePoolSpawns(inactivePools, 0)[0].maximum).toBe(0.5);
	});

	it("sorts by chance, then Pokémon ID and form, and omits zero-chance entries", () => {
		const unsortedPools: BiomePools = {
			cell_id: profile.cell_id,
			components: [
				{
					name: "background",
					share: 1,
					spawns: [
						{ pokemon_id: 25, form: 2, weight: 0.1 },
						{ pokemon_id: 1, form: 0, weight: 0.1 },
						{ pokemon_id: 25, form: 0, weight: 0.1 },
						{ pokemon_id: 4, form: 0, weight: 0.5 },
						{ pokemon_id: 133, form: 0, weight: 0 }
					]
				}
			]
		};
		expect(
			getBiomePoolSpawns(unsortedPools, 0).map((spawn) => [spawn.pokemon_id, spawn.form])
		).toEqual([
			[4, 0],
			[1, 0],
			[25, 0],
			[25, 2]
		]);
	});
});
