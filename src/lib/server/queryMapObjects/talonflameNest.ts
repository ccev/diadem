import type { Bounds } from "@/lib/mapObjects/mapBounds";
import type { MinMapObject } from "@/lib/mapObjects/mapObjectTypes";
import type { PermittedPolygon } from "@/lib/services/user/checkPerm";
import type { NestData } from "@/lib/types/mapObjectData/nest";
import {
	area,
	bbox,
	bboxPolygon,
	booleanIntersects,
	booleanPointInPolygon,
	feature,
	featureCollection,
	intersect,
	point,
	pointOnFeature,
	polygon,
	union
} from "@turf/turf";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import { s2 } from "s2js";

export type TalonflameGroup = Pick<
	NestData,
	"id" | "name" | "area_name" | "pokemon_id" | "form"
> & {
	last_changed: number | null;
};
export type TalonflameMember = { nest_id: string; spawnpoint_id: string };
export type TalonflameSource = {
	id: string;
	group_id: string;
	pokemon_id: number;
	form: number | null;
	geometry: Polygon | MultiPolygon | string;
};
type Region = Feature<Polygon | MultiPolygon>;
type Member = { id: string; position: Position };
type Population = { key: string; groups: string[]; members: Member[] };

// Intersect the original (possibly concave, holed or multipart) OSM geometry
// with a half-plane. Only the cut is new; all other edges remain OSM edges.
function cutRegion(region: Region, origin: Position, normal: Position, cut: number, left: boolean) {
	const [west, south, east, north] = bbox(region);
	const margin = Math.max(east - west, north - south, 0.000001);
	const corners = [
		[west - margin, south - margin],
		[east + margin, south - margin],
		[east + margin, north + margin],
		[west - margin, north + margin]
	];
	const distance = (p: Position) =>
		((p[0] - origin[0]) * normal[0] + (p[1] - origin[1]) * normal[1] - cut) * (left ? 1 : -1);
	const ring: Position[] = [];
	for (let i = 0; i < corners.length; i++) {
		const a = corners[i],
			b = corners[(i + 1) % corners.length];
		const da = distance(a),
			db = distance(b);
		if (da <= 0) ring.push(a);
		if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
			const t = da / (da - db);
			ring.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
		}
	}
	if (ring.length < 3) return null;
	ring.push(ring[0]);
	return intersect(featureCollection([region, polygon([ring])]));
}

function splitRegions(region: Region, populations: Population[]): Map<string, Region> {
	if (populations.length === 1) return new Map([[populations[0].key, region]]);
	const centers = populations.map((population) => {
		const positions = population.members.map((member) => member.position);
		return positions.reduce(
			(sum, p) => [sum[0] + p[0] / positions.length, sum[1] + p[1] / positions.length],
			[0, 0]
		);
	});
	const longitudeScale = Math.max(0.000001, Math.cos((centers[0][1] * Math.PI) / 180));
	let normal = [1, 0],
		furthest = 0;
	for (let i = 0; i < centers.length; i++) {
		for (let j = i + 1; j < centers.length; j++) {
			const dx = (centers[j][0] - centers[i][0]) * longitudeScale;
			const dy = centers[j][1] - centers[i][1];
			if (dx * dx + dy * dy > furthest) {
				furthest = dx * dx + dy * dy;
				normal = [dx * longitudeScale, dy];
			}
		}
	}
	const origin = centers[0];
	const project = (p: Position) => (p[0] - origin[0]) * normal[0] + (p[1] - origin[1]) * normal[1];
	const ordered = populations
		.map((population, i) => ({ population, value: project(centers[i]) }))
		.sort((a, b) => a.value - b.value || a.population.key.localeCompare(b.population.key));
	let gap = 0;
	for (let i = 1; i < ordered.length - 1; i++) {
		if (ordered[i + 1].value - ordered[i].value > ordered[gap + 1].value - ordered[gap].value)
			gap = i;
	}
	const midpoint = (ordered[gap].value + ordered[gap + 1].value) / 2;
	const leftKeys = new Set(ordered.slice(0, gap + 1).map(({ population }) => population.key));
	const votes = populations
		.flatMap((population) =>
			population.members.map((member) => ({
				value: project(member.position),
				left: leftKeys.has(population.key),
				weight: 1 / population.members.length
			}))
		)
		.sort((a, b) => a.value - b.value);
	// Balance species rather than letting a large population push a small
	// subnest out of the park. Fit one straight cut to the assigned points.
	let cut = midpoint;
	let bestError = votes.reduce(
		(sum, vote) => sum + (vote.value <= cut !== vote.left ? vote.weight : 0),
		0
	);
	let error = leftKeys.size;
	for (let i = 0; i < votes.length - 1; i++) {
		error += votes[i].left ? -votes[i].weight : votes[i].weight;
		const candidate = (votes[i].value + votes[i + 1].value) / 2;
		if (candidate <= ordered[gap].value || candidate >= ordered[gap + 1].value) continue;
		if (
			error < bestError - 1e-10 ||
			(Math.abs(error - bestError) <= 1e-10 &&
				Math.abs(candidate - midpoint) < Math.abs(cut - midpoint))
		) {
			cut = candidate;
			bestError = error;
		}
	}
	const left = cutRegion(region, origin, normal, cut, true);
	const right = cutRegion(region, origin, normal, cut, false);
	if (!left || !right) {
		// A population can lie entirely outside this piece of a multipart park.
		// Keep the piece whole for the population with the most members in it.
		const owner = populations.toSorted(
			(a, b) =>
				b.members.filter((m) => booleanPointInPolygon(point(m.position), region)).length -
				a.members.filter((m) => booleanPointInPolygon(point(m.position), region)).length
		)[0];
		return new Map([[owner.key, region]]);
	}
	return new Map([
		...splitRegions(
			left,
			ordered.slice(0, gap + 1).map(({ population }) => population)
		),
		...splitRegions(
			right,
			ordered.slice(gap + 1).map(({ population }) => population)
		)
	]);
}

export function buildTalonflameNests(
	groups: TalonflameGroup[],
	members: TalonflameMember[],
	sources: TalonflameSource[],
	bounds?: Bounds,
	permission?: PermittedPolygon
): MinMapObject<NestData>[] {
	const points = new Map<string, Member[]>();
	for (const member of members) {
		if (!/^\d+$/.test(member.spawnpoint_id)) continue;
		const id = BigInt(member.spawnpoint_id) << 20n;
		if (id >= 1n << 64n || !s2.cellid.valid(id) || s2.cellid.level(id) !== 20) continue;
		const center = s2.LatLng.fromPoint(s2.Cell.fromCellID(id).center());
		const entry = {
			id: member.spawnpoint_id,
			position: [(center.lng * 180) / Math.PI, (center.lat * 180) / Math.PI]
		};
		const groupPoints = points.get(member.nest_id) ?? [];
		groupPoints.push(entry);
		points.set(member.nest_id, groupPoints);
	}
	const parks = new Map<string, { region: Region; populations: Map<string, Population> }>();
	for (const source of sources) {
		let park = parks.get(source.id);
		if (!park) {
			const geometry =
				typeof source.geometry === "string" ? JSON.parse(source.geometry) : source.geometry;
			park = { region: feature(geometry), populations: new Map() };
			parks.set(source.id, park);
		}
		const key = `${source.pokemon_id}/${source.form ?? 0}`;
		const population = park.populations.get(key) ?? { key, groups: [], members: [] };
		if (population.groups.includes(source.group_id)) continue;
		population.groups.push(source.group_id);
		population.members.push(
			...(points.get(source.group_id) ?? []).filter((member) =>
				booleanPointInPolygon(point(member.position), park.region)
			)
		);
		park.populations.set(key, population);
	}

	const pieces = new Map<string, Region[]>();
	const regionMembers = new Map<string, Member[]>();
	const requested = new Set(groups.map((group) => group.id));
	for (const [sourceId, park] of parks) {
		const populations = [...park.populations.values()].filter(
			(population) => park.populations.size === 1 || population.members.length
		);
		if (!populations.length) continue;
		const regions = splitRegions(park.region, populations);
		for (const population of populations) {
			const region = regions.get(population.key);
			// Same-species groups don't create cosmetic cuts or duplicate overlays.
			const owners = population.groups
				.filter((id) => requested.has(id))
				.sort((a, b) =>
					a === b ? 0 : a === sourceId ? -1 : b === sourceId ? 1 : BigInt(a) < BigInt(b) ? -1 : 1
				);
			if (!region || !owners.length) continue;
			const owner = owners[0];
			const fragments = pieces.get(owner) ?? [];
			fragments.push(region);
			pieces.set(owner, fragments);
			regionMembers.set(owner, [...(regionMembers.get(owner) ?? []), ...population.members]);
		}
	}

	const viewport = bounds
		? bounds.minLon <= bounds.maxLon
			? bboxPolygon([bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat])
			: feature({
					type: "MultiPolygon",
					coordinates: [
						bboxPolygon([bounds.minLon, bounds.minLat, 180, bounds.maxLat]).geometry.coordinates,
						bboxPolygon([-180, bounds.minLat, bounds.maxLon, bounds.maxLat]).geometry.coordinates
					]
				})
		: undefined;
	const result: MinMapObject<NestData>[] = [];
	for (const group of groups) {
		const fragments = pieces.get(group.id);
		if (!fragments?.length) continue;
		let region = fragments.length === 1 ? fragments[0] : union(featureCollection(fragments));
		if (region && permission) region = intersect(featureCollection([region, permission]));
		if (!region || (viewport && !booleanIntersects(region, viewport))) continue;
		const assigned = [
			...new Map((regionMembers.get(group.id) ?? []).map((member) => [member.id, member])).values()
		].filter((member) => booleanPointInPolygon(point(member.position), region));
		const center = pointOnFeature(region).geometry.coordinates;
		const anchor = assigned.length
			? assigned.reduce((best, member) =>
					(member.position[0] - center[0]) ** 2 + (member.position[1] - center[1]) ** 2 <
					(best.position[0] - center[0]) ** 2 + (best.position[1] - center[1]) ** 2
						? member
						: best
				).position
			: center;
		const coordinates =
			region.geometry.type === "Polygon"
				? [region.geometry.coordinates]
				: region.geometry.coordinates;
		result.push({
			...group,
			lat: anchor[1],
			lon: anchor[0],
			polygon: coordinates.map((rings) => rings.map((ring) => ring.map(([x, y]) => ({ x, y })))),
			spawnpoints: assigned.length,
			m2: area(region),
			active: 1,
			pokemon_avg: null,
			pokemon_ratio: null,
			pokemon_count: null,
			discarded: null,
			updated: null
		});
	}
	return result;
}
