import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import * as constants from "@/lib/constants";
import {
	FeatureTypes,
	getIconFeature,
	getPolygonFeature,
	isFeatureCircle,
	isFeatureIcon,
	isFeaturePolygon,
	type MapObjectFeature,
	type MapObjectPolygonFeature
} from "@/lib/map/render/featureTypes";
import { Coords } from "./coordinates";
import {
	isWithinRange,
	rangeBounds,
	rangeCircle,
	rangeDestination,
	rangeDistanceMeters
} from "./rangeGeometry";
import { ClientMapObjectType, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { Feature, Polygon } from "geojson";

const sourceRoot = path.resolve(import.meta.dirname, "../..");

/**
 * Execute the actual pure geometry producers without booting map/auth state.
 * Vitest's node config does not compile Svelte runes/components, so extract the
 * named TS declaration and supply its boundary dependencies. No copied producer.
 */
function producer(file: string, name: string, dependencies: Record<string, unknown>) {
	const contents = readFileSync(path.join(sourceRoot, file), "utf8");
	const script = file.endsWith(".svelte")
		? contents.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]
		: contents;
	const ast = ts.createSourceFile(file + ".ts", script, ts.ScriptTarget.Latest, true);
	let expression: string | undefined;
	for (const statement of ast.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
			expression = statement.getText(ast).replace(/^export\s+/, "");
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (declaration.name.getText(ast) === name)
					expression = declaration.initializer?.getText(ast);
			}
		}
	}
	if (!expression) throw new Error(`Missing producer ${file}:${name}`);
	const compiled = ts.transpileModule(`return (${expression});`, {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
	}).outputText;
	return new Function(...Object.keys(dependencies), compiled)(...Object.values(dependencies));
}

function assertCircle(
	feature: Feature<Polygon>,
	center: [number, number],
	radius: number,
	steps: number
) {
	expect(feature.geometry.type).toBe("Polygon");
	expect(feature.geometry.coordinates[0]).toHaveLength(steps + 1);
	for (const vertex of feature.geometry.coordinates[0].slice(0, steps)) {
		expect(rangeDistanceMeters(center, vertex as [number, number])).toBeCloseTo(radius, 5);
	}
}

const center: [number, number] = [179.9999, 60];

describe("geographic range callers", () => {
	it("keeps selected/tracked location rings at 80 m and 40 m with their colors", () => {
		const data = producer("components/map/LocationMapOverlay.svelte", "radiusData", {
			center: { lon: center[0], lat: center[1] },
			$derived: { by: (callback: () => unknown) => callback() },
			featureCollection: (features: unknown[]) => ({ features }),
			rangeCircle,
			...constants
		});
		assertCircle(data.features[0], center, 80, 64);
		assertCircle(data.features[1], center, 40, 64);
		expect(data.features.map((feature: Feature) => feature.properties?.fillColor)).toEqual([
			"#3b82f6",
			"#a855f7"
		]);
	});

	it.each([40, 80])(
		"keeps popup access radius %i in meters and marker radius in pixels",
		(radius) => {
			const makeAccessData = producer(
				"components/ui/popups/common/MainAccessMap.svelte",
				"makeAccessData",
				{
					lon: center[0],
					lat: center[1],
					radius,
					marker: "circle",
					markerRadius: 5,
					markerStrokeColor: "stroke",
					markerFillColor: "fill",
					ACCESS_MAP_ID: "access",
					getCircleFeature: (_id: string, coordinates: number[], properties: unknown) => ({
						geometry: { type: "Point", coordinates },
						properties
					}),
					isFeatureIcon: () => false,
					rangeCircle
				}
			);
			const data = makeAccessData({});
			assertCircle(data.features.features[0], center, radius, 96);
			expect(data.features.features[1].properties.radius).toBe(5);
			expect(data.features.features[1].geometry.type).toBe("Point");
		}
	);

	describe("main-map interaction ranges", () => {
		const action = { all: true, mapIds: [] as string[], extraRadius: false };
		const getActionRadiusFeatures = producer(
			"lib/map/featuresGen.svelte.ts",
			"getActionRadiusFeatures",
			{
				...constants,
				MapObjectType,
				rangeCircle,
				getUserSettings: () => ({
					actions: Object.fromEntries(
						Object.values(MapObjectType).map((type) => [type, { radius: action }])
					)
				}),
				getPolygonFeature,
				RADIUS_STROKE: "stroke",
				RADIUS_FILL: "fill",
				RADIUS_FILL_SELECTED: "selected"
			}
		) as (
			type: MapObjectType,
			mapId: string,
			center: [number, number],
			isSelected?: boolean
		) => MapObjectPolygonFeature[];

		beforeEach(() => {
			Object.assign(action, { all: true, mapIds: [], extraRadius: false });
		});

		it.each([false, true])("draws borderless blue Pokemon circles (extended: %s)", (extended) => {
			action.extraRadius = extended;
			const features = getActionRadiusFeatures(MapObjectType.POKEMON, "test", center);
			const radii = extended ? [80, 40] : [40];
			expect(features).toHaveLength(radii.length);
			expect(new Set(features.map((feature) => feature.id)).size).toBe(features.length);
			features.forEach((feature, index) => {
				assertCircle(
					{
						...feature,
						geometry: { type: "Polygon", coordinates: feature.geometry.coordinates[0] }
					},
					center,
					radii[index],
					96
				);
				const fillColor =
					radii[index] === 40 ? "rgba(59, 130, 246, 0.2)" : "rgba(96, 165, 250, 0.2)";
				expect(feature.properties).toMatchObject({
					id: "test",
					isActionRadius: true,
					strokeColor: "transparent",
					fillColor,
					selectedFill: fillColor,
					isSelected: false
				});
			});
			expect(
				getActionRadiusFeatures(MapObjectType.POKEMON, "test", center, true).every(
					(feature) => feature.properties.isSelected
				)
			).toBe(true);
		});

		it.each([MapObjectType.GYM, MapObjectType.POKESTOP, MapObjectType.STATION])(
			"keeps the single 80 m fort range and selected styling for %s",
			(type) => {
				action.extraRadius = true;
				const features = getActionRadiusFeatures(type, "test", center, true);
				expect(features).toHaveLength(1);
				const [feature] = features;
				assertCircle(
					{
						...feature,
						geometry: { type: "Polygon", coordinates: feature.geometry.coordinates[0] }
					},
					center,
					80,
					96
				);
				expect(feature.properties).toMatchObject({
					isActionRadius: true,
					strokeColor: "stroke",
					fillColor: "fill",
					selectedFill: "selected",
					isSelected: true
				});
			}
		);

		it("respects per-Pokemon and global visibility overrides for both rings", () => {
			action.extraRadius = true;
			action.all = false;
			expect(getActionRadiusFeatures(MapObjectType.POKEMON, "test", center)).toEqual([]);
			action.mapIds = ["test"];
			expect(getActionRadiusFeatures(MapObjectType.POKEMON, "test", center)).toHaveLength(2);
			action.all = true;
			expect(getActionRadiusFeatures(MapObjectType.POKEMON, "test", center)).toEqual([]);
			action.mapIds = [];
			expect(getActionRadiusFeatures(MapObjectType.POKEMON, "test", center)).toHaveLength(2);
		});

		it.each([MapObjectType.NEST, MapObjectType.SPAWNPOINT])(
			"does not add interaction ranges to %s",
			(type) => {
				expect(getActionRadiusFeatures(type, "test", center)).toEqual([]);
			}
		);

		it("replaces both rings cleanly on toggles and keeps selection in sync", () => {
			const marker = getIconFeature("test", center, {
				id: "test",
				imageUrl: "test",
				imageSize: 1,
				selectedScale: 1,
				expires: null
			});
			const entry = {
				lon: center[0],
				lat: center[1],
				features: [marker] as MapObjectFeature[]
			};
			const features = { [MapObjectType.POKEMON]: { test: entry } };
			let selection: { type: MapObjectType; mapId: string } | null = {
				type: MapObjectType.POKEMON,
				mapId: "test"
			};
			const updateSelected = producer("lib/map/featuresGen.svelte.ts", "updateSelected", {
				...constants,
				features,
				selectedFeatures: [],
				ClientMapObjectType,
				isFeatureIcon,
				isFeatureCircle,
				isFeaturePolygon,
				syncRouteLineFeatures: () => {},
				updateMapObjectsGeoJson: () => {},
				getFlattenedFeatures: () => entry.features
			});
			const updateRadiusFeatures = producer(
				"lib/map/featuresGen.svelte.ts",
				"updateRadiusFeatures",
				{
					features,
					allMapObjectTypes: [MapObjectType.POKEMON],
					isFeaturePolygon,
					getActionRadiusFeatures,
					updateSelected,
					getCurrentSelectedData: () => selection
				}
			);
			for (const extended of [false, true, true, false]) {
				action.extraRadius = extended;
				updateRadiusFeatures();
				const radii = entry.features.filter(isFeaturePolygon);
				expect(radii).toHaveLength(extended ? 2 : 1);
				expect(radii.every((feature) => feature.properties.isSelected)).toBe(true);
				expect(entry.features.at(-1)).toBe(marker);
			}
			selection = null;
			action.extraRadius = true;
			updateRadiusFeatures();
			expect(
				entry.features.filter(isFeaturePolygon).every((feature) => !feature.properties.isSelected)
			).toBe(true);
			expect(marker.properties.selectedScale).toBe(1);
			action.all = false;
			updateRadiusFeatures();
			expect(entry.features).toEqual([marker]);
		});
	});

	it("renders action radii separately from other polygons without doubling the fill", () => {
		const source = readFileSync(path.join(sourceRoot, "components/map/MapMain.svelte"), "utf8");
		const layers = [
			...source.matchAll(
				/<(?:FillLayer|LineLayer)\s+id=\{MapObjectLayerId\.(RADIUS_FILL|RADIUS_STROKE|POLYGON_FILL|POLYGON_STROKE)\}[\s\S]*?filter=\{(\[[\s\S]*?\])\}/g
			)
		];
		expect(layers).toHaveLength(4);
		for (const [, id, expression] of layers) {
			const filter = new Function("FeatureTypes", `return (${expression});`)(FeatureTypes);
			if (id.startsWith("RADIUS")) {
				expect(filter).toEqual(["==", ["get", "isActionRadius"], true]);
			} else {
				expect(filter).toEqual([
					"all",
					["==", ["get", "type"], FeatureTypes.POLYGON],
					["!=", ["get", "isActionRadius"], true]
				]);
			}
		}
	});

	it.each([0, 1, 2])("keeps scout size %i coverage, radius units and spherical spacing", (size) => {
		const dependencies = { ...constants, rangeCircle, rangeDestination, Coords };
		const getCoords = producer("lib/features/scout.svelte.ts", "getCoords", dependencies);
		const getScoutGeojsons = producer(
			"lib/features/scout.svelte.ts",
			"getScoutGeojsons",
			dependencies
		);
		const coords: Coords[] = getCoords(Coords.infer(center), size);
		expect(coords).toHaveLength(size === 0 ? 1 : 7);
		const [small, big] = getScoutGeojsons(coords, size);
		expect(small).toHaveLength(coords.length);
		expect(big).toHaveLength(size === 1 ? 1 : coords.length);
		coords.forEach((coord, i) => {
			assertCircle(small[i], coord.geojson(), 70, 64);
			if (big[i]) assertCircle(big[i], coord.geojson(), 1000, 64);
			if (i > 0)
				expect(rangeDistanceMeters(center, coord.geojson())).toBeCloseTo(
					(size === 1 ? 70 : 1000) * 1.732,
					5
				);
		});
		expect(small[0].properties).toEqual({ fillColor: "#DAB2FFFF", strokeColor: "#DAB2FFFF" });
		expect(big[0].properties).toEqual({ fillColor: "#DFF2FEFF", strokeColor: "#DFF2FEFF" });
	});

	it("location details use the same 40/80 m cutoffs and query wrapped candidates", async () => {
		const data = { lat: center[1], lon: center[0] };
		const queries: ReturnType<typeof rangeBounds>[] = [];
		const loadLocationDetails = producer("lib/features/location.svelte.ts", "loadLocationDetails", {
			...constants,
			MapObjectType,
			Coords,
			isWithinRange,
			rangeBounds,
			rangeDistanceMeters,
			detailsController: undefined,
			detailsKey: undefined,
			abortLocationDetails: () => {},
			isSupportedFeature: () => false,
			getUserDetails: () => ({ permissions: {} }),
			isPointInAllowedArea: () => true,
			getDefaultPokestopFilter: () => ({ pokestopPlain: {} }),
			getDefaultGymFilter: () => ({ raid: {} }),
			getDefaultStationFilter: () => ({ stationPlain: {} }),
			getSelectedLocation: () => data,
			currentTimestamp: () => 100000,
			fetchMapObjects: async (type: MapObjectType, bounds: ReturnType<typeof rangeBounds>) => {
				queries.push(bounds);
				const radius = type === MapObjectType.SPAWNPOINT ? 40 : 80;
				return {
					data: [radius - 0.001, radius + 0.001].map((distance) => {
						const [lon, lat] = rangeDestination(center, distance, 90);
						return { type, lon, lat, last_seen: 100000 };
					})
				};
			}
		});
		await loadLocationDetails(data);
		expect(data).toMatchObject({ spawnpoints: 1, isNearbyLoading: false });
		const nearby = (data as unknown as { nearby: { distance: number }[] }).nearby;
		expect(nearby).toHaveLength(3);
		for (const object of nearby) expect(object.distance).toBeCloseTo(79.999, 5);
		expect(queries).toHaveLength(4);
		for (const bounds of queries) expect(bounds).toMatchObject({ minLon: -180, maxLon: 180 });
	});

	it("spawnpoint thumbnails keep the static-map API's circle instead of a range polygon", async () => {
		let payload:
			| {
					circles: {
						radius: number;
						latitude: number;
						longitude: number;
						fill_color: string;
						stroke_color: string;
						stroke_width: number;
					}[];
					polygons?: unknown;
			  }
			| undefined;
		const fetchStaticMapBase64 = producer(
			"lib/server/thumbnails/thumbnailUtils.ts",
			"fetchStaticMapBase64",
			{
				MapObjectType,
				getServerConfig: () => ({
					staticMap: { enabled: true, url: "https://tiles.example", style: "test" }
				}),
				getDefaultIconSet: () => ({ id: "test" }),
				getConfig: () => ({ uiconSets: [] }),
				fetchWrapper: (response: unknown) => response
			}
		);
		await fetchStaticMapBase64(
			async (_url: string, options: { body: string }) => {
				payload = JSON.parse(options.body);
			},
			{
				zoom: 16,
				width: 256,
				height: 256,
				coords: Coords.infer(center),
				data: { type: MapObjectType.SPAWNPOINT }
			}
		);
		expect(payload?.polygons).toBeUndefined();
		expect(payload?.circles).toEqual([
			{
				fill_color: "rgba(116,223,253,0.6)",
				stroke_color: "rgba(57,140,168,0.8)",
				stroke_width: 1,
				radius: 35,
				latitude: center[1],
				longitude: center[0]
			}
		]);
	});

	it("audits every circle producer and prevents fallback to Turf circle/destination geometry", () => {
		const callers: string[] = [];
		function audit(directory: string) {
			for (const entry of readdirSync(directory, { withFileTypes: true })) {
				const file = path.join(directory, entry.name);
				if (entry.isDirectory()) {
					if (entry.name !== "paraglide") audit(file);
					continue;
				}
				if (!/\.(ts|svelte)$/.test(file) || file.endsWith(".test.ts")) continue;
				const source = readFileSync(file, "utf8");
				const imports = source.matchAll(/import\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g);
				for (const match of imports) {
					if (match[1].startsWith("@turf/"))
						expect(match[0], file).not.toMatch(
							/\b(circle|destination)\b|import\s+\*|import\s+\w+\s+from\s+["']@turf\/(circle|destination)/
						);
				}
				if (/import\s+\{[^}]*\brangeCircle\b[^}]*\}\s+from/.test(source))
					callers.push(path.relative(sourceRoot, file));
			}
		}
		audit(sourceRoot);
		expect(callers.sort()).toEqual([
			"components/map/LocationMapOverlay.svelte",
			"components/ui/popups/common/MainAccessMap.svelte",
			"lib/features/scout.svelte.ts",
			"lib/map/featuresGen.svelte.ts"
		]);
	});
});
