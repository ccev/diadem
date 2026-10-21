import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as constants from "@/lib/constants";
import { Coords } from "./coordinates";
import {
	isWithinRange,
	rangeBounds,
	rangeCircle,
	rangeDestination,
	rangeDistanceMeters
} from "./rangeGeometry";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
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

	it("keeps main-map Pokemon normal/extended and fort ranges and selected styling", () => {
		let extraRadius = false;
		const getActionRadiusFeature = producer(
			"lib/map/featuresGen.svelte.ts",
			"getActionRadiusFeature",
			{
				...constants,
				MapObjectType,
				rangeCircle,
				getUserSettings: () => ({
					actions: Object.fromEntries(
						Object.values(MapObjectType).map((type) => [
							type,
							{ radius: { all: true, mapIds: [], extraRadius } }
						])
					)
				}),
				getPolygonFeature: (_id: string, coordinates: number[][][][], properties: unknown) => ({
					geometry: { type: "MultiPolygon", coordinates },
					properties
				}),
				RADIUS_STROKE: "stroke",
				RADIUS_FILL: "fill",
				RADIUS_FILL_SELECTED: "selected"
			}
		);
		for (const type of [
			MapObjectType.POKEMON,
			MapObjectType.GYM,
			MapObjectType.POKESTOP,
			MapObjectType.STATION
		]) {
			for (extraRadius of [false, true]) {
				const feature = getActionRadiusFeature(type, "test", center);
				assertCircle(
					{
						...feature,
						geometry: { type: "Polygon", coordinates: feature.geometry.coordinates[0] }
					},
					center,
					type === MapObjectType.POKEMON && !extraRadius ? 40 : 80,
					96
				);
				expect(feature.properties).toMatchObject({
					isActionRadius: true,
					strokeColor: "stroke",
					fillColor: "fill",
					selectedFill: "selected"
				});
			}
		}
		expect(getActionRadiusFeature(MapObjectType.NEST, "test", center)).toBeUndefined();
		expect(getActionRadiusFeature(MapObjectType.SPAWNPOINT, "test", center)).toBeUndefined();
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
